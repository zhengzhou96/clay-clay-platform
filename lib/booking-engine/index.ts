/**
 * Clay Clay Booking Engine Core
 * Handles session availability, seat holds, atomic booking creation,
 * and concurrency protection.
 */

import {
  BookingStatus,
  PaymentStatus,
  Customer,
  Session,
  Booking,
  BookingHold,
  Payment,
  AvailabilityQuery,
  AvailabilityResult,
  HoldResult,
  BookingResult,
  PaymentResult,
  WebhookPayload,
  BookingError,
  BookingErrorCode,
} from '../../types';

// ============================================================================
// DATABASE CLIENT INTERFACE
// ============================================================================

export interface DatabaseClient {
  // Query execution
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
  
  // Transaction support
  transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

export interface TransactionClient extends DatabaseClient {
  // Transaction-specific methods if needed
}

// ============================================================================
// BOOKING ENGINE CLASS
// ============================================================================

export class BookingEngine {
  private readonly HOLD_DURATION_MINUTES = 15;

  constructor(private db: DatabaseClient) {}

  // ============================================================================
  // SESSION AVAILABILITY
  // ============================================================================

  /**
   * Get available sessions for a date range
   */
  async getAvailableSessions(
    query: AvailabilityQuery
  ): Promise<AvailabilityResult[]> {
    const { workshopTypeId, date, startDate, endDate } = query;

    // Build date range
    let dateFilter = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (date) {
      dateFilter = `AND s.start_time_tz >= $${paramIndex}::date 
                    AND s.start_time_tz < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(date);
      paramIndex++;
    } else if (startDate && endDate) {
      dateFilter = `AND s.start_time_tz >= $${paramIndex}::timestamptz 
                    AND s.start_time_tz <= $${paramIndex + 1}::timestamptz`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const workshopTypeFilter = workshopTypeId
      ? `AND s.workshop_type_id = $${paramIndex}::uuid`
      : '';
    if (workshopTypeId) {
      params.push(workshopTypeId);
    }

    const sql = `
      SELECT 
        s.id AS session_id,
        s.start_time_tz,
        s.end_time_tz,
        s.capacity,
        get_available_seats(s.id) AS available_seats,
        CASE WHEN get_available_seats(s.id) > 0 THEN true ELSE false END AS is_available
      FROM sessions s
      WHERE s.is_active = true
        AND s.start_time_tz >= NOW()
        ${dateFilter}
        ${workshopTypeFilter}
      ORDER BY s.start_time_tz ASC
    `;

    const results = await this.db.query<AvailabilityResult>(sql, params);
    return results;
  }

  /**
   * Get available seats for a specific session
   */
  async getAvailableSeats(sessionId: string): Promise<number> {
    const result = await this.db.queryOne<{ available_seats: number }>(
      'SELECT get_available_seats($1::uuid) AS available_seats',
      [sessionId]
    );
    return result?.available_seats ?? 0;
  }

  /**
   * Check if requested seats are available
   */
  async checkAvailability(
    sessionId: string,
    seats: number,
    holdId?: string
  ): Promise<boolean> {
    const params: unknown[] = [sessionId, seats];
    const holdParam = holdId ? `, $3::uuid` : '';
    
    const result = await this.db.queryOne<{ available: boolean }>(
      `SELECT check_seat_availability($1::uuid, $2::integer${holdParam}) AS available`,
      params
    );
    return result?.available ?? false;
  }

  // ============================================================================
  // SEAT HOLDS
  // ============================================================================

  /**
   * Create a temporary hold on seats
   */
  async createHold(
    sessionId: string,
    customerId: string,
    seats: number,
    options: { durationMinutes?: number } = {}
  ): Promise<HoldResult> {
    const duration = options.durationMinutes ?? this.HOLD_DURATION_MINUTES;

    // Verify session exists and is active
    const session = await this.db.queryOne<Session>(
      'SELECT * FROM sessions WHERE id = $1::uuid AND is_active = true',
      [sessionId]
    );

    if (!session) {
      throw new BookingError(
        'Session not found or inactive',
        BookingErrorCode.SESSION_NOT_FOUND
      );
    }

    // Verify customer exists
    const customer = await this.db.queryOne<Customer>(
      'SELECT * FROM customers WHERE id = $1::uuid',
      [customerId]
    );

    if (!customer) {
      throw new BookingError(
        'Customer not found',
        BookingErrorCode.CUSTOMER_NOT_FOUND
      );
    }

    // Check availability before creating hold
    const available = await this.getAvailableSeats(sessionId);
    if (available < seats) {
      throw new BookingError(
        `Not enough available seats. Available: ${available}, Requested: ${seats}`,
        BookingErrorCode.SESSION_FULL
      );
    }

    // Create the hold using the database function
    const result = await this.db.queryOne<{ hold_id: string }>(
      `SELECT create_seat_hold($1::uuid, $2::uuid, $3::integer, $4::integer) AS hold_id`,
      [sessionId, customerId, seats, duration]
    );

    if (!result?.hold_id) {
      throw new BookingError(
        'Failed to create hold',
        BookingErrorCode.HOLD_NOT_FOUND
      );
    }

    // Get hold details
    const hold = await this.db.queryOne<BookingHold>(
      'SELECT * FROM booking_holds WHERE id = $1::uuid',
      [result.hold_id]
    );

    if (!hold) {
      throw new BookingError(
        'Hold created but not found',
        BookingErrorCode.HOLD_NOT_FOUND
      );
    }

    const expiresAt = new Date(hold.expires_at);
    const now = new Date();
    const expiresInSeconds = Math.floor(
      (expiresAt.getTime() - now.getTime()) / 1000
    );

    return {
      hold_id: hold.id,
      session_id: hold.session_id,
      seats: hold.seats,
      expires_at: hold.expires_at,
      expires_in_seconds: Math.max(0, expiresInSeconds),
    };
  }

  /**
   * Get hold details
   */
  async getHold(holdId: string): Promise<BookingHold | null> {
    return await this.db.queryOne<BookingHold>(
      'SELECT * FROM booking_holds WHERE id = $1::uuid',
      [holdId]
    );
  }

  /**
   * Release a hold (manual cancellation)
   */
  async releaseHold(holdId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ released: boolean }>(
      'SELECT release_hold($1::uuid) AS released',
      [holdId]
    );
    return result?.released ?? false;
  }

  /**
   * Clean up expired holds
   */
  async cleanupExpiredHolds(): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT cleanup_expired_holds() AS count'
    );
    return result?.count ?? 0;
  }

  // ============================================================================
  // BOOKING CREATION
  // ============================================================================

  /**
   * Create a booking atomically with concurrency protection
   */
  async createBooking(
    sessionId: string,
    customerId: string,
    participantCount: number,
    totalCents: number,
    options: { holdId?: string; notes?: string } = {}
  ): Promise<BookingResult> {
    const { holdId, notes } = options;

    // Validate participant count
    if (participantCount < 1) {
      throw new BookingError(
        'Participant count must be at least 1',
        BookingErrorCode.INVALID_PARTICIPANT_COUNT
      );
    }

    if (totalCents < 0) {
      throw new BookingError(
        'Total amount cannot be negative',
        BookingErrorCode.INVALID_PARTICIPANT_COUNT
      );
    }

    // Use the atomic booking function
    const result = await this.db.queryOne<{ booking_id: string }>(
      `SELECT create_booking_atomic(
        $1::uuid,
        $2::uuid,
        $3::integer,
        $4::integer,
        $5::uuid
      ) AS booking_id`,
      [sessionId, customerId, participantCount, totalCents, holdId ?? null]
    );

    if (!result?.booking_id) {
      throw new BookingError(
        'Failed to create booking',
        BookingErrorCode.BOOKING_NOT_FOUND
      );
    }

    // Fetch booking details
    const booking = await this.db.queryOne<Booking>(
      'SELECT * FROM bookings WHERE id = $1::uuid',
      [result.booking_id]
    );

    if (!booking) {
      throw new BookingError(
        'Booking created but not found',
        BookingErrorCode.BOOKING_NOT_FOUND
      );
    }

    // Update notes if provided
    if (notes) {
      await this.db.query(
        'UPDATE bookings SET notes = $1 WHERE id = $2',
        [notes, booking.id]
      );
    }

    return {
      booking_id: booking.id,
      reference: booking.reference ?? '',
      session_id: booking.session_id,
      customer_id: booking.customer_id,
      participant_count: booking.participant_count,
      total_cents: booking.total_cents,
      status: booking.status,
      payment_status: booking.payment_status,
    };
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    return await this.db.queryOne<Booking>(
      'SELECT * FROM bookings WHERE id = $1::uuid',
      [bookingId]
    );
  }

  /**
   * Transition booking status
   */
  async transitionBookingStatus(
    bookingId: string,
    newStatus: BookingStatus
  ): Promise<boolean> {
    try {
      const result = await this.db.queryOne<{ success: boolean }>(
        `SELECT transition_booking_status($1::uuid, $2::booking_status) AS success`,
        [bookingId, newStatus]
      );
      return result?.success ?? false;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid status transition')) {
        throw new BookingError(
          error.message,
          BookingErrorCode.INVALID_STATUS_TRANSITION
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT HANDLING
  // ============================================================================

  /**
   * Create payment record for a booking
   */
  async createPayment(
    bookingId: string,
    amountCents: number,
    options: {
      hitpayRequestId?: string;
      checkoutUrl?: string;
    } = {}
  ): Promise<PaymentResult> {
    const { hitpayRequestId, checkoutUrl } = options;

    // Verify booking exists
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new BookingError(
        'Booking not found',
        BookingErrorCode.BOOKING_NOT_FOUND
      );
    }

    // Create payment record
    const result = await this.db.queryOne<Payment>(`
      INSERT INTO payments (
        booking_id,
        hitpay_request_id,
        hitpay_checkout_url,
        amount_cents,
        currency,
        status
      ) VALUES ($1, $2, $3, $4, 'SGD', 'pending')
      RETURNING *
    `, [bookingId, hitpayRequestId ?? null, checkoutUrl ?? null, amountCents]);

    if (!result) {
      throw new BookingError(
        'Failed to create payment record',
        BookingErrorCode.PAYMENT_VERIFICATION_FAILED
      );
    }

    return {
      payment_id: result.id,
      booking_id: result.booking_id,
      amount_cents: result.amount_cents,
      status: result.status,
      checkout_url: result.hitpay_checkout_url ?? undefined,
    };
  }

  /**
   * Process webhook from HitPay
   */
  async processWebhook(payload: WebhookPayload): Promise<{
    success: boolean;
    bookingId?: string;
    message: string;
  }> {
    const { request_id, status } = payload;

    if (!request_id) {
      return {
        success: false,
        message: 'Missing request_id in webhook payload',
      };
    }

    return await this.db.transaction(async (tx) => {
      // Check for duplicate webhook
      const existingPayment = await tx.queryOne<Payment>(
        'SELECT * FROM payments WHERE hitpay_request_id = $1',
        [request_id]
      );

      if (existingPayment && existingPayment.webhook_payload) {
        // Already processed
        return {
          success: true,
          bookingId: existingPayment.booking_id,
          message: 'Webhook already processed (idempotent)',
        };
      }

      // Find payment by request_id or booking reference
      let payment: Payment | null = existingPayment;
      
      if (!payment) {
        payment = await tx.queryOne<Payment>(
          'SELECT * FROM payments WHERE hitpay_request_id = $1',
          [request_id]
        );
      }

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found for request_id',
        };
      }

      // Map HitPay status to internal status
      const statusMap: Record<string, PaymentStatus> = {
        completed: 'captured',
        paid: 'captured',
        authorized: 'authorized',
        failed: 'failed',
        cancelled: 'cancelled',
        refunded: 'refunded',
      };

      const newStatus = statusMap[status.toLowerCase()] ?? 'pending';

      // Update payment
      const updatedPayment = await tx.queryOne<Payment>(`
        UPDATE payments SET
          status = $1,
          webhook_payload = $2,
          verified_at = CASE WHEN $1 IN ('captured', 'authorized') THEN NOW() ELSE verified_at END,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [newStatus, JSON.stringify(payload), payment.id]);

      if (!updatedPayment) {
        return {
          success: false,
          message: 'Failed to update payment',
        };
      }

      // If payment captured, update booking status
      if (newStatus === 'captured') {
        await tx.query(
          'SELECT transition_booking_status($1::uuid, $2::booking_status)',
          [payment.booking_id, 'confirmed']
        );
        // Also update booking payment_status
        await tx.query(
          "UPDATE bookings SET payment_status = 'captured', updated_at = NOW() WHERE id = $1",
          [payment.booking_id]
        );
      } else if (newStatus === 'failed' || newStatus === 'cancelled') {
        // Optionally expire the booking after payment failure
        await tx.query(
          'SELECT transition_booking_status($1::uuid, $2::booking_status)',
          [payment.booking_id, 'expired']
        );
        await tx.query(
          "UPDATE bookings SET payment_status = $1, updated_at = NOW() WHERE id = $2",
          [newStatus, payment.booking_id]
        );
      }

      return {
        success: true,
        bookingId: payment.booking_id,
        message: `Payment ${newStatus} for booking ${payment.booking_id}`,
      };
    });
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  /**
   * Create or find customer by email
   */
  async upsertCustomer(
    email: string,
    name: string,
    phone?: string
  ): Promise<Customer> {
    // Try to find existing customer
    const existing = await this.db.queryOne<Customer>(
      'SELECT * FROM customers WHERE email = $1',
      [email]
    );

    if (existing) {
      // Update if name changed
      if (existing.name !== name || existing.phone !== phone) {
        const updated = await this.db.queryOne<Customer>(
          `UPDATE customers SET name = $2, phone = $3, updated_at = NOW()
           WHERE email = $1 RETURNING *`,
          [email, name, phone ?? null]
        );
        return updated!;
      }
      return existing;
    }

    // Create new customer
    const customer = await this.db.queryOne<Customer>(`
      INSERT INTO customers (email, name, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [email, name, phone ?? null]);

    if (!customer) {
      throw new Error('Failed to create customer');
    }

    return customer;
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Customer | null> {
    return await this.db.queryOne<Customer>(
      'SELECT * FROM customers WHERE id = $1::uuid',
      [customerId]
    );
  }

  /**
   * Get customer bookings
   */
  async getCustomerBookings(customerId: string): Promise<Booking[]> {
    return await this.db.query<Booking>(
      'SELECT * FROM bookings WHERE customer_id = $1::uuid ORDER BY created_at DESC',
      [customerId]
    );
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  /**
   * Get booking statistics for a date range
   */
  async getBookingStats(
    startDate: string,
    endDate: string
  ): Promise<{
    total_bookings: number;
    confirmed_bookings: number;
    total_revenue_cents: number;
    total_participants: number;
  }> {
    const result = await this.db.queryOne<{
      total_bookings: number;
      confirmed_bookings: number;
      total_revenue_cents: number;
      total_participants: number;
    }>(`
      SELECT 
        COUNT(*) FILTER (WHERE status != 'cancelled')::int AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_bookings,
        COALESCE(SUM(total_cents) FILTER (WHERE payment_status = 'captured'), 0)::int AS total_revenue_cents,
        COALESCE(SUM(participant_count) FILTER (WHERE status != 'cancelled'), 0)::int AS total_participants
      FROM bookings
      WHERE created_at >= $1::timestamptz
        AND created_at <= $2::timestamptz
    `, [startDate, endDate]);

    return result ?? {
      total_bookings: 0,
      confirmed_bookings: 0,
      total_revenue_cents: 0,
      total_participants: 0,
    };
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      // Get booking
      const booking = await tx.queryOne<Booking>(
        'SELECT * FROM bookings WHERE id = $1::uuid FOR UPDATE',
        [bookingId]
      );

      if (!booking) {
        throw new BookingError(
          'Booking not found',
          BookingErrorCode.BOOKING_NOT_FOUND
        );
      }

      if (booking.status === 'cancelled') {
        return false; // Already cancelled
      }

      // Cancel the booking
      await tx.query(
        'SELECT transition_booking_status($1::uuid, $2::booking_status)',
        [bookingId, 'cancelled']
      );

      // If payment was captured, process refund (would integrate with HitPay refund API)
      if (booking.payment_status === 'captured') {
        // TODO: Integrate HitPay refund API
        console.log(`Refund required for booking ${bookingId}`);
      }

      // Add cancellation note
      if (reason) {
        await tx.query(
          'UPDATE bookings SET notes = COALESCE(notes || E\'\\n\\n\', \'\') || $1 WHERE id = $2',
          [`Cancellation reason: ${reason}`, bookingId]
        );
      }

      return true;
    });
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createBookingEngine(db: DatabaseClient): BookingEngine {
  return new BookingEngine(db);
}

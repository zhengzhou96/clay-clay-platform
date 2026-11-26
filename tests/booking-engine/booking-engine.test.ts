/**
 * Clay Clay Booking Engine Tests
 * Tests for: concurrent bookings, holds, expiry, webhooks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BookingEngine, DatabaseClient, TransactionClient } from '../../lib/booking-engine';

// ============================================================================
// MOCK DATABASE CLIENT
// ============================================================================

class MockDatabaseClient implements DatabaseClient {
  private data: Record<string, any[]> = {
    sessions: [],
    customers: [],
    bookings: [],
    booking_holds: [],
    payments: [],
    workshop_types: [],
    rooms: [],
  };

  private advisoryLocks = new Set<string>();

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    // Handle INSERT INTO customers
    if (sql.includes('INSERT INTO customers')) {
      const email = params?.[0] as string;
      const name = params?.[1] as string;
      const phone = params?.[2] as string | null;
      
      const customer = {
        id: `customer-${Date.now()}-${Math.random()}`,
        name,
        email,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.customers.push(customer);
      return [customer] as T[];
    }

    // Handle UPDATE customers
    if (sql.includes('UPDATE customers SET') && sql.includes('WHERE email')) {
      const email = params?.[0] as string;
      const name = params?.[1] as string;
      const phone = params?.[2] as string | null;
      
      const idx = this.data.customers.findIndex(c => c.email === email);
      if (idx >= 0) {
        this.data.customers[idx].name = name;
        this.data.customers[idx].phone = phone;
        this.data.customers[idx].updated_at = new Date().toISOString();
        return [this.data.customers[idx]] as T[];
      }
      return [] as T[];
    }

    // Simulate different query types based on SQL
    if (sql.includes('get_available_seats')) {
      const sessionId = params?.[0] as string;
      const session = this.data.sessions.find(s => s.id === sessionId);
      if (!session) return [] as T[];
      
      const booked = this.data.bookings
        .filter(b => b.session_id === sessionId && ['confirmed', 'pending_payment'].includes(b.status))
        .reduce((sum, b) => sum + b.participant_count, 0);
      
      const held = this.data.booking_holds
        .filter(h => h.session_id === sessionId && 
                     new Date(h.expires_at) > new Date() && 
                     !h.claimed_booking_id)
        .reduce((sum, h) => sum + h.seats, 0);
      
      const available = Math.max(0, session.capacity - booked - held);
      return [{ available_seats: available }] as T[];
    }

    if (sql.includes('check_seat_availability')) {
      const sessionId = params?.[0] as string;
      const requestedSeats = params?.[1] as number;
      const available = (await this.query<{ available_seats: number }>(
        'SELECT get_available_seats($1)',
        [sessionId]
      ))[0]?.available_seats ?? 0;
      return [{ available: available >= requestedSeats }] as T[];
    }

    if (sql.includes('create_seat_hold')) {
      const sessionId = params?.[0] as string;
      const customerId = params?.[1] as string;
      const seats = params?.[2] as number;
      const duration = params?.[3] as number ?? 15;

      // Small delay to simulate real DB latency (allows concurrent detection)
      await new Promise(resolve => setTimeout(resolve, 5));

      const available = (await this.query<{ available_seats: number }>(
        'SELECT get_available_seats($1)',
        [sessionId]
      ))[0]?.available_seats ?? 0;

      if (available < seats) {
        throw new Error('Not enough available seats');
      }

      const hold = {
        id: `hold-${Date.now()}-${Math.random()}`,
        session_id: sessionId,
        customer_id: customerId,
        seats,
        expires_at: new Date(Date.now() + duration * 60 * 1000).toISOString(),
        claimed_booking_id: null,
        created_at: new Date().toISOString(),
      };

      this.data.booking_holds.push(hold);
      return [{ hold_id: hold.id }] as T[];
    }

    if (sql.includes('create_booking_atomic')) {
      const sessionId = params?.[0] as string;
      const customerId = params?.[1] as string;
      const participantCount = params?.[2] as number;
      const totalCents = params?.[3] as number;
      const holdId = params?.[4] as string | null;

      // Check advisory lock simulation - block if already locked
      const lockKey = `session_booking${sessionId}`;
      if (this.advisoryLocks.has(lockKey)) {
        // Simulate blocking by throwing a concurrency error
        throw new Error('could not obtain lock');
      }
      this.advisoryLocks.add(lockKey);

      try {
        // Small delay to simulate real DB latency
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // Verify hold if provided
        if (holdId) {
          const hold = this.data.booking_holds.find(h => h.id === holdId);
          if (!hold || new Date(hold.expires_at) <= new Date() || hold.claimed_booking_id) {
            throw new Error('Invalid or expired hold');
          }
          if (hold.seats !== participantCount) {
            throw new Error('Hold seats mismatch');
          }
        }

        // Check availability
        const available = (await this.query<{ available_seats: number }>(
          'SELECT get_available_seats($1)',
          [sessionId]
        ))[0]?.available_seats ?? 0;

        if (holdId) {
          // Hold seats already counted
          if (available < 0) {
            throw new Error('Session full');
          }
        } else {
          if (available < participantCount) {
            throw new Error('Not enough seats');
          }
        }

        const booking = {
          id: `booking-${Date.now()}-${Math.random()}`,
          session_id: sessionId,
          customer_id: customerId,
          participant_count: participantCount,
          total_cents: totalCents,
          status: 'pending_payment',
          payment_status: 'pending',
          reference: `CLAY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          confirmed_at: null,
          cancelled_at: null,
          completed_at: null,
        };

        this.data.bookings.push(booking);

        // Claim hold if provided
        if (holdId) {
          const hold = this.data.booking_holds.find(h => h.id === holdId);
          if (hold) {
            hold.claimed_booking_id = booking.id;
          }
        }

        return [{ booking_id: booking.id }] as T[];
      } finally {
        this.advisoryLocks.delete(lockKey);
      }
    }

    if (sql.includes('SELECT * FROM sessions')) {
      const id = params?.[0] as string;
      const session = this.data.sessions.find(s => s.id === id);
      return session ? [session] : [];
    }

    if (sql.includes('SELECT * FROM customers')) {
      const idOrEmail = params?.[0] as string;
      const customer = this.data.customers.find(
        c => c.id === idOrEmail || c.email === idOrEmail
      );
      return customer ? [customer] : [];
    }

    if (sql.includes('SELECT * FROM booking_holds WHERE')) {
      const id = params?.[0] as string;
      const hold = this.data.booking_holds.find(h => h.id === id);
      return hold ? [hold] : [];
    }

    // Handle UPDATE bookings
    if (sql.includes('UPDATE bookings SET') && sql.includes('payment_status')) {
      // Extract booking ID - handle different SQL patterns
      let bookingId: string | undefined;
      if (params && params.length >= 1) {
        bookingId = params[params.length - 1] as string;
      }
      if (bookingId) {
        const booking = this.data.bookings.find(b => b.id === bookingId);
        if (booking) {
          // Extract payment_status from SQL
          const match = sql.match(/payment_status\s*=\s*['"]?(\w+)['"]?/);
          if (match) {
            booking.payment_status = match[1] as any;
            booking.updated_at = new Date().toISOString();
          }
          return [booking] as T[];
        }
      }
      return [] as T[];
    }

    if (sql.includes('SELECT * FROM bookings WHERE')) {
      const id = params?.[0] as string;
      const booking = this.data.bookings.find(b => b.id === id);
      return booking ? [booking] : [];
    }

    if (sql.includes('release_hold')) {
      const holdId = params?.[0] as string;
      const idx = this.data.booking_holds.findIndex(
        h => h.id === holdId && !h.claimed_booking_id
      );
      if (idx >= 0) {
        this.data.booking_holds.splice(idx, 1);
        return [{ released: true }] as T[];
      }
      return [{ released: false }] as T[];
    }

    if (sql.includes('cleanup_expired_holds')) {
      const now = new Date();
      const initialCount = this.data.booking_holds.length;
      this.data.booking_holds = this.data.booking_holds.filter(
        h => new Date(h.expires_at) > now || h.claimed_booking_id
      );
      const cleaned = initialCount - this.data.booking_holds.length;
      return [{ count: cleaned }] as T[];
    }

    if (sql.includes('transition_booking_status')) {
      const bookingId = params?.[0] as string;
      const newStatus = params?.[1] as string;
      const booking = this.data.bookings.find(b => b.id === bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Validate transitions
      const validTransitions: Record<string, string[]> = {
        'pending_payment': ['confirmed', 'cancelled', 'expired'],
        'confirmed': ['completed', 'cancelled', 'no_show'],
        'cancelled': ['confirmed'],
      };

      const allowed = validTransitions[booking.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${booking.status} to ${newStatus}`);
      }

      booking.status = newStatus;
      booking.updated_at = new Date().toISOString();
      
      if (newStatus === 'confirmed') booking.confirmed_at = new Date().toISOString();
      if (newStatus === 'cancelled') booking.cancelled_at = new Date().toISOString();
      if (newStatus === 'completed') booking.completed_at = new Date().toISOString();

      return [{ success: true }] as T[];
    }

    if (sql.includes('INSERT INTO payments')) {
      const bookingId = params?.[0] as string;
      const hitpayRequestId = params?.[1];
      const checkoutUrl = params?.[2];
      const amountCents = params?.[3] as number;

      const payment = {
        id: `payment-${Date.now()}-${Math.random()}`,
        booking_id: bookingId,
        hitpay_request_id: hitpayRequestId ?? null,
        hitpay_checkout_url: checkoutUrl ?? null,
        amount_cents: amountCents,
        currency: 'SGD',
        status: 'pending',
        webhook_payload: null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.data.payments.push(payment);
      return [payment] as T[];
    }

    if (sql.includes('SELECT * FROM payments WHERE')) {
      const requestId = params?.[0] as string;
      const payment = this.data.payments.find(p => p.hitpay_request_id === requestId);
      return payment ? [payment] : [];
    }

    if (sql.includes('UPDATE payments SET')) {
      const newStatus = params?.[0] as string;
      const webhookPayload = params?.[1];
      const paymentId = params?.[2] as string;
      
      const payment = this.data.payments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = newStatus;
        payment.webhook_payload = JSON.parse(webhookPayload as string);
        payment.verified_at = ['captured', 'authorized'].includes(newStatus) 
          ? new Date().toISOString() 
          : payment.verified_at;
        payment.updated_at = new Date().toISOString();
        return [payment] as T[];
      }
      return [] as T[];
    }

    return [] as T[];
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] ?? null;
  }

  async transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    // Simple transaction simulation
    return await fn(this as TransactionClient);
  }

  // Helper methods for test setup
  addSession(session: any) {
    this.data.sessions.push(session);
  }

  addCustomer(customer: any) {
    this.data.customers.push(customer);
  }

  getBookings() {
    return this.data.bookings;
  }

  getHolds() {
    return this.data.booking_holds;
  }

  clear() {
    Object.keys(this.data).forEach(key => {
      this.data[key] = [];
    });
  }
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestSession(overrides = {}) {
  return {
    id: `session-${Date.now()}-${Math.random()}`,
    workshop_type_id: 'wt-1',
    room_id: 'room-1',
    start_time_tz: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    end_time_tz: new Date(Date.now() + 90 * 60000).toISOString(),
    capacity: 24,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createTestCustomer(overrides = {}) {
  return {
    id: `customer-${Date.now()}-${Math.random()}`,
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    phone: '+65 9123 4567',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('BookingEngine', () => {
  let db: MockDatabaseClient;
  let engine: BookingEngine;

  beforeEach(() => {
    db = new MockDatabaseClient();
    engine = new BookingEngine(db);
  });

  describe('Session Availability', () => {
    it('should return available seats for a session', async () => {
      const session = createTestSession({ capacity: 24 });
      db.addSession(session);

      const available = await engine.getAvailableSeats(session.id);
      expect(available).toBe(24);
    });

    it('should account for confirmed bookings', async () => {
      const session = createTestSession({ capacity: 24 });
      db.addSession(session);

      // Add confirmed booking
      db.getBookings().push({
        id: 'booking-1',
        session_id: session.id,
        customer_id: 'customer-1',
        participant_count: 5,
        total_cents: 16500,
        status: 'confirmed',
        payment_status: 'captured',
      });

      const available = await engine.getAvailableSeats(session.id);
      expect(available).toBe(19);
    });

    it('should account for active holds', async () => {
      const session = createTestSession({ capacity: 24 });
      db.addSession(session);

      // Add active hold
      db.getHolds().push({
        id: 'hold-1',
        session_id: session.id,
        customer_id: 'customer-1',
        seats: 3,
        expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
        claimed_booking_id: null,
      });

      const available = await engine.getAvailableSeats(session.id);
      expect(available).toBe(21);
    });
  });

  describe('Concurrent Last-Seat Booking', () => {
    it('should prevent overbooking when multiple users try to book last seats', async () => {
      const session = createTestSession({ capacity: 24 });
      db.addSession(session);

      const customer1 = createTestCustomer({ email: 'user1@test.com' });
      const customer2 = createTestCustomer({ email: 'user2@test.com' });
      db.addCustomer(customer1);
      db.addCustomer(customer2);

      // Fill 22 seats
      for (let i = 0; i < 11; i++) {
        db.getBookings().push({
          id: `booking-${i}`,
          session_id: session.id,
          customer_id: customer1.id,
          participant_count: 2,
          total_cents: 6600,
          status: 'confirmed',
          payment_status: 'captured',
        });
      }

      // 2 seats remaining
      // First booking succeeds
      const booking1 = await engine.createBooking(
        session.id,
        customer1.id,
        2,
        6600
      );
      expect(booking1.booking_id).toBeDefined();

      // Second booking should fail (no seats left)
      await expect(
        engine.createBooking(session.id, customer2.id, 2, 6600)
      ).rejects.toThrow();

      // Verify only one booking was created for the last 2 seats
      // Pre-filled bookings have IDs like 'booking-0', 'booking-1', etc.
      // New booking has ID with timestamp
      const newBookings = db.getBookings().filter(
        b => b.session_id === session.id && b.participant_count === 2 && 
             b.id.match(/booking-\d+-\d+\.\d+/) // New booking format
      );
      expect(newBookings.length).toBe(1);
    });

    it('should handle concurrent holds on last seats', async () => {
      const session = createTestSession({ capacity: 24 });
      db.addSession(session);

      const customer1 = createTestCustomer({ email: 'user1@test.com' });
      const customer2 = createTestCustomer({ email: 'user2@test.com' });
      db.addCustomer(customer1);
      db.addCustomer(customer2);

      // Fill 23 seats
      for (let i = 0; i < 23; i++) {
        db.getBookings().push({
          id: `booking-${i}`,
          session_id: session.id,
          customer_id: customer1.id,
          participant_count: 1,
          total_cents: 3300,
          status: 'confirmed',
          payment_status: 'captured',
        });
      }

      // 1 seat remaining
      // First hold succeeds
      const hold1 = await engine.createHold(session.id, customer1.id, 1);
      expect(hold1.hold_id).toBeDefined();

      // Second hold should fail (no seats left)
      await expect(
        engine.createHold(session.id, customer2.id, 1)
      ).rejects.toThrow();
    });
  });

  describe('Hold Expiry', () => {
    it('should create hold with 15-minute expiry by default', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const hold = await engine.createHold(session.id, customer.id, 2);

      expect(hold.seats).toBe(2);
      expect(hold.expires_in_seconds).toBeGreaterThan(0);
      expect(hold.expires_in_seconds).toBeLessThanOrEqual(15 * 60);
    });

    it('should allow custom hold duration', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const hold = await engine.createHold(session.id, customer.id, 2, {
        durationMinutes: 30,
      });

      expect(hold.expires_in_seconds).toBeGreaterThan(25 * 60);
      expect(hold.expires_in_seconds).toBeLessThanOrEqual(30 * 60);
    });

    it('should clean up expired holds', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      // Create hold that expires in the past
      const expiredHold = {
        id: 'expired-hold',
        session_id: session.id,
        customer_id: customer.id,
        seats: 2,
        expires_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
        claimed_booking_id: null,
        created_at: new Date().toISOString(),
      };
      db.getHolds().push(expiredHold);

      // Create active hold
      const activeHold = {
        id: 'active-hold',
        session_id: session.id,
        customer_id: customer.id,
        seats: 1,
        expires_at: new Date(Date.now() + 900000).toISOString(), // 15 min from now
        claimed_booking_id: null,
        created_at: new Date().toISOString(),
      };
      db.getHolds().push(activeHold);

      expect(db.getHolds().length).toBe(2);

      const cleaned = await engine.cleanupExpiredHolds();

      expect(cleaned).toBe(1);
      expect(db.getHolds().length).toBe(1);
      expect(db.getHolds()[0].id).toBe('active-hold');
    });

    it('should not clean up claimed holds even if expired', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const claimedHold = {
        id: 'claimed-hold',
        session_id: session.id,
        customer_id: customer.id,
        seats: 2,
        expires_at: new Date(Date.now() - 60000).toISOString(),
        claimed_booking_id: 'booking-1',
        created_at: new Date().toISOString(),
      };
      db.getHolds().push(claimedHold);

      const cleaned = await engine.cleanupExpiredHolds();

      expect(cleaned).toBe(0);
      expect(db.getHolds().length).toBe(1);
    });
  });

  describe('Abandoned Checkout', () => {
    it('should release seats when hold expires without booking', async () => {
      const session = createTestSession({ capacity: 24 });
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      // Create hold for 3 seats
      const hold = await engine.createHold(session.id, customer.id, 3);
      
      let available = await engine.getAvailableSeats(session.id);
      expect(available).toBe(21); // 24 - 3 held

      // Simulate hold expiry
      const expiredHold = db.getHolds().find(h => h.id === hold.hold_id);
      if (expiredHold) {
        expiredHold.expires_at = new Date(Date.now() - 1000).toISOString();
      }

      // Cleanup expired holds
      await engine.cleanupExpiredHolds();

      available = await engine.getAvailableSeats(session.id);
      expect(available).toBe(24); // Seats released
    });

    it('should allow new booking after abandoned hold is cleaned up', async () => {
      const session = createTestSession({ capacity: 1 });
      const customer1 = createTestCustomer({ email: 'user1@test.com' });
      const customer2 = createTestCustomer({ email: 'user2@test.com' });
      db.addSession(session);
      db.addCustomer(customer1);
      db.addCustomer(customer2);

      // Customer 1 creates hold
      const hold = await engine.createHold(session.id, customer1.id, 1);
      
      // Verify customer 2 cannot book
      await expect(
        engine.createBooking(session.id, customer2.id, 1, 3300)
      ).rejects.toThrow();

      // Hold expires
      const expiredHold = db.getHolds().find(h => h.id === hold.hold_id);
      if (expiredHold) {
        expiredHold.expires_at = new Date(Date.now() - 1000).toISOString();
      }

      // Cleanup
      await engine.cleanupExpiredHolds();

      // Customer 2 can now book
      const booking = await engine.createBooking(session.id, customer2.id, 1, 3300);
      expect(booking.booking_id).toBeDefined();
    });
  });

  describe('Duplicate Webhook Handling', () => {
    it('should handle duplicate webhooks idempotently', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      // Create booking
      const booking = await engine.createBooking(session.id, customer.id, 2, 6600);

      // Create payment
      await engine.createPayment(booking.booking_id, 6600, {
        hitpayRequestId: 'hitpay-req-123',
      });

      // First webhook
      const result1 = await engine.processWebhook({
        request_id: 'hitpay-req-123',
        status: 'completed',
        amount: 66,
        currency: 'SGD',
      });

      expect(result1.success).toBe(true);

      // Duplicate webhook (same request_id)
      const result2 = await engine.processWebhook({
        request_id: 'hitpay-req-123',
        status: 'completed',
        amount: 66,
        currency: 'SGD',
      });

      expect(result2.success).toBe(true);
      expect(result2.message).toContain('already processed');
    });

    it('should update booking status on successful payment webhook', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const booking = await engine.createBooking(session.id, customer.id, 2, 6600);
      await engine.createPayment(booking.booking_id, 6600, {
        hitpayRequestId: 'hitpay-req-456',
      });

      expect(booking.status).toBe('pending_payment');

      await engine.processWebhook({
        request_id: 'hitpay-req-456',
        status: 'completed',
      });

      const updatedBooking = await engine.getBooking(booking.booking_id);
      expect(updatedBooking?.status).toBe('confirmed');
      expect(updatedBooking?.payment_status).toBe('captured');
    });

    it('should handle failed payment webhook', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const booking = await engine.createBooking(session.id, customer.id, 2, 6600);
      await engine.createPayment(booking.booking_id, 6600, {
        hitpayRequestId: 'hitpay-req-789',
      });

      await engine.processWebhook({
        request_id: 'hitpay-req-789',
        status: 'failed',
      });

      const updatedBooking = await engine.getBooking(booking.booking_id);
      expect(updatedBooking?.status).toBe('expired');
    });

    it('should reject webhook without request_id', async () => {
      const result = await engine.processWebhook({
        status: 'completed',
      } as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing request_id');
    });
  });

  describe('Booking Status Transitions', () => {
    it('should allow valid status transitions', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const booking = await engine.createBooking(session.id, customer.id, 2, 6600);

      // pending_payment -> confirmed
      await engine.transitionBookingStatus(booking.booking_id, 'confirmed');
      
      const b1 = await engine.getBooking(booking.booking_id);
      expect(b1?.status).toBe('confirmed');

      // confirmed -> completed
      await engine.transitionBookingStatus(booking.booking_id, 'completed');
      
      const b2 = await engine.getBooking(booking.booking_id);
      expect(b2?.status).toBe('completed');
    });

    it('should reject invalid status transitions', async () => {
      const session = createTestSession();
      const customer = createTestCustomer();
      db.addSession(session);
      db.addCustomer(customer);

      const booking = await engine.createBooking(session.id, customer.id, 2, 6600);

      // pending_payment -> completed (invalid)
      await expect(
        engine.transitionBookingStatus(booking.booking_id, 'completed')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('Customer Management', () => {
    it('should create new customer', async () => {
      const customer = await engine.upsertCustomer(
        'new@example.com',
        'New User',
        '+65 9123 4567'
      );

      expect(customer.email).toBe('new@example.com');
      expect(customer.name).toBe('New User');
    });

    it('should return existing customer on upsert', async () => {
      const customer1 = await engine.upsertCustomer(
        'existing@example.com',
        'First Name',
        '+65 9123 4567'
      );

      const customer2 = await engine.upsertCustomer(
        'existing@example.com',
        'First Name',
        '+65 9123 4567'
      );

      expect(customer1.id).toBe(customer2.id);
    });

    it('should update customer on upsert if details changed', async () => {
      await engine.upsertCustomer(
        'update@example.com',
        'Old Name',
        '+65 9123 4567'
      );

      const updated = await engine.upsertCustomer(
        'update@example.com',
        'New Name',
        '+65 9876 5432'
      );

      expect(updated.name).toBe('New Name');
      expect(updated.phone).toBe('+65 9876 5432');
    });
  });
});

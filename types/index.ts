/**
 * Clay Clay Pottery Studio - Database Types
 * Generated from PostgreSQL schema
 */

// ============================================================================
// ENUMS
// ============================================================================

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'expired';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';

// ============================================================================
// BASE ENTITY
// ============================================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// CUSTOMER
// ============================================================================

export interface Customer extends BaseEntity {
  name: string;
  email: string;
  phone: string | null;
}

export interface CustomerInsert {
  name: string;
  email: string;
  phone?: string | null;
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  phone?: string | null;
}

// ============================================================================
// WORKSHOP TYPE
// ============================================================================

export interface WorkshopType extends BaseEntity {
  name: string;
  description: string | null;
  duration_min: number;
  base_price_cents: number;
  is_active: boolean;
}

export interface WorkshopTypeInsert {
  name: string;
  description?: string | null;
  duration_min?: number;
  base_price_cents?: number;
  is_active?: boolean;
}

export interface WorkshopTypeUpdate {
  name?: string;
  description?: string | null;
  duration_min?: number;
  base_price_cents?: number;
  is_active?: boolean;
}

// ============================================================================
// ROOM
// ============================================================================

export interface Room extends BaseEntity {
  name: string;
  default_capacity: number;
  is_active: boolean;
}

export interface RoomInsert {
  name: string;
  default_capacity?: number;
  is_active?: boolean;
}

export interface RoomUpdate {
  name?: string;
  default_capacity?: number;
  is_active?: boolean;
}

// ============================================================================
// SESSION
// ============================================================================

export interface Session extends BaseEntity {
  workshop_type_id: string;
  room_id: string;
  start_time_tz: string;
  end_time_tz: string;
  capacity: number;
  is_active: boolean;
}

export interface SessionInsert {
  workshop_type_id: string;
  room_id: string;
  start_time_tz: string;
  end_time_tz: string;
  capacity?: number;
  is_active?: boolean;
}

export interface SessionUpdate {
  workshop_type_id?: string;
  room_id?: string;
  start_time_tz?: string;
  end_time_tz?: string;
  capacity?: number;
  is_active?: boolean;
}

export interface SessionWithDetails extends Session {
  workshop_type: WorkshopType;
  room: Room;
  available_seats: number;
  total_booked: number;
  total_held: number;
}

// ============================================================================
// BOOKING
// ============================================================================

export interface Booking extends BaseEntity {
  session_id: string;
  customer_id: string;
  participant_count: number;
  total_cents: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface BookingInsert {
  session_id: string;
  customer_id: string;
  participant_count?: number;
  total_cents: number;
  status?: BookingStatus;
  payment_status?: PaymentStatus;
  reference?: string | null;
  notes?: string | null;
}

export interface BookingUpdate {
  session_id?: string;
  customer_id?: string;
  participant_count?: number;
  total_cents?: number;
  status?: BookingStatus;
  payment_status?: PaymentStatus;
  notes?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
}

export interface BookingWithDetails extends Booking {
  session: SessionWithDetails;
  customer: Customer;
  payments: Payment[];
}

// ============================================================================
// BOOKING HOLD
// ============================================================================

export interface BookingHold extends BaseEntity {
  session_id: string;
  customer_id: string | null;
  seats: number;
  expires_at: string;
  claimed_booking_id: string | null;
}

export interface BookingHoldInsert {
  session_id: string;
  customer_id?: string | null;
  seats?: number;
  expires_at: string;
  claimed_booking_id?: string | null;
}

export interface BookingHoldUpdate {
  session_id?: string;
  customer_id?: string | null;
  seats?: number;
  expires_at?: string;
  claimed_booking_id?: string | null;
}

export interface BookingHoldWithDetails extends BookingHold {
  session: Session;
  customer: Customer | null;
  claimed_booking: Booking | null;
}

// ============================================================================
// PAYMENT
// ============================================================================

export interface Payment extends BaseEntity {
  booking_id: string;
  hitpay_request_id: string | null;
  hitpay_checkout_url: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  webhook_payload: Record<string, unknown> | null;
  verified_at: string | null;
}

export interface PaymentInsert {
  booking_id: string;
  hitpay_request_id?: string | null;
  hitpay_checkout_url?: string | null;
  amount_cents: number;
  currency?: string;
  status?: PaymentStatus;
  webhook_payload?: Record<string, unknown> | null;
}

export interface PaymentUpdate {
  booking_id?: string;
  hitpay_request_id?: string | null;
  hitpay_checkout_url?: string | null;
  amount_cents?: number;
  currency?: string;
  status?: PaymentStatus;
  webhook_payload?: Record<string, unknown> | null;
  verified_at?: string | null;
}

export interface PaymentWithDetails extends Payment {
  booking: Booking;
}

// ============================================================================
// PRODUCT
// ============================================================================

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  description: string | null;
  price_cents: number;
  inventory_qty: number;
  is_active: boolean;
}

export interface ProductInsert {
  name: string;
  sku: string;
  description?: string | null;
  price_cents?: number;
  inventory_qty?: number;
  is_active?: boolean;
}

export interface ProductUpdate {
  name?: string;
  sku?: string;
  description?: string | null;
  price_cents?: number;
  inventory_qty?: number;
  is_active?: boolean;
}

// ============================================================================
// INVENTORY MOVEMENT
// ============================================================================

export interface InventoryMovement extends BaseEntity {
  product_id: string;
  booking_id: string | null;
  quantity_delta: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
}

export interface InventoryMovementInsert {
  product_id: string;
  booking_id?: string | null;
  quantity_delta: number;
  reason: string;
  reference_type?: string | null;
  reference_id?: string | null;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_id: string | null;
  customer_id: string | null;
  created_at: string;
}

// ============================================================================
// BOOKING ENGINE TYPES
// ============================================================================

export interface AvailabilityQuery {
  workshopTypeId?: string;
  date?: string; // ISO date string (YYYY-MM-DD)
  startDate?: string;
  endDate?: string;
}

export interface AvailabilityResult {
  session_id: string;
  start_time_tz: string;
  end_time_tz: string;
  capacity: number;
  available_seats: number;
  is_available: boolean;
}

export interface HoldOptions {
  duration_minutes?: number;
}

export interface HoldResult {
  hold_id: string;
  session_id: string;
  seats: number;
  expires_at: string;
  expires_in_seconds: number;
}

export interface BookingOptions {
  hold_id?: string;
  notes?: string;
}

export interface BookingResult {
  booking_id: string;
  reference: string;
  session_id: string;
  customer_id: string;
  participant_count: number;
  total_cents: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
}

export interface PaymentOptions {
  hitpay_request_id?: string;
  checkout_url?: string;
}

export interface PaymentResult {
  payment_id: string;
  booking_id: string;
  amount_cents: number;
  status: PaymentStatus;
  checkout_url?: string;
}

export interface WebhookPayload {
  request_id: string;
  status: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

export const BookingErrorCode = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_FULL: 'SESSION_FULL',
  INVALID_PARTICIPANT_COUNT: 'INVALID_PARTICIPANT_COUNT',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  HOLD_NOT_FOUND: 'HOLD_NOT_FOUND',
  HOLD_MISMATCH: 'HOLD_MISMATCH',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  PAYMENT_VERIFICATION_FAILED: 'PAYMENT_VERIFICATION_FAILED',
  DUPLICATE_WEBHOOK: 'DUPLICATE_WEBHOOK',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  WORKSHOP_TYPE_NOT_FOUND: 'WORKSHOP_TYPE_NOT_FOUND',
} as const;

export type BookingErrorCodeType =
  (typeof BookingErrorCode)[keyof typeof BookingErrorCode];

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

// ============================================================================
// STAFF MANAGEMENT TYPES
// ============================================================================

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';

export type ShiftStatus = 'scheduled' | 'published' | 'cancelled' | 'completed';

export type AttendanceStatus = 'checked_in' | 'checked_out' | 'missed' | 'late' | 'unscheduled';

export type WageRateType = 'hourly' | 'salary';

export interface Employee extends BaseEntity {
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  hourly_wage_cents: number;
  wage_rate_type: WageRateType;
  status: EmployeeStatus;
  hire_date: string;
  termination_date: string | null;
  avatar_url: string | null;
  notes: string | null;
}

export interface EmployeeInsert {
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  hourly_wage_cents: number;
  wage_rate_type?: WageRateType;
  status?: EmployeeStatus;
  hire_date: string;
  termination_date?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
}

export interface EmployeeUpdate {
  employee_code?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  hourly_wage_cents?: number;
  wage_rate_type?: WageRateType;
  status?: EmployeeStatus;
  hire_date?: string;
  termination_date?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
}

export interface EmployeeWithDetails extends Employee {
  shifts: Shift[];
  attendances: Attendance[];
  wage_rates: WageRate[];
}

export interface Shift extends BaseEntity {
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  break_minutes: number;
  notes: string | null;
  published_at: string | null;
  published_by: string | null;
}

export interface ShiftInsert {
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status?: ShiftStatus;
  break_minutes?: number;
  notes?: string | null;
}

export interface ShiftUpdate {
  employee_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: ShiftStatus;
  break_minutes?: number;
  notes?: string | null;
}

export interface ShiftWithDetails extends Shift {
  employee: Employee;
  attendances: Attendance[];
}

export interface Attendance extends BaseEntity {
  employee_id: string;
  shift_id: string | null;
  date: string;
  scheduled_in: string | null;
  scheduled_out: string | null;
  actual_in: string | null;
  actual_out: string | null;
  status: AttendanceStatus;
  hours_worked: number | null;
  estimated_wages_cents: number | null;
  correction_reason: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  voided: boolean;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface AttendanceInsert {
  employee_id: string;
  shift_id?: string | null;
  date: string;
  scheduled_in?: string | null;
  scheduled_out?: string | null;
  actual_in?: string | null;
  actual_out?: string | null;
  status?: AttendanceStatus;
  hours_worked?: number | null;
  estimated_wages_cents?: number | null;
  correction_reason?: string | null;
}

export interface AttendanceUpdate {
  employee_id?: string;
  shift_id?: string | null;
  date?: string;
  scheduled_in?: string | null;
  scheduled_out?: string | null;
  actual_in?: string | null;
  actual_out?: string | null;
  status?: AttendanceStatus;
  hours_worked?: number | null;
  estimated_wages_cents?: number | null;
  correction_reason?: string | null;
  voided?: boolean;
  voided_by?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface AttendanceWithDetails extends Attendance {
  employee: Employee;
  shift: Shift | null;
}

export interface WageRate extends BaseEntity {
  employee_id: string;
  hourly_rate_cents: number;
  effective_date: string;
  end_date: string | null;
  created_by: string | null;
}

export interface WageRateInsert {
  employee_id: string;
  hourly_rate_cents: number;
  effective_date: string;
  end_date?: string | null;
  created_by?: string | null;
}

export interface WageRateUpdate {
  employee_id?: string;
  hourly_rate_cents?: number;
  effective_date?: string;
  end_date?: string | null;
  created_by?: string | null;
}

export interface EmployeeCredentials {
  id: string;
  employee_id: string;
  email: string;
  password_hash: string;
  last_login: string | null;
  is_active: boolean;
  reset_token: string | null;
  reset_token_expires: string | null;
}

export interface EmployeeCredentialsInsert {
  employee_id: string;
  email: string;
  password_hash: string;
  is_active?: boolean;
}

export interface EmployeeCredentialsUpdate {
  email?: string;
  password_hash?: string;
  last_login?: string | null;
  is_active?: boolean;
  reset_token?: string | null;
  reset_token_expires?: string | null;
}

// ============================================================================
// ADMIN DASHBOARD AGGREGATES
// ============================================================================

export interface DashboardStats {
  currentlyWorking: number;
  scheduledToday: number;
  lateNotCheckedIn: EmployeeAlert[];
  todayActualHours: number;
  todayEstimatedCost: number;
  monthEstimatedCost: number;
}

export interface EmployeeAlert {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  shift_id: string;
  shift_start: string;
  minutes_late: number;
  alert_type: 'late' | 'not_checked_in';
}

export interface WeeklyScheduleView {
  week_start: string;
  week_end: string;
  employees: WeeklyEmployeeSchedule[];
}

export interface WeeklyEmployeeSchedule {
  employee: Employee;
  shifts: (Shift & { day_index: number })[];
}

export interface TimesheetRow {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  date: string;
  scheduled_in: string | null;
  scheduled_out: string | null;
  actual_in: string | null;
  actual_out: string | null;
  hours_worked: number | null;
  scheduled_hours: number | null;
  estimated_wages_cents: number | null;
  status: AttendanceStatus;
  attendance_id: string | null;
  shift_id: string | null;
  flags: string[];
}

export interface MonthlyWageSummary {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  scheduled_hours: number;
  actual_hours: number;
  estimated_gross_wages_cents: number;
}

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      workshop_types: {
        Row: WorkshopType;
        Insert: WorkshopTypeInsert;
        Update: WorkshopTypeUpdate;
      };
      rooms: {
        Row: Room;
        Insert: RoomInsert;
        Update: RoomUpdate;
      };
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: SessionUpdate;
      };
      bookings: {
        Row: Booking;
        Insert: BookingInsert;
        Update: BookingUpdate;
      };
      booking_holds: {
        Row: BookingHold;
        Insert: BookingHoldInsert;
        Update: BookingHoldUpdate;
      };
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      inventory_movements: {
        Row: InventoryMovement;
        Insert: InventoryMovementInsert;
        Update: Partial<InventoryMovement>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id'>;
        Update: never;
      };
      employees: {
        Row: Employee;
        Insert: EmployeeInsert;
        Update: EmployeeUpdate;
      };
      shifts: {
        Row: Shift;
        Insert: ShiftInsert;
        Update: ShiftUpdate;
      };
      attendances: {
        Row: Attendance;
        Insert: AttendanceInsert;
        Update: AttendanceUpdate;
      };
      wage_rates: {
        Row: WageRate;
        Insert: WageRateInsert;
        Update: WageRateUpdate;
      };
      employee_credentials: {
        Row: EmployeeCredentials;
        Insert: EmployeeCredentialsInsert;
        Update: EmployeeCredentialsUpdate;
      };
    };
    Views: {};
    Functions: {
      get_available_seats: {
        Args: { p_session_id: string };
        Returns: number;
      };
      check_seat_availability: {
        Args: {
          p_session_id: string;
          p_seats: number;
          p_hold_id?: string;
        };
        Returns: boolean;
      };
      create_seat_hold: {
        Args: {
          p_session_id: string;
          p_customer_id: string;
          p_seats: number;
          p_duration_minutes?: number;
        };
        Returns: string;
      };
      claim_hold_with_booking: {
        Args: {
          p_hold_id: string;
          p_booking_id: string;
        };
        Returns: boolean;
      };
      cleanup_expired_holds: {
        Args: {};
        Returns: number;
      };
      release_hold: {
        Args: { p_hold_id: string };
        Returns: boolean;
      };
      transition_booking_status: {
        Args: {
          p_booking_id: string;
          p_new_status: BookingStatus;
        };
        Returns: boolean;
      };
      create_booking_atomic: {
        Args: {
          p_session_id: string;
          p_customer_id: string;
          p_participant_count: number;
          p_total_cents: number;
          p_hold_id?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      audit_action: AuditAction;
    };
  };
}

/**
 * Staff Scheduling - Attendance Management
 * Handles clock in/out with server-time validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StaffSchedulingErrorCode,
  createError,
} from './errors';

// ============================================================================
// TYPES
// ============================================================================

export type AttendanceStatus = 'active' | 'completed' | 'corrected';

export interface Attendance {
  id: string;
  employee_id: string;
  shift_id: string | null;
  clock_in_tz: string;
  clock_out_tz: string | null;
  duration_minutes: number | null;
  wage_cents: number | null;
  status: AttendanceStatus;
  correction_reason: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceInsert {
  employee_id: string;
  shift_id?: string | null;
  clock_in_tz: string;
  clock_out_tz?: string | null;
  duration_minutes?: number | null;
  wage_cents?: number | null;
  status?: AttendanceStatus;
  correction_reason?: string | null;
  corrected_by?: string | null;
  corrected_at?: string | null;
}

export interface AttendanceUpdate {
  clock_out_tz?: string | null;
  duration_minutes?: number | null;
  wage_cents?: number | null;
  status?: AttendanceStatus;
  correction_reason?: string | null;
  corrected_by?: string | null;
  corrected_at?: string | null;
}

export interface AttendanceWithDetails extends Attendance {
  employee: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  shift: {
    id: string;
    start_time_tz: string;
    end_time_tz: string;
    location: string;
  } | null;
}

export interface ClockInResult {
  attendance: Attendance;
  shift?: {
    id: string;
    start_time_tz: string;
    end_time_tz: string;
    location: string;
  } | null;
  isLate: boolean;
  minutesLate: number;
}

export interface ClockOutResult {
  attendance: Attendance;
  durationMinutes: number;
  wageCents: number;
  isEarly: boolean;
  minutesEarly: number;
}

export interface CorrectAttendanceOptions {
  clockInTz?: string;
  clockOutTz?: string | null;
  reason: string;
  changedBy: string;
}

export interface GetAttendanceForMonthOptions {
  employeeId: string;
  year: number;
  month: number; // 1-12
}

// ============================================================================
// ATTENDANCE SERVICE CLASS
// ============================================================================

export class AttendanceService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get current server time (using Supabase's NOW())
   */
  private async getServerTime(): Promise<string> {
    const { data, error } = await this.supabase.rpc('get_server_time');

    if (error || !data) {
      // Fallback to client time if RPC fails
      return new Date().toISOString();
    }

    return data;
  }

  /**
   * Validate timestamp format
   */
  private validateTimestamp(timestamp: string, fieldName: string): Date {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_CLOCK_TIME,
        `Invalid ${fieldName} timestamp format`,
        { timestamp }
      );
    }
    return date;
  }

  /**
   * Find active shift for employee at given time
   */
  private async findActiveShift(
    employeeId: string,
    atTime: string
  ): Promise<{ id: string; start_time_tz: string; end_time_tz: string; location: string } | null> {
    const { data, error } = await this.supabase
      .from('shifts')
      .select('id, start_time_tz, end_time_tz, location')
      .eq('employee_id', employeeId)
      .eq('status', 'published')
      .lte('start_time_tz', atTime)
      .gte('end_time_tz', atTime)
      .order('start_time_tz', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to find active shift',
        { error: error.message, employeeId, atTime }
      );
    }

    return data;
  }

  /**
   * Calculate minutes between two timestamps
   */
  private calculateMinutesDiff(start: string, end: string): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.round((endTime - startTime) / (1000 * 60));
  }

  /**
   * Check if employee has active attendance session
   */
  async getActiveAttendance(employeeId: string): Promise<Attendance | null> {
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .order('clock_in_tz', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get active attendance',
        { error: error.message, employeeId }
      );
    }

    return data;
  }

  // ============================================================================
  // CLOCK IN / OUT
  // ============================================================================

  /**
   * Clock in an employee
   * Uses server-authoritative timestamp if none provided
   */
  async clockIn(
    employeeId: string,
    timestamp?: string
  ): Promise<ClockInResult> {
    // Validate employee exists and is active
    const { data: employee, error: empError } = await this.supabase
      .from('employees')
      .select('id, status')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    if (employee.status !== 'active') {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_INACTIVE,
        'Cannot clock in inactive employee',
        { employeeId, status: employee.status }
      );
    }

    // Check for existing active session
    const active = await this.getActiveAttendance(employeeId);
    if (active) {
      throw createError(
        StaffSchedulingErrorCode.ALREADY_CLOCKED_IN,
        'Employee is already clocked in',
        { employeeId, attendanceId: active.id, clockInAt: active.clock_in_tz }
      );
    }

    // Use server time if not provided
    const clockInTime = timestamp ?? (await this.getServerTime());
    this.validateTimestamp(clockInTime, 'clock_in');

    // Find active shift for this employee at clock-in time
    const shift = await this.findActiveShift(employeeId, clockInTime);

    // Check if late (more than 5 minutes after shift start)
    let isLate = false;
    let minutesLate = 0;

    if (shift) {
      const shiftStart = new Date(shift.start_time_tz).getTime();
      const clockInMs = new Date(clockInTime).getTime();
      const diffMinutes = Math.round((clockInMs - shiftStart) / (1000 * 60));
      if (diffMinutes > 5) {
        isLate = true;
        minutesLate = diffMinutes;
      }
    }

    // Create attendance record
    const { data: attendance, error } = await this.supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        shift_id: shift?.id ?? null,
        clock_in_tz: clockInTime,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to clock in',
        { error: error.message, employeeId, clockInTime }
      );
    }

    return {
      attendance,
      shift: shift ?? null,
      isLate,
      minutesLate,
    };
  }

  /**
   * Clock out an employee
   * Calculates duration and wages using historical rate
   */
  async clockOut(
    attendanceId: string,
    timestamp?: string
  ): Promise<ClockOutResult> {
    // Get attendance record
    const { data: attendance, error: fetchError } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchError || !attendance) {
      throw createError(
        StaffSchedulingErrorCode.ATTENDANCE_NOT_FOUND,
        'Attendance record not found',
        { attendanceId }
      );
    }

    if (attendance.status !== 'active') {
      throw createError(
        StaffSchedulingErrorCode.NOT_CLOCKED_IN,
        'Attendance is not active (already clocked out or corrected)',
        { attendanceId, status: attendance.status }
      );
    }

    // Use server time if not provided
    const clockOutTime = timestamp ?? (await this.getServerTime());
    this.validateTimestamp(clockOutTime, 'clock_out');

    const clockInTime = new Date(attendance.clock_in_tz).getTime();
    const clockOutMs = new Date(clockOutTime).getTime();

    if (clockOutMs <= clockInTime) {
      throw createError(
        StaffSchedulingErrorCode.CLOCK_OUT_BEFORE_CLOCK_IN,
        'Clock out time must be after clock in time',
        { attendanceId, clockIn: attendance.clock_in_tz, clockOut: clockOutTime }
      );
    }

    // Calculate duration in minutes
    const durationMinutes = Math.round((clockOutMs - clockInTime) / (1000 * 60));

    // Calculate wage using historical rate at clock-in date
    const clockInDate = attendance.clock_in_tz.split('T')[0]; // YYYY-MM-DD
    const wageRate = await this.getWageRateAtDate(attendance.employee_id, clockInDate);

    let wageCents = 0;
    if (wageRate) {
      // Calculate wage: (duration_minutes / 60) * rate_cents_per_hour
      wageCents = Math.round((durationMinutes / 60) * wageRate.rate_cents);
    }

    // Check if early departure (more than 5 minutes before shift end)
    let isEarly = false;
    let minutesEarly = 0;

    if (attendance.shift_id) {
      const { data: shift } = await this.supabase
        .from('shifts')
        .select('end_time_tz')
        .eq('id', attendance.shift_id)
        .single();

      if (shift) {
        const shiftEnd = new Date(shift.end_time_tz).getTime();
        const diffMinutes = Math.round((shiftEnd - clockOutMs) / (1000 * 60));
        if (diffMinutes > 5) {
          isEarly = true;
          minutesEarly = diffMinutes;
        }
      }
    }

    // Update attendance record
    const { data: updated, error } = await this.supabase
      .from('attendance')
      .update({
        clock_out_tz: clockOutTime,
        duration_minutes: durationMinutes,
        wage_cents: wageCents,
        status: 'completed',
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to clock out',
        { error: error.message, attendanceId }
      );
    }

    return {
      attendance: updated,
      durationMinutes,
      wageCents,
      isEarly,
      minutesEarly,
    };
  }

  // ============================================================================
  // ATTENDANCE CORRECTION
  // ============================================================================

  /**
   * Correct an attendance record (admin function)
   */
  async correctAttendance(
    attendanceId: string,
    options: CorrectAttendanceOptions
  ): Promise<Attendance> {
    const { clockInTz, clockOutTz, reason, changedBy } = options;

    // Get attendance record
    const { data: attendance, error: fetchError } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchError || !attendance) {
      throw createError(
        StaffSchedulingErrorCode.ATTENDANCE_NOT_FOUND,
        'Attendance record not found',
        { attendanceId }
      );
    }

    if (attendance.status === 'corrected') {
      throw createError(
        StaffSchedulingErrorCode.ATTENDANCE_ALREADY_CORRECTED,
        'Attendance has already been corrected',
        { attendanceId }
      );
    }

    // Validate timestamps if provided
    let newClockIn = attendance.clock_in_tz;
    let newClockOut = attendance.clock_out_tz;

    if (clockInTz) {
      this.validateTimestamp(clockInTz, 'clock_in');
      newClockIn = clockInTz;
    }

    if (clockOutTz !== undefined) {
      if (clockOutTz !== null) {
        this.validateTimestamp(clockOutTz, 'clock_out');
      }
      newClockOut = clockOutTz;
    }

    // Validate clock out after clock in
    if (newClockOut && new Date(newClockOut).getTime() <= new Date(newClockIn).getTime()) {
      throw createError(
        StaffSchedulingErrorCode.CLOCK_OUT_BEFORE_CLOCK_IN,
        'Clock out time must be after clock in time',
        { clockIn: newClockIn, clockOut: newClockOut }
      );
    }

    // Calculate duration and wage if both times present
    let durationMinutes = attendance.duration_minutes;
    let wageCents = attendance.wage_cents;

    if (newClockOut) {
      durationMinutes = this.calculateMinutesDiff(newClockIn, newClockOut);
      const clockInDate = newClockIn.split('T')[0];
      const wageRate = await this.getWageRateAtDate(attendance.employee_id, clockInDate);
      if (wageRate) {
        wageCents = Math.round((durationMinutes / 60) * wageRate.rate_cents);
      }
    }

    // Update attendance
    const { data: updated, error } = await this.supabase
      .from('attendance')
      .update({
        clock_in_tz: newClockIn,
        clock_out_tz: newClockOut,
        duration_minutes: durationMinutes,
        wage_cents: wageCents,
        status: 'corrected',
        correction_reason: reason,
        corrected_by: changedBy,
        corrected_at: new Date().toISOString(),
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to correct attendance',
        { error: error.message, attendanceId, options }
      );
    }

    return updated;
  }

  // ============================================================================
  // WAGE RATE LOOKUP
  // ============================================================================

  /**
   * Get wage rate for employee at specific date (historical lookup)
   */
  private async getWageRateAtDate(
    employeeId: string,
    date: string
  ): Promise<{ rate_cents: number } | null> {
    const { data, error } = await this.supabase
      .from('employee_wage_rates')
      .select('rate_cents')
      .eq('employee_id', employeeId)
      .lte('effective_date', date)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get wage rate at date',
        { error: error.message, employeeId, date }
      );
    }

    return data;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get attendance by ID with details
   */
  async getAttendance(id: string): Promise<AttendanceWithDetails | null> {
    const { data, error } = await this.supabase
      .from('attendance')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
        ),
        shift:shifts (
          id,
          start_time_tz,
          end_time_tz,
          location
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get attendance',
        { error: error.message, id }
      );
    }

    return data;
  }

  /**
   * Get attendance for employee in a specific month
   */
  async getAttendanceForMonth(
    options: GetAttendanceForMonthOptions
  ): Promise<AttendanceWithDetails[]> {
    const { employeeId, year, month } = options;

    if (month < 1 || month > 12) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Invalid month (must be 1-12)',
        { month }
      );
    }

    // Calculate month start and end
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // Last day of month
    const endDateStr = endDate.toISOString().split('T')[0];

    const startOfMonth = `${startDate}T00:00:00+08:00`;
    const endOfMonth = `${endDateStr}T23:59:59+08:00`;

    // Validate employee exists
    const { data: employee } = await this.supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    const { data, error } = await this.supabase
      .from('attendance')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
        ),
        shift:shifts (
          id,
          start_time_tz,
          end_time_tz,
          location
        )
      `)
      .eq('employee_id', employeeId)
      .gte('clock_in_tz', startOfMonth)
      .lte('clock_in_tz', endOfMonth)
      .order('clock_in_tz', { ascending: true });

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get attendance for month',
        { error: error.message, options }
      );
    }

    return data ?? [];
  }

  /**
   * List all attendance records with filters
   */
  async listAttendance(filters: {
    employeeId?: string;
    status?: AttendanceStatus;
    startDate?: string;
    endDate?: string;
    shiftId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ attendance: AttendanceWithDetails[]; total: number }> {
    const { employeeId, status, startDate, endDate, shiftId, limit = 50, offset = 0 } = filters;

    let query = this.supabase
      .from('attendance')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
        ),
        shift:shifts (
          id,
          start_time_tz,
          end_time_tz,
          location
        )
      `, { count: 'exact' })
      .order('clock_in_tz', { ascending: false })
      .range(offset, offset + limit - 1);

    if (employeeId) query = query.eq('employee_id', employeeId);
    if (status) query = query.eq('status', status);
    if (shiftId) query = query.eq('shift_id', shiftId);
    if (startDate) {
      const startOfDay = `${startDate}T00:00:00+08:00`;
      query = query.gte('clock_in_tz', startOfDay);
    }
    if (endDate) {
      const endOfDay = `${endDate}T23:59:59+08:00`;
      query = query.lte('clock_in_tz', endOfDay);
    }

    const { data, error, count } = await query;

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to list attendance',
        { error: error.message, filters }
      );
    }

    return {
      attendance: data ?? [],
      total: count ?? 0,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createAttendanceService(
  supabaseUrl: string,
  supabaseKey: string
): AttendanceService {
  return new AttendanceService(supabaseUrl, supabaseKey);
}
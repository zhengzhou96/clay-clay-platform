/**
 * Staff Scheduling - Wage Calculation
 * Handles wage calculation with historical rate lookup
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StaffSchedulingErrorCode,
  createError,
} from './errors';

// ============================================================================
// TYPES
// ============================================================================

export interface WageCalculationResult {
  attendanceId: string;
  employeeId: string;
  clockInDate: string;
  durationMinutes: number;
  hourlyRateCents: number;
  wageCents: number;
  wageRateEffectiveDate: string;
}

export interface MonthlyWagesSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  year: number;
  month: number;
  totalShifts: number;
  totalMinutes: number;
  totalHours: number;
  totalWageCents: number;
  averageHourlyRateCents: number;
  attendanceRecords: AttendanceWageDetail[];
}

export interface AttendanceWageDetail {
  attendanceId: string;
  date: string;
  shiftId: string | null;
  clockInTz: string;
  clockOutTz: string | null;
  durationMinutes: number;
  hourlyRateCents: number;
  wageCents: number;
  wageRateEffectiveDate: string;
  isCorrected: boolean;
}

export interface CalculateWagesOptions {
  attendanceId: string;
}

export interface GetMonthlyWagesSummaryOptions {
  employeeId: string;
  year: number;
  month: number; // 1-12
}

// ============================================================================
// WAGE SERVICE CLASS
// ============================================================================

export class WageService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get wage rate for employee at specific date (historical lookup)
   * Returns the most recent rate on or before the given date
   */
  async getWageRateAtDate(
    employeeId: string,
    date: string
  ): Promise<{ rate_cents: number; effective_date: string } | null> {
    const { data, error } = await this.supabase
      .from('employee_wage_rates')
      .select('rate_cents, effective_date')
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

  /**
   * Calculate minutes between two timestamps
   */
  private calculateMinutesDiff(start: string, end: string): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.round((endTime - startTime) / (1000 * 60));
  }

  /**
   * Round to nearest cent (already in cents, so just ensure integer)
   */
  private roundCents(cents: number): number {
    return Math.round(cents);
  }

  // ============================================================================
  // WAGE CALCULATION
  // ============================================================================

  /**
   * Calculate wages for a specific attendance record
   * Uses the wage rate effective on the clock-in date
   */
  async calculateWages(options: CalculateWagesOptions): Promise<WageCalculationResult> {
    const { attendanceId } = options;

    // Get attendance record
    const { data: attendance, error } = await this.supabase
      .from('attendance')
      .select('id, employee_id, clock_in_tz, clock_out_tz, duration_minutes, wage_cents, status')
      .eq('id', attendanceId)
      .single();

    if (error || !attendance) {
      throw createError(
        StaffSchedulingErrorCode.ATTENDANCE_NOT_FOUND,
        'Attendance record not found',
        { attendanceId }
      );
    }

    if (attendance.status !== 'completed' && attendance.status !== 'corrected') {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Cannot calculate wages for incomplete attendance',
        { attendanceId, status: attendance.status }
      );
    }

    if (!attendance.clock_out_tz) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Attendance has no clock-out time',
        { attendanceId }
      );
    }

    // Use stored duration if available, otherwise calculate
    const durationMinutes = attendance.duration_minutes ?? this.calculateMinutesDiff(
      attendance.clock_in_tz,
      attendance.clock_out_tz
    );

    if (durationMinutes <= 0) {
      throw createError(
        StaffSchedulingErrorCode.CALCULATION_ERROR,
        'Invalid duration (must be positive)',
        { attendanceId, durationMinutes }
      );
    }

    // Get wage rate at clock-in date (historical lookup)
    const clockInDate = attendance.clock_in_tz.split('T')[0];
    const wageRate = await this.getWageRateAtDate(attendance.employee_id, clockInDate);

    if (!wageRate) {
      throw createError(
        StaffSchedulingErrorCode.WAGE_RATE_NOT_FOUND,
        'No wage rate found for employee at clock-in date',
        { employeeId: attendance.employee_id, clockInDate }
      );
    }

    // Calculate wage: (duration_minutes / 60) * hourly_rate_cents
    const wageCents = this.roundCents((durationMinutes / 60) * wageRate.rate_cents);

    return {
      attendanceId: attendance.id,
      employeeId: attendance.employee_id,
      clockInDate,
      durationMinutes,
      hourlyRateCents: wageRate.rate_cents,
      wageCents,
      wageRateEffectiveDate: wageRate.effective_date,
    };
  }

  /**
   * Recalculate and update wages for an attendance record
   */
  async recalculateAndUpdateWages(attendanceId: string): Promise<WageCalculationResult> {
    const result = await this.calculateWages({ attendanceId });

    // Update attendance with calculated wage
    const { error } = await this.supabase
      .from('attendance')
      .update({ wage_cents: result.wageCents })
      .eq('id', attendanceId);

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to update attendance with calculated wage',
        { error: error.message, attendanceId, wageCents: result.wageCents }
      );
    }

    return result;
  }

  /**
   * Get monthly wages summary for an employee
   */
  async getMonthlyWagesSummary(
    options: GetMonthlyWagesSummaryOptions
  ): Promise<MonthlyWagesSummary> {
    const { employeeId, year, month } = options;

    if (month < 1 || month > 12) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Invalid month (must be 1-12)',
        { month }
      );
    }

    // Get employee details
    const { data: employee, error: empError } = await this.supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    // Calculate month start and end
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // Last day of month
    const endDateStr = endDate.toISOString().split('T')[0];

    const startOfMonth = `${startDate}T00:00:00+08:00`;
    const endOfMonth = `${endDateStr}T23:59:59+08:00`;

    // Get attendance records for the month
    const { data: attendanceRecords, error: attError } = await this.supabase
      .from('attendance')
      .select(`
        id,
        shift_id,
        clock_in_tz,
        clock_out_tz,
        duration_minutes,
        wage_cents,
        status,
        corrected_at
      `)
      .eq('employee_id', employeeId)
      .gte('clock_in_tz', startOfMonth)
      .lte('clock_in_tz', endOfMonth)
      .in('status', ['completed', 'corrected'])
      .order('clock_in_tz', { ascending: true });

    if (attError) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get attendance for month',
        { error: attError.message, options }
      );
    }

    // Calculate wages for each attendance record
    const details: AttendanceWageDetail[] = [];
    let totalMinutes = 0;
    let totalWageCents = 0;
    let totalRateCents = 0;
    let rateCount = 0;

    for (const att of attendanceRecords ?? []) {
      if (!att.clock_out_tz || !att.duration_minutes) {
        continue; // Skip incomplete records
      }

      const clockInDate = att.clock_in_tz.split('T')[0];
      const wageRate = await this.getWageRateAtDate(employeeId, clockInDate);

      if (wageRate) {
        const wageCents = this.roundCents((att.duration_minutes / 60) * wageRate.rate_cents);

        details.push({
          attendanceId: att.id,
          date: clockInDate,
          shiftId: att.shift_id,
          clockInTz: att.clock_in_tz,
          clockOutTz: att.clock_out_tz,
          durationMinutes: att.duration_minutes,
          hourlyRateCents: wageRate.rate_cents,
          wageCents,
          wageRateEffectiveDate: wageRate.effective_date,
          isCorrected: att.status === 'corrected',
        });

        totalMinutes += att.duration_minutes;
        totalWageCents += wageCents;
        totalRateCents += wageRate.rate_cents;
        rateCount++;
      }
    }

    const totalHours = totalMinutes / 60;
    const averageHourlyRateCents = rateCount > 0
      ? Math.round(totalRateCents / rateCount)
      : 0;

    return {
      employeeId: employee.id,
      employeeCode: employee.employee_code,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      year,
      month,
      totalShifts: details.length,
      totalMinutes,
      totalHours,
      totalWageCents,
      averageHourlyRateCents,
      attendanceRecords: details,
    };
  }

  /**
   * Get monthly wages summary for all employees
   */
  async getAllMonthlyWagesSummary(
    year: number,
    month: number
  ): Promise<MonthlyWagesSummary[]> {
    if (month < 1 || month > 12) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Invalid month (must be 1-12)',
        { month }
      );
    }

    // Get all active employees
    const { data: employees, error: empError } = await this.supabase
      .from('employees')
      .select('id')
      .eq('status', 'active');

    if (empError) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get employees',
        { error: empError.message }
      );
    }

    const summaries: MonthlyWagesSummary[] = [];

    for (const employee of employees ?? []) {
      const summary = await this.getMonthlyWagesSummary({
        employeeId: employee.id,
        year,
        month,
      });
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Calculate total payroll for a month across all employees
   */
  async getMonthlyPayrollTotal(
    year: number,
    month: number
  ): Promise<{
    year: number;
    month: number;
    totalEmployees: number;
    totalShifts: number;
    totalHours: number;
    totalWageCents: number;
    byEmployee: Array<{
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      wageCents: number;
      hours: number;
    }>;
  }> {
    const summaries = await this.getAllMonthlyWagesSummary(year, month);

    const byEmployee = summaries.map(s => ({
      employeeId: s.employeeId,
      employeeCode: s.employeeCode,
      employeeName: s.employeeName,
      wageCents: s.totalWageCents,
      hours: s.totalHours,
    }));

    const totalEmployees = summaries.filter(s => s.totalWageCents > 0).length;
    const totalShifts = summaries.reduce((sum, s) => sum + s.totalShifts, 0);
    const totalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0);
    const totalWageCents = summaries.reduce((sum, s) => sum + s.totalWageCents, 0);

    return {
      year,
      month,
      totalEmployees,
      totalShifts,
      totalHours,
      totalWageCents,
      byEmployee,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createWageService(
  supabaseUrl: string,
  supabaseKey: string
): WageService {
  return new WageService(supabaseUrl, supabaseKey);
}
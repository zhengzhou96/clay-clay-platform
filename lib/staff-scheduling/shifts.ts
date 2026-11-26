/**
 * Staff Scheduling - Shift Scheduling
 * Handles CRUD operations for shifts with publish workflow
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StaffSchedulingErrorCode,
  createError,
} from './errors';

// ============================================================================
// TYPES
// ============================================================================

export type ShiftStatus = 'draft' | 'published' | 'cancelled';

export interface Shift {
  id: string;
  employee_id: string;
  start_time_tz: string; // ISO timestamp with timezone
  end_time_tz: string;   // ISO timestamp with timezone
  location: string;
  status: ShiftStatus;
  notes: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftInsert {
  employee_id: string;
  start_time_tz: string;
  end_time_tz: string;
  location: string;
  notes?: string | null;
  status?: ShiftStatus;
  created_by?: string | null;
}

export interface ShiftUpdate {
  employee_id?: string;
  start_time_tz?: string;
  end_time_tz?: string;
  location?: string;
  notes?: string | null;
  status?: ShiftStatus;
}

export interface ShiftWithEmployee extends Shift {
  employee: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface CreateShiftOptions {
  employeeId: string;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
  location: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateShiftOptions {
  employeeId?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  status?: ShiftStatus;
}

export interface GetShiftsForEmployeeOptions {
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string;   // ISO date (YYYY-MM-DD)
  status?: ShiftStatus;
}

export interface GetShiftsForWeekOptions {
  weekStart: string; // ISO date (YYYY-MM-DD) - Monday of the week
  status?: ShiftStatus;
  location?: string;
  employeeId?: string;
}

export interface DuplicateWeekShiftsOptions {
  sourceWeekStart: string; // ISO date (YYYY-MM-DD)
  targetWeekStart: string; // ISO date (YYYY-MM-DD)
  includeCancelled?: boolean;
}

// ============================================================================
// SHIFT SERVICE CLASS
// ============================================================================

export class ShiftService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validate shift times - end must be after start, reasonable duration
   */
  private validateShiftTimes(startTime: string, endTime: string): void {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_SHIFT_TIMES,
        'Invalid timestamp format',
        { startTime, endTime }
      );
    }

    if (end <= start) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_SHIFT_TIMES,
        'End time must be after start time',
        { startTime, endTime }
      );
    }

    // Check reasonable duration (max 24 hours)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours > 24) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_SHIFT_TIMES,
        'Shift duration cannot exceed 24 hours',
        { durationHours }
      );
    }

    // Check minimum duration (15 minutes)
    if (durationHours < 0.25) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_SHIFT_TIMES,
        'Shift duration must be at least 15 minutes',
        { durationHours }
      );
    }
  }

  /**
   * Check for shift overlaps for an employee
   */
  private async checkShiftOverlap(
    employeeId: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string
  ): Promise<void> {
    let query = this.supabase
      .from('shifts')
      .select('id, start_time_tz, end_time_tz')
      .eq('employee_id', employeeId)
      .neq('status', 'cancelled')
      .lt('start_time_tz', endTime)
      .gt('end_time_tz', startTime);

    if (excludeShiftId) {
      query = query.neq('id', excludeShiftId);
    }

    const { data, error } = await query;

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to check shift overlap',
        { error: error.message, employeeId }
      );
    }

    if (data && data.length > 0) {
      throw createError(
        StaffSchedulingErrorCode.SHIFT_OVERLAP,
        'Shift overlaps with existing shift',
        { employeeId, conflictingShifts: data }
      );
    }
  }

  /**
   * Check if shift is in the past (cannot modify published past shifts)
   */
  private isShiftInPast(endTime: string): boolean {
    const end = new Date(endTime);
    const now = new Date();
    return end < now;
  }

  // ============================================================================
  // SHIFT CRUD
  // ============================================================================

  /**
   * Create a new shift (draft by default)
   */
  async createShift(options: CreateShiftOptions): Promise<Shift> {
    const { employeeId, startTime, endTime, location, notes, createdBy } = options;

    // Validate employee exists
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
        'Cannot create shift for inactive employee',
        { employeeId, status: employee.status }
      );
    }

    // Validate times
    this.validateShiftTimes(startTime, endTime);

    // Check for overlaps
    await this.checkShiftOverlap(employeeId, startTime, endTime);

    // Create shift
    const { data: shift, error } = await this.supabase
      .from('shifts')
      .insert({
        employee_id: employeeId,
        start_time_tz: startTime,
        end_time_tz: endTime,
        location,
        notes: notes ?? null,
        status: 'draft',
        created_by: createdBy ?? null,
      })
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to create shift',
        { error: error.message, options }
      );
    }

    return shift;
  }

  /**
   * Get shift by ID
   */
  async getShift(id: string): Promise<Shift | null> {
    const { data, error } = await this.supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get shift',
        { error: error.message, id }
      );
    }

    return data;
  }

  /**
   * Get shift with employee details
   */
  async getShiftWithEmployee(id: string): Promise<ShiftWithEmployee | null> {
    const { data, error } = await this.supabase
      .from('shifts')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
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
        'Failed to get shift with employee',
        { error: error.message, id }
      );
    }

    return data;
  }

  /**
   * Update a shift
   */
  async updateShift(shiftId: string, options: UpdateShiftOptions): Promise<Shift> {
    // Get existing shift
    const existing = await this.getShift(shiftId);
    if (!existing) {
      throw createError(
        StaffSchedulingErrorCode.SHIFT_NOT_FOUND,
        'Shift not found',
        { shiftId }
      );
    }

    // Cannot modify published shifts that are in the past
    if (existing.status === 'published' && this.isShiftInPast(existing.end_time_tz)) {
      throw createError(
        StaffSchedulingErrorCode.SHIFT_PAST_CANNOT_MODIFY,
        'Cannot modify published shift that has already ended',
        { shiftId }
      );
    }

    // Determine new values
    const employeeId = options.employeeId ?? existing.employee_id;
    const startTime = options.startTime ?? existing.start_time_tz;
    const endTime = options.endTime ?? existing.end_time_tz;

    // Validate times if changed
    if (options.startTime || options.endTime) {
      this.validateShiftTimes(startTime, endTime);
    }

    // Check for overlaps if employee or times changed
    if (options.employeeId || options.startTime || options.endTime) {
      await this.checkShiftOverlap(employeeId, startTime, endTime, shiftId);
    }

    // If changing employee, validate new employee
    if (options.employeeId && options.employeeId !== existing.employee_id) {
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .select('id, status')
        .eq('id', options.employeeId)
        .single();

      if (empError || !employee) {
        throw createError(
          StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
          'Employee not found',
          { employeeId: options.employeeId }
        );
      }

      if (employee.status !== 'active') {
        throw createError(
          StaffSchedulingErrorCode.EMPLOYEE_INACTIVE,
          'Cannot assign shift to inactive employee',
          { employeeId: options.employeeId, status: employee.status }
        );
      }
    }

    // Update shift
    const updateData: Record<string, unknown> = {};
    if (options.employeeId) updateData.employee_id = options.employeeId;
    if (options.startTime) updateData.start_time_tz = options.startTime;
    if (options.endTime) updateData.end_time_tz = options.endTime;
    if (options.location) updateData.location = options.location;
    if (options.notes !== undefined) updateData.notes = options.notes;
    if (options.status) updateData.status = options.status;

    const { data: shift, error } = await this.supabase
      .from('shifts')
      .update(updateData)
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to update shift',
        { error: error.message, shiftId, options }
      );
    }

    return shift;
  }

  /**
   * Cancel a shift
   */
  async cancelShift(shiftId: string): Promise<Shift> {
    const existing = await this.getShift(shiftId);
    if (!existing) {
      throw createError(
        StaffSchedulingErrorCode.SHIFT_NOT_FOUND,
        'Shift not found',
        { shiftId }
      );
    }

    if (existing.status === 'cancelled') {
      return existing; // Already cancelled
    }

    // Cannot cancel published shifts that are in the past
    if (existing.status === 'published' && this.isShiftInPast(existing.end_time_tz)) {
      throw createError(
        StaffSchedulingErrorCode.SHIFT_PAST_CANNOT_MODIFY,
        'Cannot cancel published shift that has already ended',
        { shiftId }
      );
    }

    return this.updateShift(shiftId, { status: 'cancelled' });
  }

  /**
   * Publish shifts (move from draft to published)
   */
  async publishShifts(shiftIds: string[]): Promise<Shift[]> {
    if (shiftIds.length === 0) {
      return [];
    }

    // Validate all shifts exist and are draft
    const { data: shifts, error: fetchError } = await this.supabase
      .from('shifts')
      .select('id, status, start_time_tz, end_time_tz, employee_id')
      .in('id', shiftIds);

    if (fetchError) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to fetch shifts for publishing',
        { error: fetchError.message, shiftIds }
      );
    }

    if (!shifts || shifts.length !== shiftIds.length) {
      const foundIds = shifts?.map(s => s.id) ?? [];
      const missingIds = shiftIds.filter(id => !foundIds.includes(id));
      throw createError(
        StaffSchedulingErrorCode.SHIFT_NOT_FOUND,
        'Some shifts not found',
        { missingIds }
      );
    }

    // Check for already published shifts
    const alreadyPublished = shifts.filter(s => s.status === 'published');
    if (alreadyPublished.length > 0) {
      throw createError(
        StaffSchedulingErrorCode.SHIFT_ALREADY_PUBLISHED,
        'Some shifts are already published',
        { shiftIds: alreadyPublished.map(s => s.id) }
      );
    }

    // Check for overlaps among the shifts being published
    // Group by employee
    const shiftsByEmployee = new Map<string, typeof shifts>();
    for (const shift of shifts) {
      const empShifts = shiftsByEmployee.get(shift.employee_id) ?? [];
      empShifts.push(shift);
      shiftsByEmployee.set(shift.employee_id, empShifts);
    }

    // Check each employee's shifts for overlaps
    for (const [employeeId, empShifts] of shiftsByEmployee) {
      // Check each shift individually against existing published shifts
      for (const shift of empShifts) {
        await this.checkShiftOverlap(
          employeeId,
          shift.start_time_tz,
          shift.end_time_tz
        );
      }
    }

    // Publish all shifts
    const now = new Date().toISOString();
    const { data: publishedShifts, error } = await this.supabase
      .from('shifts')
      .update({
        status: 'published',
        published_at: now,
      })
      .in('id', shiftIds)
      .select();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to publish shifts',
        { error: error.message, shiftIds }
      );
    }

    return publishedShifts ?? [];
  }

  /**
   * Get shifts for an employee within a date range
   */
  async getShiftsForEmployee(
    employeeId: string,
    options: GetShiftsForEmployeeOptions
  ): Promise<ShiftWithEmployee[]> {
    const { startDate, endDate, status } = options;

    // Validate employee exists
    const employee = await this.supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .single();

    if (employee.error || !employee.data) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    // Build query - shifts that overlap with the date range
    const startOfRange = `${startDate}T00:00:00+08:00`;
    const endOfRange = `${endDate}T23:59:59+08:00`;

    let query = this.supabase
      .from('shifts')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
        )
      `)
      .eq('employee_id', employeeId)
      .lt('start_time_tz', endOfRange)
      .gt('end_time_tz', startOfRange)
      .order('start_time_tz', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get shifts for employee',
        { error: error.message, employeeId, options }
      );
    }

    return data ?? [];
  }

  /**
   * Get shifts for a week (Monday to Sunday)
   */
  async getShiftsForWeek(options: GetShiftsForWeekOptions): Promise<ShiftWithEmployee[]> {
    const { weekStart, status, location, employeeId } = options;

    // Calculate week end (Sunday)
    const start = new Date(`${weekStart}T00:00:00+08:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const endOfWeek = end.toISOString();

    const startOfWeek = `${weekStart}T00:00:00+08:00`;

    let query = this.supabase
      .from('shifts')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
        )
      `)
      .lt('start_time_tz', endOfWeek)
      .gt('end_time_tz', startOfWeek)
      .order('start_time_tz', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }
    if (location) {
      query = query.eq('location', location);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get shifts for week',
        { error: error.message, options }
      );
    }

    return data ?? [];
  }

  /**
   * Duplicate shifts from one week to another
   */
  async duplicateWeekShifts(options: DuplicateWeekShiftsOptions): Promise<Shift[]> {
    const { sourceWeekStart, targetWeekStart, includeCancelled = false } = options;

    // Get source week shifts
    const sourceShifts = await this.getShiftsForWeek({
      weekStart: sourceWeekStart,
      status: includeCancelled ? undefined : 'published',
    });

    if (sourceShifts.length === 0) {
      return [];
    }

    // Calculate day offset
    const sourceStart = new Date(`${sourceWeekStart}T00:00:00+08:00`);
    const targetStart = new Date(`${targetWeekStart}T00:00:00+08:00`);
    const dayDiff = Math.round((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff % 7 !== 0) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Target week must start on the same weekday as source week (Monday)',
        { sourceWeekStart, targetWeekStart, dayDiff }
      );
    }

    // Create new shifts for target week
    const createdShifts: Shift[] = [];

    for (const shift of sourceShifts) {
      if (shift.status === 'cancelled' && !includeCancelled) {
        continue;
      }

      const startTime = new Date(shift.start_time_tz);
      const endTime = new Date(shift.end_time_tz);

      startTime.setDate(startTime.getDate() + dayDiff);
      endTime.setDate(endTime.getDate() + dayDiff);

      const newShift = await this.createShift({
        employeeId: shift.employee_id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: shift.location,
        notes: shift.notes ?? undefined,
      });

      createdShifts.push(newShift);
    }

    return createdShifts;
  }

  /**
   * List all shifts with filters
   */
  async listShifts(filters: {
    employeeId?: string;
    status?: ShiftStatus;
    location?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ shifts: ShiftWithEmployee[]; total: number }> {
    const { employeeId, status, location, startDate, endDate, limit = 50, offset = 0 } = filters;

    let query = this.supabase
      .from('shifts')
      .select(`
        *,
        employee:employees (
          id,
          employee_code,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })
      .order('start_time_tz', { ascending: true })
      .range(offset, offset + limit - 1);

    if (employeeId) query = query.eq('employee_id', employeeId);
    if (status) query = query.eq('status', status);
    if (location) query = query.eq('location', location);
    if (startDate) {
      const startOfDay = `${startDate}T00:00:00+08:00`;
      query = query.gte('start_time_tz', startOfDay);
    }
    if (endDate) {
      const endOfDay = `${endDate}T23:59:59+08:00`;
      query = query.lte('start_time_tz', endOfDay);
    }

    const { data, error, count } = await query;

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to list shifts',
        { error: error.message, filters }
      );
    }

    return {
      shifts: data ?? [],
      total: count ?? 0,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createShiftService(
  supabaseUrl: string,
  supabaseKey: string
): ShiftService {
  return new ShiftService(supabaseUrl, supabaseKey);
}
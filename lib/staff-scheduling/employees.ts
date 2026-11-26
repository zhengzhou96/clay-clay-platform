/**
 * Staff Scheduling - Employee Management
 * Handles CRUD operations for employees and wage rate management
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StaffSchedulingErrorCode,
  createError,
} from './errors';

// ============================================================================
// TYPES
// ============================================================================

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  department: string | null;
  hire_date: string; // ISO date string
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInsert {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  position: string;
  department?: string | null;
  hire_date: string;
  status?: EmployeeStatus;
}

export interface EmployeeUpdate {
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  position?: string;
  department?: string | null;
  hire_date?: string;
  status?: EmployeeStatus;
}

export interface WageRate {
  id: string;
  employee_id: string;
  rate_cents: number;
  effective_date: string; // ISO date string
  created_at: string;
}

export interface WageRateInsert {
  employee_id: string;
  rate_cents: number;
  effective_date: string;
}

export interface EmployeeWithWageRate extends Employee {
  current_wage_rate: WageRate | null;
}

export interface ListEmployeesOptions {
  status?: EmployeeStatus;
  department?: string;
  limit?: number;
  offset?: number;
}

export interface ListEmployeesResult {
  employees: Employee[];
  total: number;
}

// ============================================================================
// EMPLOYEE SERVICE CLASS
// ============================================================================

export class EmployeeService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // EMPLOYEE CRUD
  // ============================================================================

  /**
   * Create a new employee
   */
  async createEmployee(data: EmployeeInsert): Promise<Employee> {
    // Check if employee_code already exists
    const { data: existing } = await this.supabase
      .from('employees')
      .select('id')
      .eq('employee_code', data.employee_code)
      .single();

    if (existing) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_ALREADY_EXISTS,
        `Employee code "${data.employee_code}" already exists`,
        { employee_code: data.employee_code }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await this.supabase
      .from('employees')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existingEmail) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_ALREADY_EXISTS,
        `Email "${data.email}" already exists`,
        { email: data.email }
      );
    }

    const { data: employee, error } = await this.supabase
      .from('employees')
      .insert({
        ...data,
        status: data.status ?? 'active',
      })
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to create employee',
        { error: error.message, details: data }
      );
    }

    return employee;
  }

  /**
   * Get employee by ID
   */
  async getEmployee(id: string): Promise<Employee | null> {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get employee',
        { error: error.message, id }
      );
    }

    return data;
  }

  /**
   * Get employee by employee code
   */
  async getEmployeeByCode(employeeCode: string): Promise<Employee | null> {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('employee_code', employeeCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get employee by code',
        { error: error.message, employeeCode }
      );
    }

    return data;
  }

  /**
   * Update employee
   */
  async updateEmployee(id: string, data: EmployeeUpdate): Promise<Employee> {
    // Check if employee exists
    const existing = await this.getEmployee(id);
    if (!existing) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { id }
      );
    }

    // Check for duplicate employee_code if being updated
    if (data.employee_code && data.employee_code !== existing.employee_code) {
      const { data: duplicate } = await this.supabase
        .from('employees')
        .select('id')
        .eq('employee_code', data.employee_code)
        .neq('id', id)
        .single();

      if (duplicate) {
        throw createError(
          StaffSchedulingErrorCode.EMPLOYEE_ALREADY_EXISTS,
          `Employee code "${data.employee_code}" already exists`,
          { employee_code: data.employee_code }
        );
      }
    }

    // Check for duplicate email if being updated
    if (data.email && data.email !== existing.email) {
      const { data: duplicate } = await this.supabase
        .from('employees')
        .select('id')
        .eq('email', data.email)
        .neq('id', id)
        .single();

      if (duplicate) {
        throw createError(
          StaffSchedulingErrorCode.EMPLOYEE_ALREADY_EXISTS,
          `Email "${data.email}" already exists`,
          { email: data.email }
        );
      }
    }

    const { data: employee, error } = await this.supabase
      .from('employees')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to update employee',
        { error: error.message, id, data }
      );
    }

    return employee;
  }

  /**
   * Deactivate employee (soft delete - set status to inactive)
   */
  async deactivateEmployee(id: string): Promise<Employee> {
    const existing = await this.getEmployee(id);
    if (!existing) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { id }
      );
    }

    if (existing.status === 'inactive') {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_INACTIVE,
        'Employee is already inactive',
        { id }
      );
    }

    return this.updateEmployee(id, { status: 'inactive' });
  }

  /**
   * List employees with filtering and pagination
   */
  async listEmployees(options: ListEmployeesOptions = {}): Promise<ListEmployeesResult> {
    const { status, department, limit = 50, offset = 0 } = options;

    let query = this.supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (department) {
      query = query.eq('department', department);
    }

    const { data, error, count } = await query;

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to list employees',
        { error: error.message, options }
      );
    }

    return {
      employees: data ?? [],
      total: count ?? 0,
    };
  }

  // ============================================================================
  // WAGE RATE MANAGEMENT
  // ============================================================================

  /**
   * Set wage rate for an employee (creates new historical record)
   */
  async setWageRate(
    employeeId: string,
    rateCents: number,
    effectiveDate: string
  ): Promise<WageRate> {
    // Validate employee exists
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    // Validate rate
    if (rateCents < 0) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_WAGE_RATE,
        'Wage rate cannot be negative',
        { rateCents }
      );
    }

    // Validate effective date format
    const date = new Date(effectiveDate);
    if (isNaN(date.getTime())) {
      throw createError(
        StaffSchedulingErrorCode.INVALID_WAGE_RATE,
        'Invalid effective date format',
        { effectiveDate }
      );
    }

    // Check if there's already a wage rate for this exact date
    const { data: existing } = await this.supabase
      .from('employee_wage_rates')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('effective_date', effectiveDate)
      .single();

    if (existing) {
      // Update existing rate
      const { data: updated, error } = await this.supabase
        .from('employee_wage_rates')
        .update({ rate_cents: rateCents })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw createError(
          StaffSchedulingErrorCode.DATABASE_ERROR,
          'Failed to update wage rate',
          { error: error.message, employeeId, rateCents, effectiveDate }
        );
      }

      return updated;
    }

    // Insert new wage rate
    const { data: wageRate, error } = await this.supabase
      .from('employee_wage_rates')
      .insert({
        employee_id: employeeId,
        rate_cents: rateCents,
        effective_date: effectiveDate,
      })
      .select()
      .single();

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to create wage rate',
        { error: error.message, employeeId, rateCents, effectiveDate }
      );
    }

    return wageRate;
  }

  /**
   * Get wage rate for an employee at a specific date (historical lookup)
   * Returns the most recent rate on or before the given date
   */
  async getWageRateAtDate(
    employeeId: string,
    date: string
  ): Promise<WageRate | null> {
    // Validate employee exists
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    const { data, error } = await this.supabase
      .from('employee_wage_rates')
      .select('*')
      .eq('employee_id', employeeId)
      .lte('effective_date', date)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No wage rate found
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
   * Get current wage rate for an employee
   */
  async getCurrentWageRate(employeeId: string): Promise<WageRate | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getWageRateAtDate(employeeId, today);
  }

  /**
   * Get all wage rates for an employee (historical)
   */
  async getWageHistory(employeeId: string): Promise<WageRate[]> {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    const { data, error } = await this.supabase
      .from('employee_wage_rates')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: false });

    if (error) {
      throw createError(
        StaffSchedulingErrorCode.DATABASE_ERROR,
        'Failed to get wage history',
        { error: error.message, employeeId }
      );
    }

    return data ?? [];
  }

  /**
   * Get employee with current wage rate
   */
  async getEmployeeWithWageRate(id: string): Promise<EmployeeWithWageRate | null> {
    const employee = await this.getEmployee(id);
    if (!employee) {
      return null;
    }

    const currentWageRate = await this.getCurrentWageRate(id);

    return {
      ...employee,
      current_wage_rate: currentWageRate,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createEmployeeService(
  supabaseUrl: string,
  supabaseKey: string
): EmployeeService {
  return new EmployeeService(supabaseUrl, supabaseKey);
}
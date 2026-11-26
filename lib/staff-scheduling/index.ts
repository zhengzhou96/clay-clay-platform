/**
 * Clay Clay Staff Scheduling - Main Entry Point
 * Unified API for staff scheduling operations
 */

// Re-export all types
export * from './employees';
export * from './shifts';
export * from './attendance';
export * from './wages';
export * from './export';
export * from './errors';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmployeeService } from './employees';
import { ShiftService } from './shifts';
import { AttendanceService } from './attendance';
import { WageService } from './wages';
import { ExportService } from './export';

export interface StaffSchedulingServices {
  employees: EmployeeService;
  shifts: ShiftService;
  attendance: AttendanceService;
  wages: WageService;
  export: ExportService;
  supabase: SupabaseClient;
}

/**
 * Create all staff scheduling services with a single Supabase client
 */
export function createStaffSchedulingServices(
  supabaseUrl: string,
  supabaseKey: string
): StaffSchedulingServices {
  return {
    employees: new EmployeeService(supabaseUrl, supabaseKey),
    shifts: new ShiftService(supabaseUrl, supabaseKey),
    attendance: new AttendanceService(supabaseUrl, supabaseKey),
    wages: new WageService(supabaseUrl, supabaseKey),
    export: new ExportService(supabaseUrl, supabaseKey),
    supabase: createClient(supabaseUrl, supabaseKey),
  };
}

/**
 * Create staff scheduling services from an existing Supabase client
 */
export function createStaffSchedulingServicesFromClient(
  _supabase: SupabaseClient
): StaffSchedulingServices {
  // Note: This requires the services to accept SupabaseClient directly
  // For now, we extract the URL and key from the client
  // In practice, you'd pass the client to each service constructor
  throw new Error('Not implemented - use createStaffSchedulingServices with URL and key');
}

// ============================================================================
// DATABASE SCHEMA REFERENCE (for migration creation)
// ============================================================================

/**
 * Required database tables for staff scheduling:
 *
 * -- Employees table
 * CREATE TABLE employees (
 *     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *     employee_code TEXT NOT NULL UNIQUE,
 *     first_name TEXT NOT NULL,
 *     last_name TEXT NOT NULL,
 *     email TEXT NOT NULL UNIQUE,
 *     phone TEXT,
 *     position TEXT NOT NULL,
 *     department TEXT,
 *     hire_date DATE NOT NULL,
 *     status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Employee wage rates (historical)
 * CREATE TABLE employee_wage_rates (
 *     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *     employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
 *     rate_cents INTEGER NOT NULL CHECK (rate_cents >= 0),
 *     effective_date DATE NOT NULL,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     UNIQUE(employee_id, effective_date)
 * );
 *
 * -- Shifts table
 * CREATE TABLE shifts (
 *     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *     employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
 *     start_time_tz TIMESTAMPTZ NOT NULL,
 *     end_time_tz TIMESTAMPTZ NOT NULL,
 *     location TEXT NOT NULL,
 *     status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
 *     notes TEXT,
 *     published_at TIMESTAMPTZ,
 *     created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     CONSTRAINT shifts_end_after_start CHECK (end_time_tz > start_time_tz)
 * );
 *
 * -- Attendance table
 * CREATE TABLE attendance (
 *     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *     employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
 *     shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
 *     clock_in_tz TIMESTAMPTZ NOT NULL,
 *     clock_out_tz TIMESTAMPTZ,
 *     duration_minutes INTEGER,
 *     wage_cents INTEGER,
 *     status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'corrected')),
 *     correction_reason TEXT,
 *     corrected_by UUID REFERENCES employees(id) ON DELETE SET NULL,
 *     corrected_at TIMESTAMPTZ,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Indexes for performance
 * CREATE INDEX idx_employees_status ON employees(status) WHERE status = 'active';
 * CREATE INDEX idx_employees_code ON employees(employee_code);
 * CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, start_time_tz);
 * CREATE INDEX idx_shifts_status ON shifts(status) WHERE status = 'published';
 * CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, clock_in_tz);
 * CREATE INDEX idx_attendance_status ON attendance(status) WHERE status = 'active';
 * CREATE INDEX idx_wage_rates_employee_date ON employee_wage_rates(employee_id, effective_date);
 *
 * -- Updated_at triggers
 * CREATE TRIGGER update_employees_updated_at
 *     BEFORE UPDATE ON employees
 *     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 * CREATE TRIGGER update_shifts_updated_at
 *     BEFORE UPDATE ON shifts
 *     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 * CREATE TRIGGER update_attendance_updated_at
 *     BEFORE UPDATE ON attendance
 *     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 */
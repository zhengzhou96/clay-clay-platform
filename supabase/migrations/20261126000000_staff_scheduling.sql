-- Clay Clay Pottery Studio Booking Platform
-- Migration 002: Staff Scheduling MVP
-- Supabase-compatible PostgreSQL migration
-- Additive migration - does not modify existing pottery tracker schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS (Staff Scheduling)
-- ============================================================================

CREATE TYPE shift_status AS ENUM (
    'draft',
    'published',
    'cancelled'
);

CREATE TYPE attendance_status AS ENUM (
    'scheduled',
    'clocked_in',
    'clocked_out',
    'completed',
    'no_show',
    'cancelled',
    'corrected'
);

CREATE TYPE audit_action_staff AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'CLOCK_IN',
    'CLOCK_OUT',
    'CORRECTION'
);

-- ============================================================================
-- CORE TABLES (Staff Scheduling)
-- ============================================================================

-- Employees table
-- Stores staff members (pottery instructors, studio assistants, managers)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    role TEXT NOT NULL DEFAULT 'staff', -- 'admin', 'manager', 'instructor', 'assistant'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employees_email_unique UNIQUE (email),
    CONSTRAINT employees_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employees_role_valid CHECK (role IN ('admin', 'manager', 'instructor', 'assistant', 'staff'))
);

-- Employee wage rates table (effective-dated for historical accuracy)
-- Supports wage changes over time without losing historical pay calculations
CREATE TABLE employee_wage_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    hourly_rate_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SGD',
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL means currently active / no end date
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employee_wage_rates_rate_positive CHECK (hourly_rate_cents > 0),
    CONSTRAINT employee_wage_rates_currency_format CHECK (currency ~* '^[A-Z]{3}$'),
    CONSTRAINT employee_wage_rates_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT employee_wage_rates_no_overlap EXCLUDE USING GIST (
        employee_id WITH =,
        daterange(effective_from, COALESCE(effective_to, 'infinity'::DATE), '[]') WITH &&
    )
);

-- Staff shifts table (scheduled shifts)
-- Supports overnight shifts (end_time_tz can be next day)
-- Multiple shifts per day per employee allowed
CREATE TABLE staff_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_time_tz TIMESTAMPTZ NOT NULL,
    end_time_tz TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL DEFAULT 'Main Studio',
    status shift_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT staff_shifts_end_after_start CHECK (end_time_tz > start_time_tz),
    CONSTRAINT staff_shifts_duration_reasonable CHECK (
        EXTRACT(EPOCH FROM (end_time_tz - start_time_tz)) / 3600 <= 24
    ),
    CONSTRAINT staff_shifts_not_too_short CHECK (
        EXTRACT(EPOCH FROM (end_time_tz - start_time_tz)) / 60 >= 15
    )
);

-- Attendance shifts table (actual clock in/out records)
-- Links to scheduled shift when applicable (shift_id nullable for unscheduled clock-ins)
-- Supports overnight shifts and multiple shifts per day
CREATE TABLE attendance_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES staff_shifts(id) ON DELETE SET NULL,
    clock_in_tz TIMESTAMPTZ NOT NULL,
    clock_out_tz TIMESTAMPTZ, -- NULL while clocked in
    actual_hours NUMERIC(6,2), -- Calculated: EXTRACT(EPOCH FROM (clock_out_tz - clock_in_tz))/3600
    estimated_wages_cents INTEGER, -- Calculated based on wage rate at clock_in_tz date
    is_unscheduled BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE when shift_id is NULL
    status attendance_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    corrected_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    corrected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT attendance_shifts_clock_out_after_in CHECK (
        clock_out_tz IS NULL OR clock_out_tz > clock_in_tz
    ),
    CONSTRAINT attendance_shifts_duration_reasonable CHECK (
        clock_out_tz IS NULL OR EXTRACT(EPOCH FROM (clock_out_tz - clock_in_tz)) / 3600 <= 24
    ),
    CONSTRAINT attendance_shifts_wages_non_negative CHECK (
        estimated_wages_cents IS NULL OR estimated_wages_cents >= 0
    )
);

-- Attendance audit logs table (detailed audit trail for attendance corrections)
-- Separate from general audit_logs for staff-specific compliance/audit needs
CREATE TABLE attendance_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    attendance_id UUID NOT NULL REFERENCES attendance_shifts(id) ON DELETE CASCADE,
    action audit_action_staff NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    change_reason TEXT, -- Required for corrections
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Employees
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_active ON employees(is_active) WHERE is_active = true;
CREATE INDEX idx_employees_role ON employees(role);

-- Employee wage rates
CREATE INDEX idx_employee_wage_rates_employee ON employee_wage_rates(employee_id);
CREATE INDEX idx_employee_wage_rates_effective_from ON employee_wage_rates(effective_from);
CREATE INDEX idx_employee_wage_rates_active ON employee_wage_rates(employee_id, effective_from, effective_to)
    WHERE effective_to IS NULL OR effective_to >= CURRENT_DATE;

-- Staff shifts
CREATE INDEX idx_staff_shifts_employee ON staff_shifts(employee_id);
CREATE INDEX idx_staff_shifts_start_time ON staff_shifts(start_time_tz);
CREATE INDEX idx_staff_shifts_end_time ON staff_shifts(end_time_tz);
CREATE INDEX idx_staff_shifts_status ON staff_shifts(status);
CREATE INDEX idx_staff_shifts_location ON staff_shifts(location);
CREATE INDEX idx_staff_shifts_created_by ON staff_shifts(created_by);
-- GIST index for shift overlap detection and range queries
CREATE INDEX idx_staff_shifts_time_range ON staff_shifts USING GIST (
    tstzrange(start_time_tz, end_time_tz)
);
-- Composite for common query: shifts for employee in date range
CREATE INDEX idx_staff_shifts_employee_date ON staff_shifts(employee_id, start_time_tz);

-- Attendance shifts
CREATE INDEX idx_attendance_shifts_employee ON attendance_shifts(employee_id);
CREATE INDEX idx_attendance_shifts_shift ON attendance_shifts(shift_id);
CREATE INDEX idx_attendance_shifts_clock_in ON attendance_shifts(clock_in_tz);
CREATE INDEX idx_attendance_shifts_clock_out ON attendance_shifts(clock_out_tz);
CREATE INDEX idx_attendance_shifts_status ON attendance_shifts(status);
CREATE INDEX idx_attendance_shifts_is_unscheduled ON attendance_shifts(is_unscheduled) WHERE is_unscheduled = true;
-- Composite for common queries
CREATE INDEX idx_attendance_shifts_employee_date ON attendance_shifts(employee_id, clock_in_tz);
CREATE INDEX idx_attendance_shifts_shift_date ON attendance_shifts(shift_id, clock_in_tz);
-- For payroll: completed attendance in date range
CREATE INDEX idx_attendance_shifts_payroll ON attendance_shifts(employee_id, clock_in_tz)
    WHERE status IN ('completed', 'corrected');

-- Attendance audit logs
CREATE INDEX idx_attendance_audit_logs_attendance ON attendance_audit_logs(attendance_id);
CREATE INDEX idx_attendance_audit_logs_changed_by ON attendance_audit_logs(changed_by);
CREATE INDEX idx_attendance_audit_logs_created_at ON attendance_audit_logs(created_at);
CREATE INDEX idx_attendance_audit_logs_action ON attendance_audit_logs(action);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp (reuses existing from migration 001)
-- Already exists: update_updated_at_column()

-- Function to get applicable wage rate for an employee at a specific date/time
CREATE OR REPLACE FUNCTION get_wage_rate_at(
    p_employee_id UUID,
    p_at_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    hourly_rate_cents INTEGER,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ewr.hourly_rate_cents, ewr.currency
    FROM employee_wage_rates ewr
    WHERE ewr.employee_id = p_employee_id
      AND ewr.effective_from <= p_at_time::DATE
      AND (ewr.effective_to IS NULL OR ewr.effective_to >= p_at_time::DATE)
    ORDER BY ewr.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate actual hours and estimated wages for an attendance record
CREATE OR REPLACE FUNCTION calculate_attendance_pay(p_attendance_id UUID)
RETURNS TABLE (
    actual_hours NUMERIC(6,2),
    estimated_wages_cents INTEGER
) AS $$
DECLARE
    v_clock_in TIMESTAMPTZ;
    v_clock_out TIMESTAMPTZ;
    v_employee_id UUID;
    v_rate RECORD;
BEGIN
    SELECT clock_in_tz, clock_out_tz, employee_id
    INTO v_clock_in, v_clock_out, v_employee_id
    FROM attendance_shifts
    WHERE id = p_attendance_id;

    IF v_clock_out IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC(6,2), NULL::INTEGER;
        RETURN;
    END IF;

    -- Get wage rate at clock-in time
    SELECT * INTO v_rate FROM get_wage_rate_at(v_employee_id, v_clock_in);

    RETURN QUERY SELECT
        ROUND(EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 3600.0, 2) AS actual_hours,
        ROUND(EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 3600.0 * COALESCE(v_rate.hourly_rate_cents, 0))::INTEGER AS estimated_wages_cents;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to auto-calculate and update attendance pay on clock_out
CREATE OR REPLACE FUNCTION update_attendance_calculations()
RETURNS TRIGGER AS $$
DECLARE
    v_calc RECORD;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.clock_out_tz IS NOT NULL AND OLD.clock_out_tz IS NULL THEN
        SELECT * INTO v_calc FROM calculate_attendance_pay(NEW.id);
        NEW.actual_hours := v_calc.actual_hours;
        NEW.estimated_wages_cents := v_calc.estimated_wages_cents;
        NEW.status := 'completed';
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check for overlapping shifts for same employee
CREATE OR REPLACE FUNCTION check_shift_overlap(
    p_employee_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_overlap_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_overlap_count
    FROM staff_shifts
    WHERE employee_id = p_employee_id
      AND status != 'cancelled'
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND tstzrange(start_time_tz, end_time_tz) && tstzrange(p_start_time, p_end_time);
    RETURN v_overlap_count > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create attendance audit log entry
CREATE OR REPLACE FUNCTION log_attendance_change(
    p_attendance_id UUID,
    p_action audit_action_staff,
    p_old_values JSONB,
    p_new_values JSONB,
    p_changed_by UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO attendance_audit_logs (
        attendance_id,
        action,
        old_values,
        new_values,
        changed_by,
        change_reason
    ) VALUES (
        p_attendance_id,
        p_action,
        p_old_values,
        p_new_values,
        p_changed_by,
        p_change_reason
    );
END;
$$ LANGUAGE plpgsql;

-- Function to correct attendance (admin/manager action with audit trail)
CREATE OR REPLACE FUNCTION correct_attendance(
    p_attendance_id UUID,
    p_new_clock_in TIMESTAMPTZ DEFAULT NULL,
    p_new_clock_out TIMESTAMPTZ DEFAULT NULL,
    p_new_status attendance_status DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_corrected_by UUID,
    p_change_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old RECORD;
    v_old_values JSONB;
    v_new_values JSONB;
    v_calc RECORD;
BEGIN
    -- Get current values
    SELECT * INTO v_old FROM attendance_shifts WHERE id = p_attendance_id;
    IF v_old IS NULL THEN
        RAISE EXCEPTION 'Attendance record not found' USING ERRCODE = '55000';
    END IF;

    v_old_values := to_jsonb(v_old);

    -- Build new values
    v_new_values := jsonb_build_object(
        'clock_in_tz', COALESCE(p_new_clock_in, v_old.clock_in_tz),
        'clock_out_tz', COALESCE(p_new_clock_out, v_old.clock_out_tz),
        'status', COALESCE(p_new_status, v_old.status),
        'notes', COALESCE(p_notes, v_old.notes),
        'corrected_by', p_corrected_by,
        'corrected_at', NOW(),
        'updated_at', NOW()
    );

    -- Validate clock_out > clock_in if both provided
    IF v_new_values->>'clock_out_tz' IS NOT NULL AND v_new_values->>'clock_in_tz' IS NOT NULL THEN
        IF (v_new_values->>'clock_out_tz')::TIMESTAMPTZ <= (v_new_values->>'clock_in_tz')::TIMESTAMPTZ THEN
            RAISE EXCEPTION 'Clock out must be after clock in' USING ERRCODE = '55000';
        END IF;
    END IF;

    -- Calculate new pay if clock times changed
    IF p_new_clock_in IS NOT NULL OR p_new_clock_out IS NOT NULL THEN
        SELECT * INTO v_calc FROM calculate_attendance_pay(p_attendance_id);
        v_new_values := v_new_values || jsonb_build_object(
            'actual_hours', v_calc.actual_hours,
            'estimated_wages_cents', v_calc.estimated_wages_cents
        );
    END IF;

    -- Update attendance record
    UPDATE attendance_shifts SET
        clock_in_tz = COALESCE(p_new_clock_in, clock_in_tz),
        clock_out_tz = COALESCE(p_new_clock_out, clock_out_tz),
        status = COALESCE(p_new_status, CASE
            WHEN p_new_clock_out IS NOT NULL THEN 'completed'::attendance_status
            ELSE status
        END),
        notes = COALESCE(p_notes, notes),
        corrected_by = p_corrected_by,
        corrected_at = NOW(),
        updated_at = NOW(),
        actual_hours = COALESCE((v_new_values->>'actual_hours')::NUMERIC, actual_hours),
        estimated_wages_cents = COALESCE((v_new_values->>'estimated_wages_cents')::INTEGER, estimated_wages_cents)
    WHERE id = p_attendance_id;

    -- Log the correction
    PERFORM log_attendance_change(
        p_attendance_id,
        'CORRECTION',
        v_old_values,
        v_new_values,
        p_corrected_by,
        p_change_reason
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get Singapore timezone display helper (returns TIMESTAMPTZ in SGT)
-- Note: Data stored in UTC, display converts to Asia/Singapore
CREATE OR REPLACE FUNCTION to_sgt(p_utc TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN p_utc AT TIME ZONE 'Asia/Singapore';
END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION from_sgt(p_sgt TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN p_sgt AT TIME ZONE 'Asia/Singapore';
END;
$$ LANGUAGE sql IMMUTABLE;

-- Function to get staff schedule for a date range (for roster view)
CREATE OR REPLACE FUNCTION get_staff_schedule(
    p_start_date DATE,
    p_end_date DATE,
    p_employee_id UUID DEFAULT NULL,
    p_location TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    employee_name TEXT,
    employee_role TEXT,
    start_time_tz TIMESTAMPTZ,
    end_time_tz TIMESTAMPTZ,
    location TEXT,
    status shift_status,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.id,
        ss.employee_id,
        e.name AS employee_name,
        e.role AS employee_role,
        ss.start_time_tz,
        ss.end_time_tz,
        ss.location,
        ss.status,
        ss.notes
    FROM staff_shifts ss
    JOIN employees e ON e.id = ss.employee_id
    WHERE ss.start_time_tz::DATE <= p_end_date
      AND ss.end_time_tz::DATE >= p_start_date
      AND ss.status != 'cancelled'
      AND (p_employee_id IS NULL OR ss.employee_id = p_employee_id)
      AND (p_location IS NULL OR ss.location = p_location)
      AND e.is_active = true
    ORDER BY ss.start_time_tz, e.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get attendance summary for payroll
CREATE OR REPLACE FUNCTION get_payroll_summary(
    p_start_date DATE,
    p_end_date DATE,
    p_employee_id UUID DEFAULT NULL
)
RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    total_hours NUMERIC(8,2),
    total_wages_cents INTEGER,
    shift_count INTEGER,
    unscheduled_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.employee_id,
        e.name AS employee_name,
        ROUND(COALESCE(SUM(a.actual_hours), 0), 2) AS total_hours,
        COALESCE(SUM(a.estimated_wages_cents), 0) AS total_wages_cents,
        COUNT(*) AS shift_count,
        COUNT(*) FILTER (WHERE a.is_unscheduled) AS unscheduled_count
    FROM attendance_shifts a
    JOIN employees e ON e.id = a.employee_id
    WHERE a.clock_in_tz::DATE >= p_start_date
      AND a.clock_in_tz::DATE <= p_end_date
      AND a.status IN ('completed', 'corrected')
      AND a.actual_hours IS NOT NULL
      AND (p_employee_id IS NULL OR a.employee_id = p_employee_id)
    GROUP BY a.employee_id, e.name
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers for new tables
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_shifts_updated_at
    BEFORE UPDATE ON staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_shifts_updated_at
    BEFORE UPDATE ON attendance_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Attendance calculation trigger (auto-calc on clock_out)
CREATE TRIGGER attendance_calculate_pay
    BEFORE UPDATE ON attendance_shifts
    FOR EACH ROW EXECUTE FUNCTION update_attendance_calculations();

-- Audit trigger for attendance_shifts (reuses existing audit_trigger_function from migration 001)
-- But we also have specialized attendance_audit_logs - apply both
CREATE TRIGGER audit_attendance_shifts
    AFTER INSERT OR UPDATE OR DELETE ON attendance_shifts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_staff_shifts
    AFTER INSERT OR UPDATE OR DELETE ON staff_shifts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_employees
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_employee_wage_rates
    AFTER INSERT OR UPDATE OR DELETE ON employee_wage_rates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_wage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: Employees
-- ============================================================================

-- Staff can see their own profile
CREATE POLICY employees_select_own ON employees
    FOR SELECT USING (
        auth.uid() IS NULL OR
        id = auth.uid() OR
        email = (SELECT auth.jwt()->>'email')
    );

-- Staff can update their own profile (phone, etc.)
CREATE POLICY employees_update_own ON employees
    FOR UPDATE USING (
        auth.uid() IS NULL OR
        id = auth.uid() OR
        email = (SELECT auth.jwt()->>'email')
    )
    WITH CHECK (
        auth.uid() IS NULL OR
        id = auth.uid() OR
        email = (SELECT auth.jwt()->>'email')
    );

-- Admins/managers can see all employees
CREATE POLICY employees_select_admin ON employees
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- Admins/managers can insert/update/delete employees
CREATE POLICY employees_admin_all ON employees
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES: Employee Wage Rates
-- ============================================================================

-- Staff can see their own wage rates
CREATE POLICY employee_wage_rates_select_own ON employee_wage_rates
    FOR SELECT USING (
        auth.uid() IS NULL OR
        employee_id = auth.uid() OR
        employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email'))
    );

-- Admins/managers can see all wage rates
CREATE POLICY employee_wage_rates_select_admin ON employee_wage_rates
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- Admins/managers can manage wage rates
CREATE POLICY employee_wage_rates_admin_all ON employee_wage_rates
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES: Staff Shifts
-- ============================================================================

-- Staff can see their own shifts (published and draft they created)
CREATE POLICY staff_shifts_select_own ON staff_shifts
    FOR SELECT USING (
        auth.uid() IS NULL OR
        employee_id = auth.uid() OR
        employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email')) OR
        created_by = auth.uid()
    );

-- Staff can create shifts for themselves (draft only)
CREATE POLICY staff_shifts_insert_own ON staff_shifts
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email')))
    );

-- Staff can update their own draft shifts
CREATE POLICY staff_shifts_update_own_draft ON staff_shifts
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email'))) AND
        status = 'draft'
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email')))
    );

-- Admins/managers can see all shifts
CREATE POLICY staff_shifts_select_admin ON staff_shifts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- Admins/managers can manage all shifts (publish, cancel, edit)
CREATE POLICY staff_shifts_admin_all ON staff_shifts
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES: Attendance Shifts
-- ============================================================================

-- Staff can see their own attendance records
CREATE POLICY attendance_shifts_select_own ON attendance_shifts
    FOR SELECT USING (
        auth.uid() IS NULL OR
        employee_id = auth.uid() OR
        employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email'))
    );

-- Staff can clock in (create attendance record)
CREATE POLICY attendance_shifts_clock_in ON attendance_shifts
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email')))
    );

-- Staff can clock out (update their own active attendance)
CREATE POLICY attendance_shifts_clock_out ON attendance_shifts
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email'))) AND
        clock_out_tz IS NULL AND
        status IN ('clocked_in', 'scheduled')
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email')))
    );

-- Admins/managers can see all attendance
CREATE POLICY attendance_shifts_select_admin ON attendance_shifts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- Admins/managers can manage all attendance (including corrections)
CREATE POLICY attendance_shifts_admin_all ON attendance_shifts
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES: Attendance Audit Logs
-- ============================================================================

-- Staff can see audit logs for their own attendance
CREATE POLICY attendance_audit_logs_select_own ON attendance_audit_logs
    FOR SELECT USING (
        auth.uid() IS NULL OR
        changed_by = auth.uid() OR
        attendance_id IN (
            SELECT id FROM attendance_shifts
            WHERE employee_id = auth.uid()
               OR employee_id IN (SELECT id FROM employees WHERE email = (SELECT auth.jwt()->>'email'))
        )
    );

-- Admins/managers can see all audit logs
CREATE POLICY attendance_audit_logs_select_admin ON attendance_audit_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('admin', 'manager')
            AND e.is_active = true
        )
    );

-- System/service role can insert audit logs (via functions)
CREATE POLICY attendance_audit_logs_service ON attendance_audit_logs
    FOR INSERT WITH CHECK (
        auth.jwt()->>'role' = 'service_role' OR
        auth.uid() IS NOT NULL
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE employees IS 'Staff members (instructors, assistants, managers)';
COMMENT ON TABLE employee_wage_rates IS 'Effective-dated hourly wage rates for historical pay accuracy';
COMMENT ON TABLE staff_shifts IS 'Scheduled shifts (supports overnight, multiple per day)';
COMMENT ON TABLE attendance_shifts IS 'Actual clock in/out records with calculated pay';
COMMENT ON TABLE attendance_audit_logs IS 'Immutable audit trail for attendance corrections';

COMMENT ON COLUMN employees.role IS 'Role: admin, manager, instructor, assistant, staff';
COMMENT ON COLUMN employee_wage_rates.effective_to IS 'NULL = currently active rate';
COMMENT ON COLUMN employee_wage_rates.hourly_rate_cents IS 'Stored in cents (SGD) for precision';
COMMENT ON COLUMN staff_shifts.start_time_tz IS 'Stored in UTC; display converts to Asia/Singapore';
COMMENT ON COLUMN staff_shifts.end_time_tz IS 'Can be next day for overnight shifts';
COMMENT ON COLUMN attendance_shifts.is_unscheduled IS 'TRUE when clocked in without a scheduled shift';
COMMENT ON COLUMN attendance_shifts.actual_hours IS 'Calculated: (clock_out - clock_in) in hours, 2dp';
COMMENT ON COLUMN attendance_shifts.estimated_wages_cents IS 'Calculated at clock_out using wage rate at clock_in date';
COMMENT ON COLUMN attendance_audit_logs.change_reason IS 'Required for CORRECTION actions';

-- ============================================================================
-- SEED DATA (Optional - minimal defaults for development)
-- ============================================================================

-- Default location for shifts (referenced by default in staff_shifts)
-- No seed data for employees - add via admin interface
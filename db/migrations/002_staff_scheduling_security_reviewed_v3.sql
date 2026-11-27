-- ============================================================================
-- Clay Clay Pottery Studio - Staff Scheduling MVP
-- Migration 002: Staff Scheduling Schema (SECURITY REVIEWED v3)
-- Supabase project: ispoxdaiahtwzblzawef (Clay Clay Collection Logger)
-- 
-- SECURITY REVIEW: 2026-11-27 v3
-- Addresses all 12 issues from final security audit
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- Required for exclusion constraints

-- ============================================================================
-- ENUMS (idempotent)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE shift_status AS ENUM ('draft', 'published', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'scheduled', 'clocked_in', 'clocked_out', 
        'completed', 'no_show', 'cancelled', 'corrected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_staff AS ENUM (
        'INSERT', 'UPDATE', 'DELETE', 
        'CLOCK_IN', 'CLOCK_OUT', 'CORRECTION'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER with hardened search_path)
-- ISSUE #9: All SECURITY DEFINER functions use SET search_path = pg_catalog, public
-- ISSUE #5: Secure identity mapping via auth.uid() only, not email matching
-- ============================================================================

-- Function to check if current user is admin/manager
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    -- ISSUE #5: Use auth.uid() for secure identity mapping
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Look up role by user ID (not email)
    SELECT e.role INTO v_role
    FROM employees e
    WHERE e.id = v_user_id AND e.is_active = true;  -- ISSUE #5: Verify active status
    
    RETURN v_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql;

-- Function to get current user's employee ID (secure, uid-based)
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS UUID
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id UUID;
    v_employee_id UUID;
BEGIN
    -- ISSUE #5: Use auth.uid() for secure identity mapping
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Look up by ID only (not email)
    SELECT id INTO v_employee_id 
    FROM employees 
    WHERE id = v_user_id AND is_active = true;  -- ISSUE #5: Verify active
    
    RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if current user is active staff
CREATE OR REPLACE FUNCTION is_current_user_active_staff()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id UUID;
    v_is_active BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT is_active INTO v_is_active
    FROM employees
    WHERE id = v_user_id;
    
    RETURN COALESCE(v_is_active, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Employees table: Staff members
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT employees_email_unique UNIQUE (email),
    CONSTRAINT employees_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employees_role_valid CHECK (role IN ('admin', 'manager', 'instructor', 'assistant', 'staff'))
);

-- Employee wage rates: Effective-dated hourly rates
-- ISSUE #1: Use EXCLUDE constraint instead of unique index with GiST
CREATE TABLE IF NOT EXISTS employee_wage_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,  -- ISSUE #6: Don't cascade delete wages
    hourly_rate_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SGD',
    effective_from DATE NOT NULL,
    effective_to DATE,  -- NULL = currently active
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT employee_wage_rates_rate_positive CHECK (hourly_rate_cents > 0),
    CONSTRAINT employee_wage_rates_currency_format CHECK (currency ~* '^[A-Z]{3}$'),
    CONSTRAINT employee_wage_rates_dates_valid CHECK (
        effective_to IS NULL OR effective_to >= effective_from
    ),
    -- ISSUE #1: EXCLUDE constraint prevents overlapping wage periods
    CONSTRAINT employee_wage_rates_no_overlap 
        EXCLUDE USING GIST (
            employee_id WITH =,
            daterange(effective_from, COALESCE(effective_to, 'infinity'::DATE), '[]') WITH &&
        ) WHERE (effective_to IS NULL OR effective_to >= effective_from)
);

-- Staff shifts: Scheduled shifts (admin-managed only)
CREATE TABLE IF NOT EXISTS staff_shifts (
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

-- Attendance shifts: Actual clock in/out records
-- ISSUE #4: Server-authoritative timestamps, no client-supplied values
CREATE TABLE IF NOT EXISTS attendance_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES staff_shifts(id) ON DELETE SET NULL,
    clock_in_tz TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Server timestamp (DEFAULT)
    clock_out_tz TIMESTAMPTZ,  -- Server timestamp when set
    actual_hours NUMERIC(6,2),
    estimated_wages_cents INTEGER,
    is_unscheduled BOOLEAN NOT NULL DEFAULT FALSE,
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
        clock_out_tz IS NULL OR 
        EXTRACT(EPOCH FROM (clock_out_tz - clock_in_tz)) / 3600 <= 24
    ),
    CONSTRAINT attendance_shifts_wages_non_negative CHECK (
        estimated_wages_cents IS NULL OR estimated_wages_cents >= 0
    )
);

-- ISSUE #6: One active session per employee (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_shifts_one_active
    ON attendance_shifts(employee_id)
    WHERE clock_out_tz IS NULL AND status IN ('clocked_in', 'scheduled');

-- Attendance audit logs: Immutable audit trail
-- ISSUE #6: ON DELETE SET NULL so audit survives attendance deletion
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    attendance_id UUID,  -- No FK constraint - allows audit to survive attendance deletion
    action audit_action_staff NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- Employee wage rates
CREATE INDEX IF NOT EXISTS idx_employee_wage_rates_employee ON employee_wage_rates(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_wage_rates_effective_from ON employee_wage_rates(effective_from);
CREATE INDEX IF NOT EXISTS idx_employee_wage_rates_active 
    ON employee_wage_rates(employee_id, effective_from)
    WHERE effective_to IS NULL;

-- Staff shifts
CREATE INDEX IF NOT EXISTS idx_staff_shifts_employee ON staff_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_start_time ON staff_shifts(start_time_tz);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_end_time ON staff_shifts(end_time_tz);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_status ON staff_shifts(status);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_location ON staff_shifts(location);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_created_by ON staff_shifts(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_time_range ON staff_shifts USING GIST (
    tstzrange(start_time_tz, end_time_tz)
);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_employee_date ON staff_shifts(employee_id, start_time_tz);

-- Attendance shifts
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_employee ON attendance_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_shift ON attendance_shifts(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_clock_in ON attendance_shifts(clock_in_tz);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_clock_out ON attendance_shifts(clock_out_tz);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_status ON attendance_shifts(status);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_employee_date 
    ON attendance_shifts(employee_id, clock_in_tz);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_payroll 
    ON attendance_shifts(employee_id, clock_in_tz)
    WHERE status IN ('completed', 'corrected');

-- Attendance audit logs
CREATE INDEX IF NOT EXISTS idx_attendance_audit_logs_attendance 
    ON attendance_audit_logs(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_logs_created_at 
    ON attendance_audit_logs(created_at);

-- ============================================================================
-- TRIGGER FUNCTIONS (self-contained, don't depend on Collection Logger)
-- ISSUE #10: Define our own functions, don't rely on existing Collection Logger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column_fn()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ISSUE #7: Fail safely when no wage rate exists
CREATE OR REPLACE FUNCTION calculate_attendance_pay_fn(p_employee_id UUID, p_clock_in TIMESTAMPTZ, p_clock_out TIMESTAMPTZ)
RETURNS TABLE (
    actual_hours NUMERIC(6,2),
    estimated_wages_cents INTEGER
) AS $$
DECLARE
    v_rate RECORD;
BEGIN
    IF p_clock_out IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC(6,2), NULL::INTEGER;
        RETURN;
    END IF;

    -- ISSUE #7: Get wage rate - will return NULL if none exists
    SELECT * INTO v_rate FROM get_wage_rate_at(p_employee_id, p_clock_in);
    
    -- ISSUE #7: Fail if no wage rate found
    IF v_rate.hourly_rate_cents IS NULL THEN
        RAISE EXCEPTION 'No wage rate found for employee % at time %', p_employee_id, p_clock_in
            USING ERRCODE = '55000',
                  DETAIL = 'Cannot calculate wages without an active wage rate';
    END IF;

    RETURN QUERY SELECT
        ROUND(EXTRACT(EPOCH FROM (p_clock_out - p_clock_in)) / 3600.0, 2) AS actual_hours,
        ROUND(EXTRACT(EPOCH FROM (p_clock_out - p_clock_in)) / 3600.0 * v_rate.hourly_rate_cents)::INTEGER AS estimated_wages_cents;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get applicable wage rate (ISSUE #8: Asia/Singapore timezone, STABLE not IMMUTABLE)
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
      -- ISSUE #8: Use AT TIME ZONE for Singapore date comparison (STABLE, not IMMUTABLE)
      AND ewr.effective_from <= (p_at_time AT TIME ZONE 'Asia/Singapore')::DATE
      AND (ewr.effective_to IS NULL OR ewr.effective_to >= (p_at_time AT TIME ZONE 'Asia/Singapore')::DATE)
    ORDER BY ewr.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;  -- ISSUE #8: STABLE, not IMMUTABLE (timezone conversion)

-- ISSUE #4: BEFORE UPDATE trigger for attendance calculation
CREATE OR REPLACE FUNCTION update_attendance_calculations_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_calc RECORD;
BEGIN
    -- Only calculate when clock_out is newly set
    IF TG_OP = 'UPDATE' AND NEW.clock_out_tz IS NOT NULL AND OLD.clock_out_tz IS NULL THEN
        SELECT * INTO v_calc FROM calculate_attendance_pay_fn(NEW.employee_id, NEW.clock_in_tz, NEW.clock_out_tz);
        NEW.actual_hours := v_calc.actual_hours;
        NEW.estimated_wages_cents := v_calc.estimated_wages_cents;
        NEW.status := 'completed';
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check for overlapping shifts
CREATE OR REPLACE FUNCTION check_shift_overlap_fn(
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

-- Log attendance change
CREATE OR REPLACE FUNCTION log_attendance_change_fn(
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
        attendance_id, action, old_values, new_values, changed_by, change_reason
    ) VALUES (
        p_attendance_id, p_action, p_old_values, p_new_values, p_changed_by, p_change_reason
    );
END;
$$ LANGUAGE plpgsql;

-- ISSUE #3, #5, #9: Secure correction function with hardened SECURITY DEFINER
CREATE OR REPLACE FUNCTION correct_attendance(
    p_attendance_id UUID,
    p_change_reason TEXT,  -- Required first
    p_new_clock_in TIMESTAMPTZ DEFAULT NULL,
    p_new_clock_out TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old RECORD;
    v_old_values JSONB;
    v_new_values JSONB;
    v_calc RECORD;
    v_admin_check BOOLEAN;
    v_my_id UUID;
BEGIN
    -- ISSUE #9: Hardened SECURITY DEFINER with explicit search_path (set in function declaration)
    -- ISSUE #5: Verify admin/manager role via secure uid-based check
    v_admin_check := is_current_user_admin();
    v_my_id := get_current_employee_id();
    
    IF NOT v_admin_check THEN
        RAISE EXCEPTION 'Only admins/managers can correct attendance' USING ERRCODE = '42501';
    END IF;
    
    IF v_my_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated employee record not found' USING ERRCODE = '55000';
    END IF;

    -- Get current values
    SELECT * INTO v_old FROM attendance_shifts WHERE id = p_attendance_id;
    IF v_old IS NULL THEN
        RAISE EXCEPTION 'Attendance record not found' USING ERRCODE = '55000';
    END IF;

    v_old_values := to_jsonb(v_old);

    -- ISSUE #4: Build new values with corrected timestamps
    v_new_values := jsonb_build_object(
        'clock_in_tz', COALESCE(p_new_clock_in, v_old.clock_in_tz),
        'clock_out_tz', COALESCE(p_new_clock_out, v_old.clock_out_tz),
        'notes', COALESCE(p_notes, v_old.notes),
        'corrected_by', v_my_id,
        'corrected_at', NOW(),
        'updated_at', NOW()
    );

    -- Validate clock_out > clock_in
    IF v_new_values->>'clock_out_tz' IS NOT NULL AND v_new_values->>'clock_in_tz' IS NOT NULL THEN
        IF (v_new_values->>'clock_out_tz')::TIMESTAMPTZ <= (v_new_values->>'clock_in_tz')::TIMESTAMPTZ THEN
            RAISE EXCEPTION 'Clock out must be after clock in' USING ERRCODE = '55000';
        END IF;
    END IF;

    -- ISSUE #4: Recalculate pay with NEW timestamps
    IF p_new_clock_in IS NOT NULL OR p_new_clock_out IS NOT NULL THEN
        SELECT * INTO v_calc FROM calculate_attendance_pay_fn(
            v_old.employee_id,
            COALESCE(p_new_clock_in, v_old.clock_in_tz),
            COALESCE(p_new_clock_out, v_old.clock_out_tz)
        );
        v_new_values := v_new_values || jsonb_build_object(
            'actual_hours', v_calc.actual_hours,
            'estimated_wages_cents', v_calc.estimated_wages_cents
        );
    END IF;

    -- Update attendance record
    UPDATE attendance_shifts SET
        clock_in_tz = COALESCE(p_new_clock_in, clock_in_tz),
        clock_out_tz = COALESCE(p_new_clock_out, clock_out_tz),
        status = CASE WHEN p_new_clock_out IS NOT NULL THEN 'completed'::attendance_status ELSE status END,
        notes = COALESCE(p_notes, notes),
        corrected_by = v_my_id,
        corrected_at = NOW(),
        updated_at = NOW(),
        actual_hours = COALESCE((v_new_values->>'actual_hours')::NUMERIC, actual_hours),
        estimated_wages_cents = COALESCE((v_new_values->>'estimated_wages_cents')::INTEGER, estimated_wages_cents)
    WHERE id = p_attendance_id;

    -- Log the correction
    PERFORM log_attendance_change_fn(
        p_attendance_id, 'CORRECTION', v_old_values, v_new_values, v_my_id, p_change_reason
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;  -- ISSUE #9: Hardened search_path

-- ISSUE #3, #5, #9: Secure payroll summary with enforced scoping
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
    shift_count BIGINT,
    unscheduled_count BIGINT
) AS $$
DECLARE
    v_admin_check BOOLEAN;
    v_my_id UUID;
    v_my_role TEXT;
BEGIN
    -- ISSUE #9: Hardened SECURITY DEFINER with explicit search_path
    -- ISSUE #5: Get secure identity via auth.uid()
    v_my_id := get_current_employee_id();
    
    IF v_my_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    
    -- Get role for authorization check
    SELECT role INTO v_my_role FROM employees WHERE id = v_my_id;
    
    v_admin_check := v_my_role IN ('admin', 'manager');
    
    -- ISSUE #3: Enforce scoping INSIDE the function (SECURITY DEFINER context)
    IF NOT v_admin_check THEN
        -- Non-admin: can ONLY view their own summary, regardless of p_employee_id parameter
        p_employee_id := v_my_id;  -- Force scoping to current user
    END IF;
    -- Admins can view all (p_employee_id respected if provided, or NULL for all)

    -- ISSUE #8: Asia/Singapore timezone for date filtering
    RETURN QUERY
    SELECT
        a.employee_id,
        e.name::TEXT AS employee_name,
        ROUND(COALESCE(SUM(a.actual_hours), 0)::NUMERIC, 2) AS total_hours,
        COALESCE(SUM(a.estimated_wages_cents), 0)::INTEGER AS total_wages_cents,
        COUNT(*)::BIGINT AS shift_count,
        COUNT(*) FILTER (WHERE a.is_unscheduled)::BIGINT AS unscheduled_count
    FROM attendance_shifts a
    JOIN employees e ON e.id = a.employee_id
    -- ISSUE #8: Asia/Singapore date filtering
    WHERE (a.clock_in_tz AT TIME ZONE 'Asia/Singapore')::DATE >= p_start_date
      AND (a.clock_in_tz AT TIME ZONE 'Asia/Singapore')::DATE <= p_end_date
      AND a.status IN ('completed', 'corrected')
      AND a.actual_hours IS NOT NULL
      AND a.employee_id = COALESCE(p_employee_id, a.employee_id)  -- Enforced scoping
    GROUP BY a.employee_id, e.name
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;  -- ISSUE #9: Hardened search_path

-- ISSUE #8: Singapore timezone helpers (STABLE, not IMMUTABLE)
CREATE OR REPLACE FUNCTION to_sgt(p_utc TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN p_utc AT TIME ZONE 'Asia/Singapore';
END;
$$ LANGUAGE plpgsql STABLE;  -- ISSUE #8: STABLE, not IMMUTABLE

CREATE OR REPLACE FUNCTION from_sgt(p_sgt TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN p_sgt::TIMESTAMP AT TIME ZONE 'Asia/Singapore';
END;
$$ LANGUAGE plpgsql STABLE;  -- ISSUE #8: STABLE, not IMMUTABLE

-- Staff schedule function
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
DECLARE
    v_my_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_my_id := get_current_employee_id();
    v_is_admin := is_current_user_admin();
    
    -- Authorization check
    IF v_my_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    
    RETURN QUERY
    SELECT
        ss.id, ss.employee_id, e.name, e.role,
        ss.start_time_tz, ss.end_time_tz, ss.location, ss.status, ss.notes
    FROM staff_shifts ss
    JOIN employees e ON e.id = ss.employee_id
    WHERE ss.start_time_tz::DATE <= p_end_date
      AND ss.end_time_tz::DATE >= p_start_date
      AND ss.status != 'cancelled'
      AND e.is_active = true
      -- Authorization: admin sees all, staff sees only own
      AND (v_is_admin OR ss.employee_id = v_my_id)
      AND (p_employee_id IS NULL OR p_employee_id = ss.employee_id)
      AND (p_location IS NULL OR ss.location = p_location)
    ORDER BY ss.start_time_tz, e.name;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_fn();

DROP TRIGGER IF EXISTS update_staff_shifts_updated_at ON staff_shifts;
CREATE TRIGGER update_staff_shifts_updated_at
    BEFORE UPDATE ON staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_fn();

DROP TRIGGER IF EXISTS update_attendance_shifts_updated_at ON attendance_shifts;
CREATE TRIGGER update_attendance_shifts_updated_at
    BEFORE UPDATE ON attendance_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_fn();

-- ISSUE #4: Attendance calculation trigger (BEFORE UPDATE)
DROP TRIGGER IF EXISTS attendance_calculate_pay ON attendance_shifts;
CREATE TRIGGER attendance_calculate_pay
    BEFORE UPDATE ON attendance_shifts
    FOR EACH ROW EXECUTE FUNCTION update_attendance_calculations_fn();

-- ISSUE #3: Prevent staff from changing privileged fields
DROP TRIGGER IF EXISTS employees_prevent_privilege_change ON employees;
CREATE TRIGGER employees_prevent_privilege_change
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION employees_prevent_self_privilege_change_fn();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_wage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: Employees
-- ISSUE #2: No OLD/NEW in policies, no recursive RLS
-- ISSUE #3: Staff cannot modify privileged fields (enforced by trigger)
-- ISSUE #5: Secure identity via auth.uid(), not email
-- ----------------------------------------------------------------------------

-- Staff can view their own profile only
CREATE POLICY employees_select_own ON employees
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        id = get_current_employee_id()
    );

-- Admins can view all employees
CREATE POLICY employees_select_admin ON employees
    FOR SELECT USING (
        is_current_user_admin()
    );

-- ISSUE #3: Staff can update own profile (trigger blocks privileged fields)
CREATE POLICY employees_update_own ON employees
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        id = get_current_employee_id()
    );

-- Admins can manage all employees
CREATE POLICY employees_admin_all ON employees
    FOR ALL USING (
        is_current_user_admin()
    );

-- ISSUE #3: Trigger function to prevent staff from changing privileged fields
CREATE OR REPLACE FUNCTION employees_prevent_self_privilege_change_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_is_own BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    v_is_own := (OLD.id = get_current_employee_id());
    v_is_admin := is_current_user_admin();
    
    -- If updating own record and not admin, block privileged field changes
    IF v_is_own AND NOT v_is_admin THEN
        IF OLD.role != NEW.role THEN
            RAISE EXCEPTION 'Staff cannot change their own role' USING ERRCODE = '42501';
        END IF;
        IF OLD.email != NEW.email THEN
            RAISE EXCEPTION 'Staff cannot change their own email' USING ERRCODE = '42501';
        END IF;
        IF OLD.name != NEW.name THEN
            RAISE EXCEPTION 'Staff cannot change their own name' USING ERRCODE = '42501';
        END IF;
        IF OLD.is_active != NEW.is_active THEN
            RAISE EXCEPTION 'Staff cannot change their own active status' USING ERRCODE = '42501';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RLS: Employee Wage Rates
-- ISSUE #3: Staff can view own wages only, admin manages all
-- ----------------------------------------------------------------------------

-- Staff can view ONLY their own wage rates
CREATE POLICY employee_wage_rates_select_own ON employee_wage_rates
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        employee_id = get_current_employee_id()
    );

-- Admins can view all wage rates
CREATE POLICY employee_wage_rates_select_admin ON employee_wage_rates
    FOR SELECT USING (
        is_current_user_admin()
    );

-- ISSUE #3: Admins ONLY can manage wage rates
CREATE POLICY employee_wage_rates_admin_all ON employee_wage_rates
    FOR ALL USING (
        is_current_user_admin()
    );

-- ----------------------------------------------------------------------------
-- RLS: Staff Shifts
-- ISSUE #2: Remove staff self-update policy
-- ISSUE #3: Only admins can create/manage shifts
-- ----------------------------------------------------------------------------

-- Staff can view their own shifts
CREATE POLICY staff_shifts_select_own ON staff_shifts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        employee_id = get_current_employee_id()
    );

-- Admins can view all shifts
CREATE POLICY staff_shifts_select_admin ON staff_shifts
    FOR SELECT USING (
        is_current_user_admin()
    );

-- ISSUE #2, #3: NO INSERT policy for staff - only admins can create shifts
-- ISSUE #2, #3: NO UPDATE policy for staff - only admins can manage schedules
-- ISSUE #4: Staff cannot supply arbitrary times/statuses

-- Admins can manage all shifts
CREATE POLICY staff_shifts_admin_all ON staff_shifts
    FOR ALL USING (
        is_current_user_admin()
    );

-- ----------------------------------------------------------------------------
-- RLS: Attendance Shifts
-- ISSUE #4: Server-authoritative clock in/out only
-- ISSUE #6: One active session constraint (enforced by unique index)
-- ----------------------------------------------------------------------------

-- Staff can view their own attendance
CREATE POLICY attendance_shifts_select_own ON attendance_shifts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        employee_id = get_current_employee_id()
    );

-- Admins can view all attendance
CREATE POLICY attendance_shifts_select_admin ON attendance_shifts
    FOR SELECT USING (
        is_current_user_admin()
    );

-- ISSUE #4: Staff can clock in ONLY with server timestamp (no client values)
CREATE POLICY attendance_shifts_clock_in ON attendance_shifts
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        employee_id = get_current_employee_id() AND
        clock_out_tz IS NULL AND
        status IN ('scheduled', 'clocked_in') AND
        -- ISSUE #4: Ensure server default is used (client can't override)
        clock_in_tz = NOW() AND
        is_unscheduled = FALSE
    );

-- ISSUE #4: Staff can clock out ONLY (server validates timestamps/wages)
CREATE POLICY attendance_shifts_clock_out ON attendance_shifts
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        employee_id = get_current_employee_id() AND
        clock_out_tz IS NULL AND
        status IN ('clocked_in', 'scheduled')
    )
    WITH CHECK (
        clock_out_tz IS NOT NULL AND
        clock_out_tz = NOW() AND  -- ISSUE #4: Server timestamp
        status IN ('clocked_out', 'completed') AND
        -- ISSUE #4: Staff cannot modify wages/hours directly
        actual_hours IS NULL AND
        estimated_wages_cents IS NULL
    );

-- Admins can manage all attendance
CREATE POLICY attendance_shifts_admin_all ON attendance_shifts
    FOR ALL USING (
        is_current_user_admin()
    );

-- ----------------------------------------------------------------------------
-- RLS: Attendance Audit Logs
-- ISSUE #6: Append-only, survives attendance deletion
-- ----------------------------------------------------------------------------

-- Staff can view audit logs for their own attendance
CREATE POLICY attendance_audit_logs_select_own ON attendance_audit_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        attendance_id IN (
            SELECT id FROM attendance_shifts
            WHERE employee_id = get_current_employee_id()
        )
    );

-- Admins can view all audit logs
CREATE POLICY attendance_audit_logs_select_admin ON attendance_audit_logs
    FOR SELECT USING (
        is_current_user_admin()
    );

-- ISSUE #6: Only admins/service role can insert audit logs
CREATE POLICY attendance_audit_logs_insert ON attendance_audit_logs
    FOR INSERT WITH CHECK (
        is_current_user_admin() OR
        auth.jwt()->>'role' = 'service_role'
    );

-- ISSUE #6: NO UPDATE or DELETE policies = append-only

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE employees IS 'Staff members (instructors, assistants, managers)';
COMMENT ON TABLE employee_wage_rates IS 'Effective-dated hourly wage rates (SENSITIVE - admin only)';
COMMENT ON TABLE staff_shifts IS 'Scheduled shifts (admin-created, supports overnight)';
COMMENT ON TABLE attendance_shifts IS 'Actual clock in/out records with calculated pay';
COMMENT ON TABLE attendance_audit_logs IS 'Immutable audit trail for attendance corrections (append-only, survives attendance deletion)';

COMMENT ON COLUMN employees.role IS 'Role: admin, manager, instructor, assistant, staff';
COMMENT ON COLUMN employee_wage_rates.effective_to IS 'NULL = currently active rate';
COMMENT ON COLUMN employee_wage_rates.hourly_rate_cents IS 'Stored in cents (SGD) for precision';
COMMENT ON COLUMN staff_shifts.start_time_tz IS 'Stored in UTC; display converts to Asia/Singapore';
COMMENT ON COLUMN staff_shifts.end_time_tz IS 'Can be next day for overnight shifts';
COMMENT ON COLUMN attendance_shifts.is_unscheduled IS 'TRUE when clocked in without scheduled shift';
COMMENT ON COLUMN attendance_shifts.actual_hours IS 'Calculated: (clock_out - clock_in) in hours, 2dp';
COMMENT ON COLUMN attendance_shifts.estimated_wages_cents IS 'Calculated at clock_out using wage rate at clock_in date (Asia/Singapore)';
COMMENT ON COLUMN attendance_audit_logs.change_reason IS 'Required for CORRECTION actions';
COMMENT ON COLUMN attendance_audit_logs.attendance_id IS 'References attendance_shifts but no FK - audit survives deletion';

-- ============================================================================
-- GRANTS (ISSUE #5, #9: Function security)
-- ============================================================================

-- Revoke public execution on sensitive functions
REVOKE ALL ON FUNCTION correct_attendance(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_payroll_summary(DATE, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_wage_rate_at(UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_current_user_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_current_user_active_staff() FROM PUBLIC;

-- Grant execution to authenticated users (function internals do role checks)
GRANT EXECUTE ON FUNCTION correct_attendance(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payroll_summary(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wage_rate_at(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_active_staff() TO authenticated;

-- ============================================================================
-- IDEMPOTENCY GUARD (ISSUE #10, #11)
-- ============================================================================

-- Drop obsolete/overloaded functions from previous migrations
-- ISSUE #10: Clean up any insecure function versions
DROP FUNCTION IF EXISTS is_current_user_admin_old();
DROP FUNCTION IF EXISTS get_current_employee_id_old();

-- Mark migration as applied
CREATE TABLE IF NOT EXISTS _migration_002_applied (
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version TEXT NOT NULL DEFAULT 'security-reviewed-v3'
);

INSERT INTO _migration_002_applied (version) 
SELECT 'security-reviewed-v3' 
WHERE NOT EXISTS (SELECT 1 FROM _migration_002_applied);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

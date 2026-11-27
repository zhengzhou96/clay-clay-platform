
## V3-Specific Test Cases (Critical Defects)

### Test 16: EXCLUDE Constraint Prevents Wage Overlap (Issue #1)

```sql
-- Insert first wage rate
INSERT INTO employee_wage_rates (employee_id, hourly_rate_cents, effective_from, effective_to)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 2000, '2026-01-01', NULL);

-- Try overlapping rate (should fail with EXCLUDE constraint error)
INSERT INTO employee_wage_rates (employee_id, hourly_rate_cents, effective_from, effective_to)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 2500, '2026-01-15', NULL);
-- Expected: ERROR: conflicting key value violates exclusion constraint "employee_wage_rates_no_overlap"
```

**Expected:** EXCLUDE constraint blocks overlap (not unique index)

---

### Test 17: Staff Cannot Update Own Shift (Issue #2)

```sql
-- Create a shift as admin
INSERT INTO staff_shifts (employee_id, start_time_tz, end_time_tz, status, created_by)
VALUES (
    (SELECT id FROM employees WHERE email = 'staff@clayclay.sg'),
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 4 hours',
    'published',
    (SELECT id FROM employees WHERE email = 'admin@clayclay.sg')
);

-- Try to update as staff (should fail - no policy)
-- Test as staff@clayclay.sg
UPDATE staff_shifts SET notes = 'My update'
WHERE employee_id = (SELECT id FROM employees WHERE email = 'staff@clayclay.sg');
-- Expected: ERROR: new row violates row-level security policy
```

**Expected:** No UPDATE policy for staff = blocked

---

### Test 18: Non-Admin Cannot Access Others' Payroll (Issue #3)

```sql
-- Test as staff@clayclay.sg trying to get another employee's payroll
SELECT * FROM get_payroll_summary(
    CURRENT_DATE - 30,
    CURRENT_DATE,
    (SELECT id FROM employees WHERE email = 'admin@clayclay.sg')  -- Try to pass admin ID
);
-- Expected: Returns ONLY staff@clayclay.sg's own summary (scoping enforced inside function)
```

**Expected:** Function ignores p_employee_id for non-admins, returns own data only

---

### Test 19: Staff Cannot Supply Arbitrary Clock-In Time (Issue #4)

```sql
-- Test as staff@clayclay.sg trying to backdate clock-in
INSERT INTO attendance_shifts (employee_id, clock_in_tz, status)
VALUES (
    (SELECT id FROM employees WHERE email = 'staff@clayclay.sg'),
    NOW() - INTERVAL '2 hours',  -- Try to supply arbitrary time
    'clocked_in'
);
-- Expected: ERROR: new row violates row-level security policy for "clock_in_tz = NOW()"
```

**Expected:** RLS CHECK enforces `clock_in_tz = NOW()`

---

### Test 20: Inactive Employee Blocked (Issue #5)

```sql
-- Deactivate an employee (as admin)
UPDATE employees SET is_active = false WHERE email = 'staff@clayclay.sg';

-- Try to clock in as inactive staff
-- Test as staff@clayclay.sg
INSERT INTO attendance_shifts (employee_id, status)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 'clocked_in');
-- Expected: get_current_employee_id() returns NULL (is_active check), RLS blocks
```

**Expected:** `is_active = false` blocks all operations

---

### Test 21: Audit Survives Attendance Deletion (Issue #6)

```sql
-- Create attendance and correction (as admin)
INSERT INTO attendance_shifts (employee_id, status) VALUES 
    ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 'clocked_in');
    
SELECT correct_attendance(
    (SELECT id FROM attendance_shifts ORDER BY created_at DESC LIMIT 1),
    'Test correction',
    NOW() - INTERVAL '1 hour',
    NOW(),
    'Test'
);

-- Count audit logs before deletion
SELECT COUNT(*) FROM attendance_audit_logs;  -- Should be >= 1

-- Delete attendance record (as admin)
DELETE FROM attendance_shifts 
WHERE id = (SELECT id FROM attendance_shifts ORDER BY created_at DESC LIMIT 1);

-- Count audit logs after deletion
SELECT COUNT(*) FROM attendance_audit_logs;  -- Should STILL be >= 1 (audit survived)
```

**Expected:** Audit logs remain after attendance deletion (no FK cascade)

---

### Test 22: No Wage Rate = Exception (Issue #7)

```sql
-- Create employee with NO wage rate
INSERT INTO employees (email, name, role, is_active) 
VALUES ('nowages@clayclay.sg', 'No Wages', 'staff', true);

-- Clock in
INSERT INTO attendance_shifts (employee_id, status)
VALUES ((SELECT id FROM employees WHERE email = 'nowages@clayclay.sg'), 'clocked_in');

-- Try to clock out (trigger calls calculate_attendance_pay_fn which should fail)
UPDATE attendance_shifts SET clock_out_tz = NOW()
WHERE employee_id = (SELECT id FROM employees WHERE email = 'nowages@clayclay.sg')
  AND clock_out_tz IS NULL;
-- Expected: ERROR: No wage rate found for employee...
```

**Expected:** EXCEPTION raised, clock-out fails, attendance unchanged

---

### Test 23: Timezone Helpers Are STABLE (Issue #8)

```sql
-- Verify to_sgt is STABLE, not IMMUTABLE
SELECT provolatile FROM pg_proc WHERE proname = 'to_sgt';
-- Expected: 's' (STABLE), not 'i' (IMMUTABLE)

-- Verify from_sgt is STABLE
SELECT provolatile FROM pg_proc WHERE proname = 'from_sgt';
-- Expected: 's' (STABLE)
```

**Expected:** Both functions are STABLE (can use NOW(), timezone conversion)

---

### Test 24: SECURITY DEFINER Has search_path (Issue #9)

```sql
-- Verify search_path is set on SECURITY DEFINER functions
SELECT proname, proconfig 
FROM pg_proc 
WHERE proname IN ('correct_attendance', 'get_payroll_summary', 'is_current_user_admin', 'get_current_employee_id')
  AND proconfig IS NOT NULL;
-- Expected: All show search_path = pg_catalog, public
```

**Expected:** All SECURITY DEFINER functions have explicit search_path

---

### Test 25: Collection Logger Unaffected (Issue #11)

```sql
-- List all tables that existed before migration (Collection Logger tables)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name NOT IN (
    'employees', 'employee_wage_rates', 'staff_shifts', 
    'attendance_shifts', 'attendance_audit_logs', '_migration_002_applied'
  )
ORDER BY table_name;
-- Expected: All Collection Logger tables listed (calendar_sessions, etc.)

-- Verify Collection Logger tables still work
SELECT COUNT(*) FROM calendar_sessions;  -- Or other CL tables
-- Expected: Returns count without error
```

**Expected:** Collection Logger tables unchanged and functional

---

## Rollback Procedure (Updated for v3)

If migration needs to be reverted:

```sql
BEGIN;

-- Drop new objects (v3)
DROP TABLE IF EXISTS attendance_audit_logs CASCADE;
DROP TABLE IF EXISTS attendance_shifts CASCADE;
DROP TABLE IF EXISTS staff_shifts CASCADE;
DROP TABLE IF EXISTS employee_wage_rates CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop functions (v3)
DROP FUNCTION IF EXISTS get_payroll_summary(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS get_staff_schedule(DATE, DATE, UUID, TEXT);
DROP FUNCTION IF EXISTS from_sgt(TEXT);
DROP FUNCTION IF EXISTS to_sgt(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS correct_attendance(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS log_attendance_change_fn(UUID, audit_action_staff, JSONB, JSONB, UUID, TEXT);
DROP FUNCTION IF EXISTS check_shift_overlap_fn(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS update_attendance_calculations_fn();
DROP FUNCTION IF EXISTS calculate_attendance_pay_fn(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_wage_rate_at(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS is_current_user_active_staff();
DROP FUNCTION IF EXISTS get_current_employee_id();
DROP FUNCTION IF EXISTS is_current_user_admin();
DROP FUNCTION IF EXISTS employees_prevent_self_privilege_change_fn();
DROP FUNCTION IF EXISTS update_updated_at_column_fn();

-- Drop triggers (v3)
DROP TRIGGER IF EXISTS employees_prevent_privilege_change ON employees;
DROP TRIGGER IF EXISTS attendance_calculate_pay ON attendance_shifts;
DROP TRIGGER IF EXISTS update_attendance_shifts_updated_at ON attendance_shifts;
DROP TRIGGER IF EXISTS update_staff_shifts_updated_at ON staff_shifts;
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;

-- Drop indexes (v3)
DROP INDEX IF EXISTS idx_attendance_shifts_one_active;
-- EXCLUDE constraint drops with table

-- Drop types
DROP TYPE IF EXISTS audit_action_staff;
DROP TYPE IF EXISTS attendance_status;
DROP TYPE IF EXISTS shift_status;

-- Drop extensions (only if not used by Collection Logger)
-- DROP EXTENSION IF EXISTS btree_gist;
-- DROP EXTENSION IF EXISTS uuid-ossp;

-- Drop migration guard
DROP TABLE IF EXISTS _migration_002_applied;

COMMIT;
```

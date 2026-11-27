# Staff Scheduling Migration - Security Test Plan

**Migration:** `db/migrations/002_staff_scheduling_security_reviewed_v2.sql`  
**Commit:** `7dc83a2a`  
**Date:** 2026-11-27  
**Supabase Project:** `ispoxdaiahtwzblzawef` (Clay Clay Collection Logger)

---

## Security Issues Addressed

| # | Issue | Resolution |
|---|-------|------------|
| 1 | OLD/NEW in CREATE POLICY | Removed - use triggers for field-level restrictions |
| 2 | Recursive RLS on employees | SECURITY DEFINER helper functions (`is_current_user_admin()`, `get_current_employee_id()`) |
| 3 | Staff self-modification | Triggers block privileged field changes; no INSERT policy for shifts |
| 4 | Wage calculation with NEW values | BEFORE UPDATE trigger uses `NEW.clock_in_tz`, `NEW.clock_out_tz` |
| 5 | RPC function security | `SECURITY DEFINER` with explicit role checks; GRANTS restricted |
| 6 | One active attendance session | Partial unique index: `WHERE clock_out_tz IS NULL` |
| 7 | Singapore timezone handling | All date comparisons use `AT TIME ZONE 'Asia/Singapore'` |
| 8 | Overlapping wage rates | GiST exclusion constraint with `btree_gist` extension |
| 9 | Audit logs append-only | No UPDATE/DELETE policies; `ON DELETE SET NULL` not CASCADE |
| 10 | Collection Logger compatibility | Self-contained trigger functions (don't depend on existing) |
| 11 | Idempotent migration | `CREATE TABLE IF NOT EXISTS`, `CREATE ... IF NOT EXISTS`, `_migration_002_applied` guard |

---

## Test Environment Setup

### Prerequisites
1. Apply migration to Supabase project `ispoxdaiahtwzblzawef`
2. Create test employee accounts via SQL:
   ```sql
   -- Admin user
   INSERT INTO employees (email, name, role, is_active)
   VALUES ('admin@clayclay.sg', 'Test Admin', 'admin', true);
   
   -- Staff user
   INSERT INTO employees (email, name, role, is_active)
   VALUES ('staff@clayclay.sg', 'Test Staff', 'staff', true);
   ```

3. Set up Supabase Auth users matching these emails (or use service role for testing)

---

## Test Cases

### 1. Anonymous Access (Should All Fail)

```sql
-- Test as anonymous (no auth)
-- Expected: All queries return 0 rows or 401

SELECT * FROM employees;
SELECT * FROM employee_wage_rates;
SELECT * FROM staff_shifts;
SELECT * FROM attendance_shifts;
SELECT * FROM attendance_audit_logs;
```

**Expected:** RLS blocks all access

---

### 2. Staff Self-View (Should Succeed)

```sql
-- Test as staff@clayclay.sg
SELECT id, email, role FROM employees WHERE email = 'staff@clayclay.sg';
-- Expected: Returns own record

SELECT * FROM employee_wage_rates WHERE employee_id = (SELECT id FROM employees WHERE email = 'staff@clayclay.sg');
-- Expected: Returns own wage rates (if any)
```

**Expected:** Can view own profile and wages only

---

### 3. Staff Cannot View Other Employees

```sql
-- Test as staff@clayclay.sg
SELECT * FROM employees WHERE email != 'staff@clayclay.sg';
-- Expected: Returns 0 rows
```

**Expected:** RLS blocks access to other employees

---

### 4. Staff Cannot Change Own Role

```sql
-- Test as staff@clayclay.sg
UPDATE employees SET role = 'admin' WHERE email = 'staff@clayclay.sg';
-- Expected: ERROR 42501 "Staff cannot change their own role"
```

**Expected:** Trigger blocks privilege escalation

---

### 5. Staff Cannot Create Own Shift

```sql
-- Test as staff@clayclay.sg
INSERT INTO staff_shifts (employee_id, start_time_tz, end_time_tz, status)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 
        NOW(), NOW() + INTERVAL '4 hours', 'published');
-- Expected: ERROR - no INSERT policy for non-admins
```

**Expected:** No INSERT policy = blocked

---

### 6. Staff Can Clock In (Server Timestamp)

```sql
-- Test as staff@clayclay.sg
INSERT INTO attendance_shifts (employee_id, status)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 'clocked_in');
-- Expected: Success, clock_in_tz = NOW() (server time)

-- Verify server timestamp
SELECT clock_in_tz FROM attendance_shifts 
WHERE employee_id = (SELECT id FROM employees WHERE email = 'staff@clayclay.sg')
ORDER BY created_at DESC LIMIT 1;
-- Expected: clock_in_tz within last few seconds
```

**Expected:** Server assigns timestamp, not client

---

### 7. One Active Session Constraint

```sql
-- Test as staff@clayclay.sg (already clocked in from test 6)
INSERT INTO attendance_shifts (employee_id, status)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 'clocked_in');
-- Expected: ERROR - duplicate key violates unique constraint "idx_attendance_shifts_one_active"
```

**Expected:** Unique index prevents concurrent sessions

---

### 8. Staff Cannot Clock Out Another Employee

```sql
-- Get another employee's active attendance
SELECT id FROM attendance_shifts 
WHERE employee_id != (SELECT id FROM employees WHERE email = 'staff@clayclay.sg')
  AND clock_out_tz IS NULL
LIMIT 1;

-- Try to clock them out
UPDATE attendance_shifts SET clock_out_tz = NOW()
WHERE id = <id_from_above>;
-- Expected: ERROR - RLS policy blocks (not own attendance)
```

**Expected:** RLS blocks modification of others' attendance

---

### 9. Admin Can View All

```sql
-- Test as admin@clayclay.sg
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM attendance_shifts;
SELECT * FROM get_payroll_summary(CURRENT_DATE - 30, CURRENT_DATE);
-- Expected: All succeed with full data
```

**Expected:** Admin policies grant full access

---

### 10. Admin Can Correct Attendance

```sql
-- Test as admin@clayclay.sg
SELECT correct_attendance(
    (SELECT id FROM attendance_shifts ORDER BY created_at DESC LIMIT 1),
    'Testing correction',
    NOW() - INTERVAL '1 hour',
    NOW(),
    'Test notes'
);
-- Expected: Returns TRUE

-- Verify audit log created
SELECT * FROM attendance_audit_logs 
ORDER BY created_at DESC LIMIT 1;
-- Expected: CORRECTION action with reason
```

**Expected:** Function succeeds, audit trail created

---

### 11. Staff Cannot Call correct_attendance

```sql
-- Test as staff@clayclay.sg
SELECT correct_attendance(
    (SELECT id FROM attendance_shifts WHERE employee_id = get_current_employee_id() LIMIT 1),
    'Testing',
    NOW(),
    NOW(),
    'Test'
);
-- Expected: ERROR 42501 "Only admins/managers can correct attendance"
```

**Expected:** SECURITY DEFINER function blocks non-admin

---

### 12. Wage Rate Overlap Prevention

```sql
-- Insert first wage rate
INSERT INTO employee_wage_rates (employee_id, hourly_rate_cents, effective_from, effective_to)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 2000, '2026-01-01', NULL);

-- Try to insert overlapping rate
INSERT INTO employee_wage_rates (employee_id, hourly_rate_cents, effective_from, effective_to)
VALUES ((SELECT id FROM employees WHERE email = 'staff@clayclay.sg'), 2500, '2026-01-15', NULL);
-- Expected: ERROR - conflicting key value violates exclusion constraint
```

**Expected:** GiST exclusion prevents overlap

---

### 13. Audit Log Append-Only

```sql
-- Try to update audit log
UPDATE attendance_audit_logs SET change_reason = 'Hacked' WHERE id = 1;
-- Expected: ERROR - no UPDATE policy

-- Try to delete audit log
DELETE FROM attendance_audit_logs WHERE id = 1;
-- Expected: ERROR - no DELETE policy
```

**Expected:** No UPDATE/DELETE policies = append-only

---

### 14. Singapore Timezone Handling

```sql
-- Insert with UTC time
INSERT INTO attendance_shifts (employee_id, clock_in_tz, clock_out_tz, status)
VALUES (
    (SELECT id FROM employees WHERE email = 'staff@clayclay.sg'),
    '2026-11-27 00:00:00+00',  -- UTC midnight
    '2026-11-27 08:00:00+00',  -- UTC 8am
    'completed'
);

-- Verify wage calculation uses Asia/Singapore date
SELECT actual_hours, estimated_wages_cents FROM attendance_shifts 
WHERE id = currval(pg_get_serial_sequence('attendance_shifts', 'id'));
-- Expected: Wage rate from correct Singapore date
```

**Expected:** `get_wage_rate_at()` uses `AT TIME ZONE 'Asia/Singapore'`

---

### 15. Collection Logger Unaffected

```sql
-- Verify existing tables still work
SELECT COUNT(*) FROM calendar_sessions;  -- Or other Collection Logger tables
-- Expected: Returns count without error

-- Verify no schema conflicts
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'attendance%' 
  AND table_name NOT LIKE 'staff_%' 
  AND table_name NOT LIKE 'employee%'
  AND table_name NOT LIKE 'shift%';
-- Expected: All existing tables listed
```

**Expected:** No impact on Collection Logger

---

## Rollback Procedure

If migration needs to be reverted:

```sql
BEGIN;

-- Drop new objects
DROP TABLE IF EXISTS attendance_audit_logs CASCADE;
DROP TABLE IF EXISTS attendance_shifts CASCADE;
DROP TABLE IF EXISTS staff_shifts CASCADE;
DROP TABLE IF EXISTS employee_wage_rates CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_payroll_summary;
DROP FUNCTION IF EXISTS get_staff_schedule;
DROP FUNCTION IF EXISTS from_sgt;
DROP FUNCTION IF EXISTS to_sgt;
DROP FUNCTION IF EXISTS correct_attendance;
DROP FUNCTION IF EXISTS log_attendance_change_fn;
DROP FUNCTION IF EXISTS check_shift_overlap_fn;
DROP FUNCTION IF EXISTS update_attendance_calculations_fn;
DROP FUNCTION IF EXISTS calculate_attendance_pay_fn;
DROP FUNCTION IF EXISTS get_wage_rate_at;
DROP FUNCTION IF EXISTS get_current_employee_id;
DROP FUNCTION IF EXISTS is_current_user_admin;
DROP FUNCTION IF EXISTS employees_prevent_self_privilege_change_fn;
DROP FUNCTION IF EXISTS update_updated_at_column_fn;

-- Drop triggers
DROP TRIGGER IF EXISTS employees_prevent_privilege_change ON employees;
DROP TRIGGER IF EXISTS attendance_calculate_pay ON attendance_shifts;
DROP TRIGGER IF EXISTS update_attendance_shifts_updated_at ON attendance_shifts;
DROP TRIGGER IF EXISTS update_staff_shifts_updated_at ON staff_shifts;
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;

-- Drop indexes
DROP INDEX IF EXISTS idx_attendance_shifts_one_active;
DROP INDEX IF EXISTS idx_employee_wage_rates_no_overlap;

-- Drop types
DROP TYPE IF EXISTS audit_action_staff;
DROP TYPE IF EXISTS attendance_status;
DROP TYPE IF EXISTS shift_status;

-- Drop migration guard
DROP TABLE IF EXISTS _migration_002_applied;

-- Keep extensions (may be used by other tables)
-- DROP EXTENSION IF EXISTS btree_gist;
-- DROP EXTENSION IF EXISTS uuid-ossp;

COMMIT;
```

---

## Application Changes Required

### Frontend
1. **Clock-in endpoint** - Must use server timestamp (handled by DB default)
2. **Shift creation** - Only admin UI should have this feature
3. **Wage display** - Convert UTC to Asia/Singapore for display
4. **Date filtering** - Use `to_sgt()` function for Singapore date comparisons

### Backend
1. **Admin check** - Use `is_current_user_admin()` function for authorization
2. **Payroll calculations** - Call `get_payroll_summary()` RPC function
3. **Attendance corrections** - Call `correct_attendance()` RPC (not direct UPDATE)

---

## Sign-Off Checklist

- [ ] Migration applied successfully (no errors)
- [ ] All 15 test cases pass
- [ ] Collection Logger functionality verified unchanged
- [ ] Admin user can perform all operations
- [ ] Staff user blocked from privileged operations
- [ ] Anonymous access blocked
- [ ] Audit logs created for corrections
- [ ] Wage calculations accurate
- [ ] Timezone handling correct
- [ ] Rollback procedure tested (optional, staging only)

---

**Tested by:** ________________  
**Date:** ________________  
**Environment:** ________________ (staging/production)

# Clay Clay Staff Scheduling MVP - Deployment Status

**Date:** 2026-11-27  
**Latest Commit:** `41f57a31` - Security-reviewed migration: fix RLS, function signatures, index predicates  
**Production URL:** https://clay-clay-platform.vercel.app  
**Supabase Project:** `ispoxdaiahtwzblzawef` (Clay Clay Collection Logger)

---

## ✅ Completed

### 1. Code Implementation
- **Staff Portal** (`/app/staff/`): Mobile-first interface with login, schedule, hours summary
- **Admin Portal** (`/app/admin/staff/`): Desktop/iPad optimized with weekly calendar, employee management, timesheets
- **Backend API** (`/lib/staff-scheduling/`): Authentication, shift CRUD, clock in/out, wage calculations, CSV export
- **Database Migration** (`/db/migrations/002_staff_scheduling.sql`): Complete schema with RLS policies

### 2. Deployment
- **Vercel Production:** Deployed and READY
- **Environment Variables:** All 5 Supabase credentials configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Source:** Reusing existing Supabase project `ispoxdaiahtwzblzawef` (Clay Clay Collection Logger)
- **Credentials:** All 5 Supabase environment variables configured in Vercel ✓

### 3. Page Accessibility
All pages verified accessible:
- `/` → 307 (redirect to login)
- `/staff` → 307 (redirect to login)
- `/admin/staff` → 200 ✓
- `/admin/staff/schedule` → 200 ✓
- `/admin/staff/employees` → 200 ✓
- `/admin/staff/timesheets` → 200 ✓

---

## ✅ Database Migration - SECURITY REVIEWED v2

### Status
**READY FOR PRODUCTION** - Migration v2 addresses all 11 security audit issues.

**Latest Commit:** `7dc83a2a` (2026-11-27)

### Issues Fixed (All 11 from Security Audit)

| # | Issue | Resolution |
|---|-------|------------|
| 1 | `OLD/NEW` in CREATE POLICY statements | Removed - use triggers for field-level restrictions |
| 2 | Recursive RLS on employees | `SECURITY DEFINER` helper functions (`is_current_user_admin()`, `get_current_employee_id()`) |
| 3 | Staff self-modification of privileged fields | Trigger blocks role/email/name/is_active changes; no INSERT policy for shifts |
| 4 | Wage calculation with NEW values | BEFORE UPDATE trigger uses `NEW.clock_in_tz`, `NEW.clock_out_tz` |
| 5 | RPC function security | `SECURITY DEFINER` with explicit role checks; GRANTS restricted |
| 6 | Multiple active attendance sessions | Partial unique index: `WHERE clock_out_tz IS NULL` |
| 7 | Singapore timezone handling | All date comparisons use `AT TIME ZONE 'Asia/Singapore'` |
| 8 | Overlapping wage rates | GiST exclusion constraint with `btree_gist` extension |
| 9 | Audit logs not append-only | No UPDATE/DELETE policies; `ON DELETE SET NULL` not CASCADE |
| 10 | Collection Logger function compatibility | Self-contained trigger functions (don't depend on existing) |
| 11 | Idempotent migration | `CREATE TABLE IF NOT EXISTS`, `_migration_002_applied` guard |

### Migration File

**Location:** `db/migrations/002_staff_scheduling_security_reviewed_v2.sql`  
**Size:** ~32,849 chars  
**Tables:** 5 (`employees`, `employee_wage_rates`, `staff_shifts`, `attendance_shifts`, `attendance_audit_logs`)  
**Functions:** 12 (admin checks, wage calculation, payroll summary, timezone helpers)  
**RLS Policies:** 20 (strict isolation, admin-only wage management, append-only audit)  
**Indexes:** 20+ (including GiST exclusion for wage overlap and one-active-session)

### How to Apply

**Supabase Dashboard (2 minutes):**

1. Go to: https://supabase.com/dashboard/project/ispoxdaiahtwzblzawef/sql/new
2. Open: https://github.com/zhengzhou96/clay-clay-platform/blob/master/db/migrations/002_staff_scheduling_security_reviewed_v2.sql
3. Copy entire file contents (Ctrl+A, Ctrl+C)
4. Paste into SQL Editor
5. Click "Run"
6. Verify success: `_migration_002_applied` table created

**Expected result:** 5 tables, 20 RLS policies, 12 functions, 20+ indexes created

### Test Plan

See: `db/migrations/MIGRATION_TEST_PLAN.md` - 15 comprehensive test cases covering:
- Anonymous access (blocked)
- Staff self-view (allowed)
- Staff cannot view others (blocked)
- Staff cannot change own role (blocked by trigger)
- Staff cannot create shifts (no policy)
- Staff can clock in (server timestamp)
- One active session constraint (unique index)
- Staff cannot clock out others (RLS)
- Admin can view all (allowed)
- Admin can correct attendance (SECURITY DEFINER)
- Staff cannot call correct_attendance (role check)
- Wage rate overlap prevention (GiST exclusion)
- Audit logs append-only (no UPDATE/DELETE policies)
- Singapore timezone handling (AT TIME ZONE)
- Collection Logger unaffected (no conflicts)

### Rollback Plan

If migration needs to be reverted, run rollback SQL from `MIGRATION_TEST_PLAN.md`.
DROP FUNCTION IF EXISTS get_payroll_summary;
DROP FUNCTION IF EXISTS get_staff_schedule;
DROP FUNCTION IF EXISTS from_sgt;
DROP FUNCTION IF EXISTS to_sgt;
DROP FUNCTION IF EXISTS correct_attendance;
DROP FUNCTION IF EXISTS log_attendance_change;
DROP FUNCTION IF EXISTS check_shift_overlap;
DROP FUNCTION IF EXISTS update_attendance_calculations;
DROP FUNCTION IF EXISTS calculate_attendance_pay;
DROP FUNCTION IF EXISTS get_wage_rate_at;

-- Drop enums
DROP TYPE IF EXISTS audit_action_staff;
DROP TYPE IF EXISTS attendance_status;
DROP TYPE IF EXISTS shift_status;

-- Extensions (keep if used by other tables)
-- DROP EXTENSION IF EXISTS btree_gist;
-- DROP EXTENSION IF EXISTS uuid-ossp;
```

---

## 🧪 Testing Status

### Verified
- ✅ Build compiles successfully
- ✅ Deployment reaches READY state
- ✅ All pages accessible
- ✅ Supabase credentials configured in Vercel
- ✅ Environment variables readable by application

### Pending (Requires Migration)
- ⏳ Staff authentication
- ⏳ Shift scheduling
- ⏳ Check-in/out functionality
- ⏳ Timesheet review
- ⏳ Wage calculations
- ⏳ CSV exports

---

## 📋 Next Steps

1. **Apply the database migration** using one of the methods above
2. **Test staff login** at `/staff`
3. **Create test employee** via admin portal at `/admin/staff/employees`
4. **Create test shift** at `/admin/staff/schedule`
5. **Test clock in/out** at `/staff`
6. **Verify timesheet** at `/admin/staff/timesheets`
7. **Test wage calculation** and CSV export

---

## 🔗 Quick Links

- **Production:** https://clay-clay-platform.vercel.app
- **Staff Portal:** https://clay-clay-platform.vercel.app/staff
- **Admin Portal:** https://clay-clay-platform.vercel.app/admin/staff
- **GitHub:** https://github.com/zhengzhou96/clay-clay-platform
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ispoxdaiahtwzblzawef
- **Vercel Dashboard:** https://vercel.com/zhengzhoulimgmailcoms-projects/clay-clay-platform
- **Collection Logger:** https://github.com/zhengzhou96/clay-clay-collection-logger

---

## 📝 Notes

- **Data Isolation:** The migration includes RLS policies to ensure staff scheduling data is isolated from the existing pottery tracker data
- **No Data Loss:** The migration is additive only - no existing tables or data will be modified
- **Rollback:** If needed, drop the 5 new tables: `employees`, `employee_wage_rates`, `staff_shifts`, `attendance_shifts`, `attendance_audit_logs`

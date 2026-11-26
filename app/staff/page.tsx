import { createClient } from '@/lib/supabase/server'
import { StaffDashboardClient } from '@/app/staff/StaffDashboardClient'
import { redirect } from 'next/navigation'

export default async function StaffDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff/login')
  }

  // Get employee data
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!employee) {
    redirect('/staff/login')
  }

  // Get today's shift
  const today = new Date().toISOString().split('T')[0]
  const { data: todayShift } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .eq('status', 'published')
    .order('start_time', { ascending: true })
    .limit(1)
    .single()

  // Get next upcoming shift (after today)
  const { data: nextShift } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('status', 'published')
    .gt('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1)
    .single()

  // Get current attendance (check if clocked in)
  const { data: currentAttendance } = await supabase
    .from('attendances')
    .select('*')
    .eq('employee_id', employee.id)
    .is('actual_out', null)
    .order('actual_in', { ascending: false })
    .limit(1)
    .single()

  // Get this month's hours and wages
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  const { data: monthAttendances } = await supabase
    .from('attendances')
    .select('hours_worked, estimated_wages_cents')
    .eq('employee_id', employee.id)
    .gte('date', monthStart.toISOString().split('T')[0])
    .lt('date', monthEnd.toISOString().split('T')[0])
    .not('hours_worked', 'is', null)

  const monthHours = monthAttendances?.reduce((sum, a) => sum + (a.hours_worked || 0), 0) || 0
  const monthWages = monthAttendances?.reduce((sum, a) => sum + (a.estimated_wages_cents || 0), 0) || 0

  // Get current wage rate
  const { data: wageRate } = await supabase
    .from('wage_rates')
    .select('hourly_rate_cents')
    .eq('employee_id', employee.id)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  return (
    <StaffDashboardClient
      employee={employee}
      todayShift={todayShift || null}
      nextShift={nextShift || null}
      currentAttendance={currentAttendance || null}
      monthHours={monthHours}
      monthWages={monthWages}
      hourlyRateCents={wageRate?.hourly_rate_cents || employee.hourly_wage_cents}
    />
  )
}
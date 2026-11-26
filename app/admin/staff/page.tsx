import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import DashboardStats from './components/DashboardStats'
import CurrentlyWorking from './components/CurrentlyWorking'
import ScheduledToday from './components/ScheduledToday'
import LateAlerts from './components/LateAlerts'

export default async function OverviewPage() {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  const today = new Date()
  const monthStart = startOfMonth(today).toISOString()
  const monthEnd = endOfMonth(today).toISOString()

  // Fetch all data in parallel
  const [
    { data: employees },
    { data: shiftsToday },
    { data: attendancesToday },
    { data: attendancesMonth },
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('id, employee_code, full_name, hourly_wage_cents, status')
      .eq('status', 'active'),
    supabase
      .from('shifts')
      .select('id, employee_id, date, start_time, end_time, status, break_minutes')
      .eq('date', format(today, 'yyyy-MM-dd'))
      .in('status', ['published', 'scheduled']),
    supabase
      .from('attendances')
      .select('id, employee_id, shift_id, date, actual_in, actual_out, hours_worked, estimated_wages_cents, status')
      .eq('date', format(today, 'yyyy-MM-dd'))
      .eq('voided', false),
    supabase
      .from('attendances')
      .select('id, employee_id, date, hours_worked, estimated_wages_cents')
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'))
      .eq('voided', false),
  ])

  // Calculate stats
  const employeeMap = new Map(employees?.map(e => [e.id, e]) || [])
  
  const currentlyWorking = attendancesToday?.filter(a => 
    a.actual_in && !a.actual_out && a.status === 'checked_in'
  ).length || 0

  const scheduledToday = shiftsToday?.length || 0

  interface LateAlert {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  status: string
  break_minutes: number
  minutesLate: number
  alertType: 'late' | 'not_checked_in'
}

  // Late/not checked in alerts
  const lateAlerts: LateAlert[] = (shiftsToday || []).filter(shift => {
    const attendance = attendancesToday?.find(a => a.shift_id === shift.id)
    const now = new Date()
    const shiftStart = new Date(`${shift.date}T${shift.start_time}`)
    const minutesLate = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)
    
    if (!attendance && minutesLate > 5) {
      return { ...shift, minutesLate, alertType: 'not_checked_in' as const } satisfies LateAlert
    }
    if (attendance && !attendance.actual_in && minutesLate > 5) {
      return { ...shift, minutesLate, alertType: 'late' as const } satisfies LateAlert
    }
    return null
  }).filter(Boolean) as LateAlert[]

  const todayActualHours = attendancesToday?.reduce((sum, a) => sum + (a.hours_worked || 0), 0) || 0
  const todayEstimatedCost = attendancesToday?.reduce((sum, a) => sum + (a.estimated_wages_cents || 0), 0) || 0
  const monthEstimatedCost = attendancesMonth?.reduce((sum, a) => sum + (a.estimated_wages_cents || 0), 0) || 0

  const stats = {
    currentlyWorking,
    scheduledToday,
    lateNotCheckedIn: lateAlerts.map(alert => ({
      employee_id: alert.employee_id,
      employee_name: employeeMap.get(alert.employee_id)?.full_name || 'Unknown',
      employee_code: employeeMap.get(alert.employee_id)?.employee_code || '',
      shift_id: alert.id,
      shift_start: alert.start_time,
      minutes_late: alert.minutesLate,
      alert_type: alert.alertType,
    })),
    todayActualHours,
    todayEstimatedCost,
    monthEstimatedCost,
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Overview</h1>
          <p className="page-subtitle">Real-time dashboard for {format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-clay-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Live data</span>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentlyWorking attendances={attendancesToday || []} employees={employees || []} />
        <ScheduledToday shifts={shiftsToday || []} employees={employees || []} attendances={attendancesToday || []} />
      </div>

      {stats.lateNotCheckedIn.length > 0 && (
        <LateAlerts alerts={stats.lateNotCheckedIn} />
      )}
    </div>
  )
}
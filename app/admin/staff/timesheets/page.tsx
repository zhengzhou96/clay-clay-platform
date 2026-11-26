import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns'
import TimesheetTable from './components/TimesheetTable'
import TimesheetFilters from './components/TimesheetFilters'

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; employee_id?: string }>
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  const params = await searchParams
  const monthParam = params.month
  const employeeIdParam = params.employee_id
  const currentMonth = monthParam ? parseISO(`${monthParam}-01`) : startOfMonth(new Date())
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  // Fetch employees for filter
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, status')
    .eq('status', 'active')
    .order('full_name')

  // Build attendance query
  let attendanceQuery = supabase
    .from('attendances')
    .select(`
      id,
      employee_id,
      shift_id,
      date,
      scheduled_in,
      scheduled_out,
      actual_in,
      actual_out,
      hours_worked,
      estimated_wages_cents,
      status,
      correction_reason,
      voided,
      voided_by,
      voided_at,
      void_reason,
      employee:employees!inner(id, employee_code, full_name, hourly_wage_cents),
      shift:shifts!left(id, start_time, end_time, break_minutes)
    `)
    .gte('date', format(monthStart, 'yyyy-MM-dd'))
    .lte('date', format(monthEnd, 'yyyy-MM-dd'))
    .order('date', { ascending: false })
    .order('employee_id')

  if (employeeIdParam) {
    attendanceQuery = attendanceQuery.eq('employee_id', employeeIdParam)
  }

  const { data: attendances } = await attendanceQuery

  // Transform attendances to timesheet rows
  const timesheetRows = (attendances || []).map(a => {
    const scheduledHours = a.scheduled_in && a.scheduled_out
      ? (new Date(`${a.date}T${a.scheduled_out}`).getTime() - new Date(`${a.date}T${a.scheduled_in}`).getTime()) / 3600000
      : null
    
    const flags: string[] = []
    if (a.status === 'missed') flags.push('Missed Shift')
    if (a.status === 'late') flags.push('Late')
    if (a.status === 'unscheduled') flags.push('Unscheduled')
    if (a.voided) flags.push('Voided')
    if (a.correction_reason) flags.push('Corrected')

    return {
      employee_id: a.employee_id,
      employee_name: a.employee?.full_name || 'Unknown',
      employee_code: a.employee?.employee_code || '',
      date: a.date,
      scheduled_in: a.scheduled_in,
      scheduled_out: a.scheduled_out,
      actual_in: a.actual_in,
      actual_out: a.actual_out,
      hours_worked: a.hours_worked,
      scheduled_hours: scheduledHours,
      estimated_wages_cents: a.estimated_wages_cents,
      status: a.status,
      attendance_id: a.id,
      shift_id: a.shift_id,
      flags,
    }
  })

  // Summary stats
  const totalScheduledHours = timesheetRows.reduce((sum, r) => sum + (r.scheduled_hours || 0), 0)
  const totalActualHours = timesheetRows.reduce((sum, r) => sum + (r.hours_worked || 0), 0)
  const totalEstimatedWages = timesheetRows.reduce((sum, r) => sum + (r.estimated_wages_cents || 0), 0)
  const missedShifts = timesheetRows.filter(r => r.flags.includes('Missed Shift')).length
  const lateArrivals = timesheetRows.filter(r => r.flags.includes('Late')).length

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Timesheets</h1>
          <p className="page-subtitle">Review and correct attendance records for {format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = `/admin/staff/timesheets?month=${format(subMonths(currentMonth, 1), 'yyyy-MM')}`}
              className="btn btn-outline btn-sm"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="font-medium text-clay-900 whitespace-nowrap">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => window.location.href = `/admin/staff/timesheets?month=${format(addMonths(currentMonth, 1), 'yyyy-MM')}`}
              className="btn btn-outline btn-sm"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <TimesheetFilters
            employees={employees || []}
            selectedEmployeeId={employeeIdParam || ''}
            onChange={(employeeId) => {
              const params = new URLSearchParams()
              params.set('month', format(currentMonth, 'yyyy-MM'))
              if (employeeId) params.set('employee_id', employeeId)
              window.location.href = `/admin/staff/timesheets?${params.toString()}`
            }}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Scheduled Hours" value={totalScheduledHours.toFixed(1)} suffix="hrs" icon={<ClockIcon />} />
        <StatCard title="Actual Hours" value={totalActualHours.toFixed(1)} suffix="hrs" icon={<CheckCircleIcon />} />
        <StatCard title="Est. Wages" value={formatCurrency(totalEstimatedWages)} icon={<DollarSignIcon />} />
        <StatCard title="Missed Shifts" value={missedShifts} icon={<AlertIcon />} trendNegative={missedShifts > 0} />
        <StatCard title="Late Arrivals" value={lateArrivals} icon={<ClockAlertIcon />} trendNegative={lateArrivals > 0} />
      </div>

      <TimesheetTable rows={timesheetRows} employees={employees || []} />
    </div>
  )
}

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  trendNegative = false,
}: {
  title: string
  value: string | number
  suffix?: string
  icon: React.ReactNode
  trendNegative?: boolean
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-clay-500">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-clay-900">{value}</span>
            {suffix && <span className="text-clay-500 text-lg font-medium">{suffix}</span>}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trendNegative ? 'bg-red-100 text-red-600' : 'bg-clay-100 text-clay-600'}`}>
          {Icon}
        </div>
      </div>
    </div>
  )
}

function ClockIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
}

function CheckCircleIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
}

function DollarSignIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
}

function AlertIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
}

function ClockAlertIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h3.75m-3.75 0a9.06 9.06 0 0 1 3.177 12.42 4.5 4.5 0 1 1-9-6.081M12 3v2.25m0 12.75V21m-7.5-7.5H21" /></svg>
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
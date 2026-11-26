import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns'
import WagesTable from './components/WagesTable'

export default async function WagesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  const params = await searchParams
  const monthParam = params.month
  const currentMonth = monthParam ? parseISO(`${monthParam}-01`) : startOfMonth(new Date())
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  // Fetch employees with their attendance for the month
  const { data: attendances } = await supabase
    .from('attendances')
    .select(`
      id,
      employee_id,
      date,
      hours_worked,
      estimated_wages_cents,
      employee:employees!inner(id, employee_code, full_name, hourly_wage_cents),
      shift:shifts!left(id, start_time, end_time, break_minutes)
    `)
    .gte('date', format(monthStart, 'yyyy-MM-dd'))
    .lte('date', format(monthEnd, 'yyyy-MM-dd'))
    .eq('voided', false)
    .order('employee_id')
    .order('date')

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, hourly_wage_cents, status')
    .eq('status', 'active')
    .order('full_name')

  // Calculate monthly summaries per employee
  const employeeMap = new Map(employees?.map(e => [e.id, e]) || [])
  
  const summaries = new Map<string, {
    employee_id: string
    employee_name: string
    employee_code: string
    scheduled_hours: number
    actual_hours: number
    estimated_gross_wages_cents: number
  }>()

  attendances?.forEach(a => {
    const emp = employeeMap.get(a.employee_id)
    if (!emp) return
    
    const existing = summaries.get(a.employee_id) || {
      employee_id: a.employee_id,
      employee_name: emp.full_name,
      employee_code: emp.employee_code,
      scheduled_hours: 0,
      actual_hours: 0,
      estimated_gross_wages_cents: 0,
    }

    // Calculate scheduled hours from shift (handle both array and object)
    const shift = Array.isArray(a.shift) ? a.shift[0] : a.shift
    if (shift) {
      const start = new Date(`${a.date}T${shift.start_time}`).getTime()
      const end = new Date(`${a.date}T${shift.end_time}`).getTime()
      const breakMs = (shift.break_minutes || 0) * 60000
      existing.scheduled_hours += (end - start - breakMs) / 3600000
    }

    existing.actual_hours += a.hours_worked || 0
    existing.estimated_gross_wages_cents += a.estimated_wages_cents || 0
    summaries.set(a.employee_id, existing)
  })

  // Add employees with no attendance
  employees?.forEach(emp => {
    if (!summaries.has(emp.id)) {
      summaries.set(emp.id, {
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_code: emp.employee_code,
        scheduled_hours: 0,
        actual_hours: 0,
        estimated_gross_wages_cents: 0,
      })
    }
  })

  const wageSummaries = Array.from(summaries.values()).sort((a, b) => 
    a.employee_name.localeCompare(b.employee_name)
  )

  const totalScheduledHours = wageSummaries.reduce((sum, s) => sum + s.scheduled_hours, 0)
  const totalActualHours = wageSummaries.reduce((sum, s) => sum + s.actual_hours, 0)
  const totalEstimatedWages = wageSummaries.reduce((sum, s) => sum + s.estimated_gross_wages_cents, 0)

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Monthly Wages</h1>
          <p className="page-subtitle">Summary for {format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = `/admin/staff/wages?month=${format(subMonths(currentMonth, 1), 'yyyy-MM')}`}
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
              onClick={() => window.location.href = `/admin/staff/wages?month=${format(addMonths(currentMonth, 1), 'yyyy-MM')}`}
              className="btn btn-outline btn-sm"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <button className="btn btn-primary btn-sm" id="download-csv">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-clay-500">Total Scheduled Hours</p>
          <p className="text-2xl font-bold text-clay-900 mt-1">{totalScheduledHours.toFixed(1)} hrs</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-clay-500">Total Actual Hours</p>
          <p className="text-2xl font-bold text-clay-900 mt-1">{totalActualHours.toFixed(1)} hrs</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-clay-500">Total Est. Gross Wages</p>
          <p className="text-2xl font-bold text-clay-900 mt-1">
            {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(totalEstimatedWages / 100)}
          </p>
        </div>
      </div>

      <WagesTable summaries={wageSummaries} />
    </div>
  )
}
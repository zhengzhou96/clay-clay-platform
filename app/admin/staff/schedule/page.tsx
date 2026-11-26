import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns'
import WeeklyCalendar from './components/WeeklyCalendar'
import ShiftModal from './components/ShiftModal'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  const params = await searchParams
  const weekParam = params.week
  const weekStart = weekParam ? parseISO(weekParam) : startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  // Fetch employees and shifts for the week
  const [{ data: employees }, { data: shifts }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, employee_code, full_name, hourly_wage_cents, status, hire_date')
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('shifts')
      .select('id, employee_id, date, start_time, end_time, status, break_minutes, notes, published_at, published_by')
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .order('date')
      .order('start_time'),
  ])

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Weekly Schedule</h1>
          <p className="page-subtitle">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = `/admin/staff/schedule?week=${format(subWeeks(weekStart, 1), 'yyyy-MM-dd')}`}
              className="btn btn-outline btn-sm"
              aria-label="Previous week"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="font-medium text-clay-900 whitespace-nowrap">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => window.location.href = `/admin/staff/schedule?week=${format(addWeeks(weekStart, 1), 'yyyy-MM-dd')}`}
              className="btn btn-outline btn-sm"
              aria-label="Next week"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = `/admin/staff/schedule?week=${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')}`}
              className="btn btn-outline btn-sm hidden sm:inline-flex"
            >
              This Week
            </button>
            <button className="btn btn-primary btn-sm" id="add-shift-btn">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Shift
            </button>
          </div>
        </div>
      </div>

      <WeeklyCalendar
        weekStart={weekStart}
        employees={employees || []}
        shifts={shifts || []}
      />

      <ShiftModal employees={employees || []} weekStart={weekStart} />
    </div>
  )
}
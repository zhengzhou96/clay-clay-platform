import { format } from 'date-fns'

interface DashboardStatsProps {
  stats: {
    currentlyWorking: number
    scheduledToday: number
    lateNotCheckedIn: Array<{
      employee_id: string
      employee_name: string
      employee_code: string
      shift_id: string
      shift_start: string
      minutes_late: number
      alert_type: 'late' | 'not_checked_in'
    }>
    todayActualHours: number
    todayEstimatedCost: number
    monthEstimatedCost: number
  }
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Currently Working"
        value={stats.currentlyWorking}
        icon={<UsersIcon />}
        trend={{ value: '+2', label: 'vs yesterday' }}
      />
      <StatCard
        title="Scheduled Today"
        value={stats.scheduledToday}
        icon={<CalendarIcon />}
        trend={{ value: stats.lateNotCheckedIn.length.toString(), label: 'alerts' }}
        trendNegative={stats.lateNotCheckedIn.length > 0}
      />
      <StatCard
        title="Today's Actual Hours"
        value={stats.todayActualHours.toFixed(1)}
        suffix="hrs"
        icon={<ClockIcon />}
      />
      <StatCard
        title="Today's Est. Labour Cost"
        value={formatCurrency(stats.todayEstimatedCost)}
        icon={<DollarSignIcon />}
        trend={{ value: formatCurrency(stats.monthEstimatedCost), label: 'Month to date' }}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  trend,
  trendNegative = false,
}: {
  title: string
  value: string | number
  suffix?: string
  icon: React.ReactNode
  trend?: { value: string; label: string }
  trendNegative?: boolean
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="stat-value">{value}</span>
            {suffix && <span className="text-clay-500 text-lg font-medium">{suffix}</span>}
          </div>
          {trend && (
            <div className={`stat-change ${trendNegative ? 'stat-change-negative' : 'stat-change-positive'}`}>
              <span>{trend.value}</span>
              <span className="text-clay-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-clay-100 flex items-center justify-center text-clay-600">
          {Icon}
        </div>
      </div>
    </div>
  )
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm9-4.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function DollarSignIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
'use client'

import { useState, useMemo } from 'react'
import type { Employee, Attendance, Shift, WageRate } from '@/types'

interface StaffHoursClientProps {
  employee: Employee
  attendances: Attendance[]
  shifts: Shift[]
  wageRates: WageRate[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function StaffHoursClient({ attendances, shifts, wageRates }: StaffHoursClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list')

  // Filter attendances for selected month
  const filteredAttendances = useMemo(() => {
    return attendances.filter(a => a.date.startsWith(selectedMonth))
  }, [attendances, selectedMonth])

  // Get shift data for attendances
  const getShift = (shiftId: string | null): Shift | null => {
    if (!shiftId) return null
    return shifts.find(s => s.id === shiftId) ?? null
  }

  // Calculate scheduled hours from shift
  const getScheduledHours = (shift: Shift | null): number | null => {
    if (!shift) return null
    const start = new Date(`2000-01-01T${shift.start_time}`)
    const end = new Date(`2000-01-01T${shift.end_time}`)
    let hours = (end.getTime() - start.getTime()) / 3600000
    hours -= shift.break_minutes / 60
    return Math.max(0, hours)
  }

  // Get applicable wage rate for a date
  const getWageRateForDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return wageRates.find(wr => new Date(wr.effective_date) <= date) || null
  }

  // Monthly totals
  const monthTotals = useMemo(() => {
    let scheduledHours = 0
    let actualHours = 0
    let estimatedWages = 0

    filteredAttendances.forEach(a => {
      const shift = getShift(a.shift_id)
      const scheduled = getScheduledHours(shift)
      if (scheduled) scheduledHours += scheduled
      if (a.hours_worked) actualHours += a.hours_worked
      if (a.estimated_wages_cents) estimatedWages += a.estimated_wages_cents
    })

    return { scheduledHours, actualHours, estimatedWages }
  }, [filteredAttendances])

  // All-time totals
  const allTimeTotals = useMemo(() => {
    let scheduledHours = 0
    let actualHours = 0
    let estimatedWages = 0

    attendances.forEach(a => {
      const shift = getShift(a.shift_id)
      const scheduled = getScheduledHours(shift)
      if (scheduled) scheduledHours += scheduled
      if (a.hours_worked) actualHours += a.hours_worked
      if (a.estimated_wages_cents) estimatedWages += a.estimated_wages_cents
    })

    return { scheduledHours, actualHours, estimatedWages }
  }, [attendances])

  // Group attendances by month for summary view
  const monthlySummary = useMemo(() => {
    const grouped: Record<string, { scheduled: number; actual: number; wages: number; count: number }> = {}

    attendances.forEach(a => {
      const monthKey = a.date.substring(0, 7) // YYYY-MM
      if (!grouped[monthKey]) {
        grouped[monthKey] = { scheduled: 0, actual: 0, wages: 0, count: 0 }
      }
      const shift = getShift(a.shift_id)
      const scheduled = getScheduledHours(shift)
      if (scheduled) grouped[monthKey].scheduled += scheduled
      if (a.hours_worked) grouped[monthKey].actual += a.hours_worked
      if (a.estimated_wages_cents) grouped[monthKey].wages += a.estimated_wages_cents
      grouped[monthKey].count += 1
    })

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({
        month,
        ...data,
        monthLabel: `${MONTHS[parseInt(month.split('-')[1]) - 1]} ${month.split('-')[0]}`
      }))
  }, [attendances])

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--'
    return timeStr.substring(0, 5)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
    }).format(cents / 100)
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const getMonthOptions = () => {
    const options: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return options
  }

  const getAttendanceStatusBadge = (attendance: Attendance) => {
    const statusColors: Record<string, string> = {
      checked_in: 'badge-warning',
      checked_out: 'badge-success',
      missed: 'badge-destructive',
      late: 'badge-warning',
      unscheduled: 'badge-info',
    }
    return (
      <span className={`badge ${statusColors[attendance.status] || 'badge-default'}`}>
        {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1).replace('_', ' ')}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Hours</h1>
          <p className="page-subtitle mt-1">Track your shifts and earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth((e.target as HTMLSelectElement).value)}
            className="input w-auto"
          >
            {getMonthOptions().map(month => (
              <option key={month} value={month}>
                {MONTHS[parseInt(month.split('-')[1]) - 1]} {month.split('-')[0]}
              </option>
            ))}
          </select>
          <div className="flex bg-clay-100 rounded-lg p-1" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-clay-900 shadow-sm'
                  : 'text-clay-500 hover:text-clay-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-white text-clay-900 shadow-sm'
                  : 'text-clay-500 hover:text-clay-700'
              }`}
            >
              Summary
            </button>
          </div>
        </div>
      </div>

      {/* Month Totals Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Scheduled Hours</p>
          <p className="stat-value">{formatHours(monthTotals.scheduledHours)}</p>
          <p className="stat-change">
            <span className={monthTotals.actualHours >= monthTotals.scheduledHours ? 'stat-change-positive' : 'stat-change-negative'}>
              Actual: {formatHours(monthTotals.actualHours)}
            </span>
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Actual Hours</p>
          <p className="stat-value">{formatHours(monthTotals.actualHours)}</p>
          <p className="stat-change">
            <span className={monthTotals.actualHours >= monthTotals.scheduledHours ? 'stat-change-positive' : 'stat-change-negative'}>
              Diff: {formatHours(monthTotals.actualHours - monthTotals.scheduledHours)}
            </span>
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estimated Earnings</p>
          <p className="stat-value">{formatCurrency(monthTotals.estimatedWages)}</p>
        </div>
      </div>

      {/* All Time Summary */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Time</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-clay-50">
              <p className="text-2xl font-bold text-clay-900">{formatHours(allTimeTotals.actualHours)}</p>
              <p className="text-sm text-clay-500">Total Hours Worked</p>
            </div>
            <div className="p-4 rounded-lg bg-clay-50">
              <p className="text-2xl font-bold text-clay-900">{formatCurrency(allTimeTotals.estimatedWages)}</p>
              <p className="text-sm text-clay-500">Total Earnings</p>
            </div>
            <div className="p-4 rounded-lg bg-clay-50">
              <p className="text-2xl font-bold text-clay-900">{attendances.length}</p>
              <p className="text-sm text-clay-500">Completed Shifts</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'list' ? (
        // List View - Individual Shifts
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              Shifts in {MONTHS[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
              <span className="text-sm font-normal text-clay-500 ml-2">({filteredAttendances.length})</span>
            </h2>
          </div>
          <div className="card-content p-0">
            {filteredAttendances.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-clay-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="mt-3 text-clay-500">No completed shifts this month</p>
              </div>
            ) : (
              <div className="divide-y divide-clay-200">
                {filteredAttendances.map(attendance => {
                  const shift = getShift(attendance.shift_id)
                  const scheduledHours = getScheduledHours(shift)
                  const wageRate = getWageRateForDate(attendance.date)
                  return (
                    <div
                      key={attendance.id}
                      className="p-4 hover:bg-clay-50/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-clay-100 flex-shrink-0">
                            <p className="text-lg font-bold text-clay-900">
                              {new Date(attendance.date).getDate()}
                            </p>
                            <p className="text-xs text-clay-500">
                              {MONTHS[new Date(attendance.date).getMonth()].slice(0, 3)}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-clay-900">
                              {shift ? `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}` : 'Unscheduled Shift'}
                            </p>
                            <p className="text-sm text-clay-500">
                              {scheduledHours !== null
                                ? `Scheduled: ${formatHours(scheduledHours)}`
                                : 'No scheduled hours'}
                              {attendance.hours_worked && ` • Actual: ${formatHours(attendance.hours_worked)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:flex-row-reverse">
                          <div className="text-right">
                            <p className="text-lg font-bold text-clay-900">
                              {attendance.estimated_wages_cents
                                ? formatCurrency(attendance.estimated_wages_cents)
                                : '—'}
                            </p>
                            <p className="text-xs text-clay-500">Earned</p>
                          </div>
                          {getAttendanceStatusBadge(attendance)}
                        </div>
                      </div>
                      {shift && scheduledHours !== null && attendance.hours_worked && (
                        <div className="mt-3 pt-3 border-t border-clay-200 flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-clay-600">
                            <span className="font-medium">{formatHours(scheduledHours)}</span>
                            <span className="text-clay-400">scheduled</span>
                          </div>
                          <div className="flex items-center gap-2 text-clay-600">
                            <span className="font-medium">{formatHours(attendance.hours_worked)}</span>
                            <span className="text-clay-400">actual</span>
                          </div>
                          <div className={`flex items-center gap-2 ${attendance.hours_worked >= scheduledHours ? 'text-green-600' : 'text-red-600'}`}>
                            <span className="font-medium">
                              {attendance.hours_worked >= scheduledHours ? '+' : ''}
                              {formatHours(attendance.hours_worked - scheduledHours)}
                            </span>
                            <span className="text-clay-400">difference</span>
                          </div>
                          {wageRate && (
                            <div className="flex items-center gap-2 text-clay-500">
                              <span>Rate:</span>
                              <span className="font-medium">{formatCurrency(wageRate.hourly_rate_cents)}/hr</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Summary View - Monthly Breakdown
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Monthly Summary</h2>
          </div>
          <div className="card-content p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-head">Month</th>
                    <th className="table-head text-right">Shifts</th>
                    <th className="table-head text-right">Scheduled</th>
                    <th className="table-head text-right">Actual</th>
                    <th className="table-head text-right">Diff</th>
                    <th className="table-head text-right">Earnings</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {monthlySummary.map(({ month, monthLabel, scheduled, actual, wages, count }) => (
                    <tr key={month} className="table-row">
                      <td className="table-cell font-medium text-clay-900">{monthLabel}</td>
                      <td className="table-cell text-right text-clay-600">{count}</td>
                      <td className="table-cell text-right text-clay-600">{formatHours(scheduled)}</td>
                      <td className="table-cell text-right font-medium text-clay-900">{formatHours(actual)}</td>
                      <td className="table-cell text-right">
                        <span className={`font-medium ${actual >= scheduled ? 'text-green-600' : 'text-red-600'}`}>
                          {actual >= scheduled ? '+' : ''}{formatHours(actual - scheduled)}
                        </span>
                      </td>
                      <td className="table-cell text-right font-medium text-clay-900">{formatCurrency(wages)}</td>
                    </tr>
                  ))}
                  {monthlySummary.length === 0 && (
                    <tr>
                      <td className="table-cell text-center py-8 text-clay-500" colSpan={6}>
                        No shift data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
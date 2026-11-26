'use client'

import { useState, useMemo } from 'react'
import type { Employee, Shift, Attendance } from '@/types'

interface StaffScheduleClientProps {
  employee: Employee
  shifts: Shift[]
  attendances: Attendance[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function StaffScheduleClient({ shifts, attendances }: StaffScheduleClientProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get start of week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Get start of month
  const getMonthStart = (date: Date) => {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Get end of month
  const getMonthEnd = (date: Date) => {
    const d = new Date(date)
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    d.setHours(23, 59, 59, 999)
    return d
  }

  // Filter shifts for current view
  const filteredShifts = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      return shifts.filter(s => {
        const shiftDate = new Date(s.date)
        return shiftDate >= weekStart && shiftDate <= weekEnd
      })
    } else {
      const monthStart = getMonthStart(currentDate)
      const monthEnd = getMonthEnd(currentDate)
      return shifts.filter(s => {
        const shiftDate = new Date(s.date)
        return shiftDate >= monthStart && shiftDate <= monthEnd
      })
    }
  }, [shifts, viewMode, currentDate])

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, Shift[]> = {}
    filteredShifts.forEach(shift => {
      if (!grouped[shift.date]) grouped[shift.date] = []
      grouped[shift.date].push(shift)
    })
    return grouped
  }, [filteredShifts])

  // Get attendance for a shift
  const getAttendance = (shiftId: string) => {
    return attendances.find(a => a.shift_id === shiftId)
  }

  // Navigation functions
  const navigateWeek = (direction: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + direction * 7)
      return d
    })
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + direction)
      return d
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--'
    return timeStr.substring(0, 5)
  }

  const getShiftStatusBadge = (shift: Shift) => {
    const statusColors: Record<string, string> = {
      scheduled: 'badge-default',
      published: 'badge-info',
      cancelled: 'badge-destructive',
      completed: 'badge-success',
    }
    return (
      <span className={`badge ${statusColors[shift.status] || 'badge-default'}`}>
        {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
      </span>
    )
  }

  const getAttendanceStatus = (shift: Shift) => {
    const attendance = getAttendance(shift.id)
    if (!attendance) return null
    if (attendance.actual_in && !attendance.actual_out) return 'checked_in'
    if (attendance.actual_out) return 'checked_out'
    if (attendance.status === 'missed') return 'missed'
    return attendance.status
  }

  const getViewTitle = () => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Schedule</h1>
          <p className="page-subtitle mt-1">View your assigned shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-clay-100 rounded-lg p-1" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-clay-900 shadow-sm'
                  : 'text-clay-500 hover:text-clay-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-clay-900 shadow-sm'
                  : 'text-clay-500 hover:text-clay-700'
              }`}
            >
              Month
            </button>
          </div>
          <button
            onClick={goToToday}
            className="btn btn-outline btn-sm"
          >
            Today
          </button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="card">
          <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="card-title">{getViewTitle()}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek(-1)}
                className="btn btn-ghost btn-sm"
                aria-label="Previous week"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navigateWeek(1)}
                className="btn btn-ghost btn-sm"
                aria-label="Next week"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="card-content p-0 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Week Header */}
              <div className="grid grid-cols-7 border-b border-clay-200 bg-clay-50">
                {DAYS.map((day, index) => {
                  const date = new Date(getWeekStart(currentDate))
                  date.setDate(date.getDate() + index)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const dateStr = date.toISOString().split('T')[0]
                  const dayShifts = shiftsByDate[dateStr] || []
                  return (
                    <div
                      key={day}
                      className={`p-3 text-center border-r border-clay-200 last:border-r-0 ${
                        isToday ? 'bg-clay-100' : ''
                      }`}
                    >
                      <div className="text-xs font-medium text-clay-500 uppercase">{day}</div>
                      <div className={`text-lg font-bold mt-1 ${isToday ? 'text-clay-600' : 'text-clay-900'}`}>
                        {date.getDate()}
                      </div>
                      {dayShifts.length > 0 && (
                        <div className="mt-1 text-xs text-clay-500">
                          {dayShifts.length} shift{dayShifts.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Week Content */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {DAYS.map((_, index) => {
                  const date = new Date(getWeekStart(currentDate))
                  date.setDate(date.getDate() + index)
                  const dateStr = date.toISOString().split('T')[0]
                  const dayShifts = shiftsByDate[dateStr] || []
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={index}
                      className={`relative border-r border-clay-200 last:border-r-0 p-2 ${isToday ? 'bg-clay-50/50' : ''}`}
                    >
                      {dayShifts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-clay-300">
                          <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">No shifts</span>
                        </div>
                      ) : (
                        <div className="space-y-2 h-full">
                          {dayShifts.map(shift => {
                            const attendance = getAttendance(shift.id)
                            const status = getAttendanceStatus(shift)
                            const statusColors = {
                              checked_in: 'bg-green-100 border-green-300',
                              checked_out: 'bg-blue-100 border-blue-300',
                              missed: 'bg-red-100 border-red-300',
                              late: 'bg-yellow-100 border-yellow-300',
                              unscheduled: 'bg-purple-100 border-purple-300',
                            }
                            const bgColor = status ? statusColors[status] : 'bg-white border-clay-200'
                            return (
                              <div
                                key={shift.id}
                                className={`relative p-3 rounded-lg border ${bgColor} transition-all`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-clay-900 truncate">
                                      {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                    </p>
                                    {shift.break_minutes > 0 && (
                                      <p className="text-xs text-clay-500">{shift.break_minutes}min break</p>
                                    )}
                                  </div>
                                  {getShiftStatusBadge(shift)}
                                </div>
                                {attendance && (
                                  <div className="mt-2 pt-2 border-t border-current/20 space-y-1 text-xs">
                                    {attendance.actual_in && (
                                      <div className="flex items-center gap-1 text-green-700">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>In: {formatTime(attendance.actual_in)}</span>
                                      </div>
                                    )}
                                    {attendance.actual_out && (
                                      <div className="flex items-center gap-1 text-blue-700">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Out: {formatTime(attendance.actual_out)}</span>
                                      </div>
                                    )}
                                    {attendance.hours_worked && (
                                      <div className="text-clay-600 font-medium">
                                        {attendance.hours_worked.toFixed(2)}h worked
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
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="card">
          <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="card-title">{getViewTitle()}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="btn btn-ghost btn-sm"
                aria-label="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="btn btn-ghost btn-sm"
                aria-label="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="card-content p-0 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Month Header */}
              <div className="grid grid-cols-7 border-b border-clay-200 bg-clay-50">
                {DAYS.map(day => (
                  <div key={day} className="p-3 text-center text-xs font-medium text-clay-500 uppercase border-r border-clay-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7">
                {(() => {
                  const monthStart = getMonthStart(currentDate)
                  const firstDayOfWeek = monthStart.getDay()
                  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
                  const totalCells = firstDayOfWeek + daysInMonth
                  const rows = Math.ceil(totalCells / 7)
                  const cells = []

                  for (let i = 0; i < rows * 7; i++) {
                    const dayIndex = i - firstDayOfWeek + 1
                    if (dayIndex < 1 || dayIndex > daysInMonth) {
                      cells.push(<div key={`empty-${i}`} className="min-h-[100px] border-r border-clay-200 border-b border-clay-200 bg-clay-50/50" />)
                    } else {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayIndex)
                      const dateStr = date.toISOString().split('T')[0]
                      const dayShifts = shiftsByDate[dateStr] || []
                      const isToday = date.toDateString() === new Date().toDateString()
                      cells.push(
                        <div
                          key={dateStr}
                          className={`relative min-h-[100px] border-r border-clay-200 border-b border-clay-200 p-2 ${isToday ? 'bg-clay-50' : ''}`}
                        >
                          <div className={`text-sm font-medium ${isToday ? 'text-clay-600 bg-white px-1.5 py-0.5 rounded inline-block' : 'text-clay-900'}`}>
                            {dayIndex}
                          </div>
                          {dayShifts.length > 0 && (
                            <div className="mt-1 space-y-1 max-h-[70px] overflow-y-auto">
                              {dayShifts.slice(0, 3).map(shift => {
                                const status = getAttendanceStatus(shift)
                                const statusColors = {
                                  checked_in: 'bg-green-100 border-green-300',
                                  checked_out: 'bg-blue-100 border-blue-300',
                                  missed: 'bg-red-100 border-red-300',
                                  late: 'bg-yellow-100 border-yellow-300',
                                  unscheduled: 'bg-purple-100 border-purple-300',
                                }
                                const bgColor = status ? statusColors[status] : 'bg-white border-clay-200'
                                return (
                                  <div
                                    key={shift.id}
                                    className={`p-1.5 rounded border text-xs ${bgColor} truncate`}
                                    title={`${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`}
                                  >
                                    {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                                  </div>
                                )
                              })}
                              {dayShifts.length > 3 && (
                                <div className="text-xs text-clay-500 text-center">+{dayShifts.length - 3} more</div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  }
                  return cells
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="card">
        <div className="card-content">
          <h3 className="text-sm font-medium text-clay-900 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border bg-white border-clay-200"></span>
              <span className="text-clay-600">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
              <span className="text-clay-600">Checked In</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>
              <span className="text-clay-600">Checked Out</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span>
              <span className="text-clay-600">Missed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span>
              <span className="text-clay-600">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span>
              <span className="text-clay-600">Unscheduled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
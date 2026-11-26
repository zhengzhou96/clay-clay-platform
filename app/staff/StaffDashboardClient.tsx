'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Employee, Shift, Attendance } from '@/types'

interface StaffDashboardClientProps {
  employee: Employee
  todayShift: Shift | null
  nextShift: Shift | null
  currentAttendance: Attendance | null
  monthHours: number
  monthWages: number
  hourlyRateCents: number
}

export function StaffDashboardClient({
  employee,
  todayShift,
  nextShift,
  currentAttendance,
  monthHours,
  monthWages,
  hourlyRateCents,
}: StaffDashboardClientProps) {
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00')
  const [isClocking, setIsClocking] = useState(false)
  const [showConfirm, setShowConfirm] = useState<'in' | 'out' | null>(null)
  const supabase = createClient()

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!currentAttendance?.actual_in) return

    const startTime = currentAttendance.actual_in
    const updateElapsed = () => {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      const diff = now - start
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [currentAttendance?.actual_in])

  const handleClockIn = async () => {
    if (isClocking) return
    setShowConfirm('in')
  }

  const handleClockOut = async () => {
    if (isClocking) return
    setShowConfirm('out')
  }

  const confirmAction = async (type: 'in' | 'out') => {
    setIsClocking(true)
    setShowConfirm(null)

    try {
      if (type === 'in') {
        // Check for existing open attendance
        const { data: existing } = await supabase
          .from('attendances')
          .select('id')
          .eq('employee_id', employee.id)
          .is('actual_out', null)
          .single()

        if (existing) {
          ;(globalThis as any).window?.alert?.('You are already clocked in')
          setIsClocking(false)
          return
        }

        const shiftId = todayShift?.id || null
        const scheduledIn = todayShift?.start_time || null
        const scheduledOut = todayShift?.end_time || null

        const { error } = await supabase
          .from('attendances')
          .insert({
            employee_id: employee.id,
            shift_id: shiftId,
            date: new Date().toISOString().split('T')[0],
            scheduled_in: scheduledIn,
            scheduled_out: scheduledOut,
            actual_in: new Date().toISOString(),
            status: 'checked_in',
          })

        if (error) throw error
      } else {
        // Clock out - update the open attendance
        const { error } = await supabase
          .from('attendances')
          .update({
            actual_out: new Date().toISOString(),
            status: 'checked_out',
          })
          .eq('employee_id', employee.id)
          .is('actual_out', null)

        if (error) throw error
      }

      // Refresh page to show updated state
      ;(globalThis as any).window?.location?.reload()
    } catch (error) {
      console.error('Clock action failed:', error)
      ;(globalThis as any).window?.alert?.('Failed to clock ' + type + '. Please try again.')
      setIsClocking(false)
    }
  }

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

  const getShiftStatusBadge = (shift: Shift | null) => {
    if (!shift) return null
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {employee.full_name.split(' ')[0]}</h1>
          <p className="page-subtitle mt-1">{employee.employee_code} • {employee.wage_rate_type === 'salary' ? 'Salary' : 'Hourly'}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-clay-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>Online</span>
        </div>
      </div>

      {/* Today's Shift Card */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="card-title">Today's Shift</h2>
            <p className="card-description">Scheduled for {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          </div>
          {todayShift && getShiftStatusBadge(todayShift)}
        </div>
        <div className="card-content">
          {todayShift ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-clay-50">
                  <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">Start Time</p>
                  <p className="text-2xl font-bold text-clay-900 mt-1">{formatTime(todayShift.start_time)}</p>
                </div>
                <div className="p-4 rounded-lg bg-clay-50">
                  <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">End Time</p>
                  <p className="text-2xl font-bold text-clay-900 mt-1">{formatTime(todayShift.end_time)}</p>
                </div>
              </div>
              {todayShift.break_minutes > 0 && (
                <div className="flex items-center gap-2 text-sm text-clay-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Break: {todayShift.break_minutes} minutes</span>
                </div>
              )}
              {todayShift.notes && (
                <div className="p-3 rounded-lg bg-clay-50 border border-clay-200">
                  <p className="text-sm text-clay-700">{todayShift.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-clay-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-3 text-clay-500">No shift scheduled for today</p>
              <p className="text-sm text-clay-400 mt-1">Enjoy your day off!</p>
            </div>
          )}
        </div>
      </div>

      {/* Clock In/Out - Primary Action */}
      <div className="card">
        <div className="card-content pt-0">
          {currentAttendance && !currentAttendance.actual_out ? (
            // Clocked In State
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-clay-500 mb-2">Clocked In</p>
                <p className="text-sm text-clay-500">Since {formatTime(currentAttendance.actual_in)}</p>
                <p className="text-5xl font-mono font-bold text-clay-900 tabular-nums mt-2">{elapsedTime}</p>
                <p className="text-xs text-clay-400 mt-1">Elapsed time</p>
              </div>
              <button
                onClick={handleClockOut}
                disabled={isClocking}
                className="btn btn-destructive btn-lg w-full py-4 text-lg"
              >
                {isClocking ? 'Clocking Out...' : 'Clock Out'}
              </button>
            </div>
          ) : (
            // Clocked Out State
            <div className="space-y-4">
              {todayShift ? (
                <>
                  <div className="text-center py-4">
                    <p className="text-sm text-clay-500 mb-2">Ready to start your shift?</p>
                    <p className="text-clay-900 font-medium">
                      Shift: {formatTime(todayShift.start_time)} – {formatTime(todayShift.end_time)}
                    </p>
                  </div>
                  <button
                    onClick={handleClockIn}
                    disabled={isClocking}
                    className="btn btn-primary btn-lg w-full py-4 text-lg"
                  >
                    {isClocking ? 'Clocking In...' : 'Clock In'}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-clay-500">No shift scheduled today</p>
                  <button
                    onClick={handleClockIn}
                    disabled={isClocking}
                    className="btn btn-outline btn-lg w-full mt-4"
                  >
                    {isClocking ? 'Clocking In...' : 'Clock In (Unscheduled)'}
                  </button>
                  <p className="text-xs text-clay-400 mt-2">Creates an unscheduled attendance record</p>
                </div>
              )}
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="card w-full max-w-sm">
                <div className="card-content space-y-4">
                  <div className="text-center">
                    <p className="text-lg font-medium text-clay-900">
                      {showConfirm === 'in' ? 'Confirm Clock In?' : 'Confirm Clock Out?'}
                    </p>
                    <p className="text-sm text-clay-500 mt-1">
                      {showConfirm === 'in'
                        ? 'This will start your shift timer.'
                        : 'This will end your shift and calculate hours worked.'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirm(null)}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmAction(showConfirm)}
                      disabled={isClocking}
                      className={`btn flex-1 ${showConfirm === 'in' ? 'btn-primary' : 'btn-destructive'}`}
                    >
                      {isClocking ? 'Processing...' : (showConfirm === 'in' ? 'Clock In' : 'Clock Out')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Upcoming Shift */}
      {nextShift && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <svg className="w-5 h-5 text-clay-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Next Upcoming Shift
            </h2>
          </div>
          <div className="card-content">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-clay-100">
                  <p className="text-2xl font-bold text-clay-900">{new Date(nextShift.date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric' })}</p>
                  <p className="text-xs text-clay-500">{new Date(nextShift.date).toLocaleDateString('en-SG', { month: 'short' })}</p>
                </div>
                <div>
                  <p className="text-sm text-clay-500">{formatTime(nextShift.start_time)} – {formatTime(nextShift.end_time)}</p>
                  <p className="text-xs text-clay-400">{nextShift.break_minutes > 0 ? `${nextShift.break_minutes}min break` : 'No break'}</p>
                </div>
              </div>
              {getShiftStatusBadge(nextShift)}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="stat-label">Hours This Month</p>
          <p className="stat-value">{formatHours(monthHours)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estimated Wages</p>
          <p className="stat-value">{formatCurrency(monthWages)}</p>
        </div>
      </div>

      {/* Hourly Rate Info */}
      <div className="card">
        <div className="card-content">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-clay-100">
                <svg className="w-5 h-5 text-clay-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-clay-500">Current Hourly Rate</p>
                <p className="text-lg font-bold text-clay-900">{formatCurrency(hourlyRateCents)}/hr</p>
              </div>
            </div>
            <span className="badge badge-secondary">SGD</span>
          </div>
        </div>
      </div>
    </div>
  )
}
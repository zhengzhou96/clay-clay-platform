'use client'

import { format } from 'date-fns'

interface ScheduledTodayProps {
  shifts: Array<{
    id: string
    employee_id: string
    date: string
    start_time: string
    end_time: string
    status: string
    break_minutes: number
  }>
  employees: Array<{
    id: string
    employee_code: string
    full_name: string
    hourly_wage_cents: number
    status: string
  }>
  attendances: Array<{
    id: string
    employee_id: string
    shift_id: string | null
    date: string
    actual_in: string | null
    actual_out: string | null
    hours_worked: number | null
    estimated_wages_cents: number | null
    status: string
  }>
}

export default function ScheduledToday({ shifts, employees, attendances }: ScheduledTodayProps) {
  const employeeMap = new Map(employees.map(e => [e.id, e]))
  const attendanceMap = new Map<string, typeof attendances[0]>()
  attendances.forEach(a => {
    if (a.shift_id) attendanceMap.set(a.shift_id, a)
  })

  const scheduledShifts = shifts.filter(s => s.status === 'published' || s.status === 'scheduled')

  if (scheduledShifts.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Scheduled Today</h3>
          <p className="card-description">Employees with shifts today</p>
        </div>
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-clay-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-clay-600">No shifts scheduled today</p>
            <p className="text-sm text-clay-400 mt-1">Add shifts from the Schedule page</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Scheduled Today ({scheduledShifts.length})</h3>
        <p className="card-description">Employees with shifts today</p>
      </div>
      <div className="card-content p-0">
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-head">Employee</th>
                <th className="table-head hidden sm:table-cell">Shift</th>
                <th className="table-head hidden md:table-cell">Hours</th>
                <th className="table-head">Status</th>
              </tr>
            </thead>
            <tbody className="table-body divide-y divide-clay-100">
              {scheduledShifts.map(shift => {
                const employee = employeeMap.get(shift.employee_id)
                const attendance = attendanceMap.get(shift.id)
                const startTime = new Date(`${shift.date}T${shift.start_time}`)
                const endTime = new Date(`${shift.date}T${shift.end_time}`)
                const scheduledHours = (endTime.getTime() - startTime.getTime() - shift.break_minutes * 60000) / 3600000
                
                let statusBadge: React.ReactNode
                if (attendance?.actual_in && attendance?.actual_out) {
                  statusBadge = <span className="badge badge-success">Completed</span>
                } else if (attendance?.actual_in && !attendance?.actual_out) {
                  statusBadge = <span className="badge badge-info">Working</span>
                } else {
                  const now = new Date()
                  if (now > endTime) {
                    statusBadge = <span className="badge badge-destructive">Missed</span>
                  } else if (now > startTime) {
                    statusBadge = <span className="badge badge-warning">In Progress</span>
                  } else {
                    statusBadge = <span className="badge badge-secondary">Upcoming</span>
                  }
                }

                return (
                  <tr key={shift.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-clay-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-clay-700">
                            {employee?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-clay-900">{employee?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-clay-500">{employee?.employee_code || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <div className="text-sm">
                        <p className="font-medium text-clay-900">
                          {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}
                        </p>
                        {shift.break_minutes > 0 && (
                          <p className="text-xs text-clay-500">
                            {shift.break_minutes}min break
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="font-mono text-clay-700">{scheduledHours.toFixed(1)}h</span>
                    </td>
                    <td className="table-cell">{statusBadge}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
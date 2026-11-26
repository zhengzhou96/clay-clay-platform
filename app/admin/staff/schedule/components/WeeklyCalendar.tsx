'use client'

import { useState } from 'react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { Trash2, Edit, AlertTriangle, Calendar } from 'lucide-react'

interface WeeklyCalendarProps {
  weekStart: Date
  employees: Array<{
    id: string
    employee_code: string
    full_name: string
    hourly_wage_cents: number
    status: string
    hire_date: string
  }>
  shifts: Array<{
    id: string
    employee_id: string
    date: string
    start_time: string
    end_time: string
    status: string
    break_minutes: number
    notes: string | null
    published_at: string | null
    published_by: string | null
  }>
}

export default function WeeklyCalendar({ weekStart, employees, shifts }: WeeklyCalendarProps) {
  const [selectedShift, setSelectedShift] = useState<typeof shifts[0] | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Generate days of the week (Mon-Sun)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const shiftsByEmployeeAndDay = new Map<string, Map<string, typeof shifts>>()
  shifts.forEach(shift => {
    const empShifts = shiftsByEmployeeAndDay.get(shift.employee_id) || new Map()
    const dayShifts = empShifts.get(shift.date) || []
    dayShifts.push(shift)
    empShifts.set(shift.date, dayShifts)
    shiftsByEmployeeAndDay.set(shift.employee_id, empShifts)
  })

  const getShiftColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-clay-100 text-clay-800 border-clay-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Published'
      case 'scheduled': return 'Draft'
      case 'cancelled': return 'Cancelled'
      case 'completed': return 'Completed'
      default: return status
    }
  }

  const formatTime = (time: string) => {
    return format(parseISO(`2000-01-01T${time}`), 'h:mm a')
  }

  const handleShiftClick = (shift: typeof shifts[0], e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedShift(shift)
  }

  const handleCellClick = (employeeId: string, date: Date) => {
    // Could open modal to add shift
    console.log('Add shift for', employeeId, format(date, 'yyyy-MM-dd'))
  }

  const checkOverlap = (employeeId: string, date: string, startTime: string, endTime: string, excludeId?: string) => {
    const empShifts = shiftsByEmployeeAndDay.get(employeeId)
    if (!empShifts) return null
    
    const dayShifts = empShifts.get(date) || []
    const newStart = parseISO(`2000-01-01T${startTime}`).getTime()
    const newEnd = parseISO(`2000-01-01T${endTime}`).getTime()
    
    return dayShifts.find(s => 
      s.id !== excludeId &&
      s.status !== 'cancelled' &&
      parseISO(`2000-01-01T${s.start_time}`).getTime() < newEnd &&
      parseISO(`2000-01-01T${s.end_time}`).getTime() > newStart
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Header row with days */}
      <div className="border-b border-clay-200 bg-clay-50">
        <div className="w-48 border-r border-clay-200 flex-shrink-0" />
        <div className="flex overflow-x-auto min-w-0">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`w-40 sm:w-48 flex-shrink-0 px-3 py-3 border-r border-clay-200 ${
                isSameDay(day, new Date()) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="text-center">
                <p className="text-xs font-medium text-clay-500 uppercase tracking-wide">
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-clay-900'}`}>
                  {format(day, 'd')}
                </p>
                <p className="text-xs text-clay-500">{format(day, 'MMM')}</p>
                {isSameDay(day, new Date()) && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                    <Calendar className="w-3 h-3" />
                    Today
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee rows */}
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full min-w-max">
          <tbody>
            {employees.map((employee, empIndex) => (
              <tr key={employee.id} className={empIndex % 2 === 0 ? 'bg-white' : 'bg-clay-50/50'}>
                {/* Employee name column */}
                <td className="w-48 border-r border-clay-200 sticky left-0 z-10 bg-inherit">
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-clay-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-clay-700">
                          {employee.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-clay-900 truncate">{employee.full_name}</p>
                        <p className="text-xs text-clay-500 truncate">{employee.employee_code}</p>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Day columns */}
                <td className="relative">
                  <div className="flex min-w-max">
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const dayShifts = shiftsByEmployeeAndDay.get(employee.id)?.get(dateStr) || []
                      const hasOverlap = dayShifts.some(s => 
                        checkOverlap(employee.id, dateStr, s.start_time, s.end_time, s.id)
                      )

                      return (
                        <div
                          key={`${employee.id}-${dateStr}`}
                          className={`w-40 sm:w-48 flex-shrink-0 border-r border-clay-200 relative ${
                            isSameDay(day, new Date()) ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => handleCellClick(employee.id, day)}
                        >
                          {dayShifts.length === 0 ? (
                            <div className="h-24 sm:h-32 flex items-center justify-center">
                              <div className="w-full h-full border-2 border-dashed border-clay-200 rounded-lg flex items-center justify-center hover:border-clay-300 transition-colors" />
                            </div>
                          ) : (
                            <div className="p-1.5 h-full min-h-[96px] sm:min-h-[128px] space-y-1">
                              {dayShifts.map((shift) => {
                                const overlap = checkOverlap(employee.id, dateStr, shift.start_time, shift.end_time, shift.id)
                                return (
                                  <div
                                    key={shift.id}
                                    className={`relative ${getShiftColor(shift.status)} border rounded-lg p-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${overlap ? 'ring-2 ring-red-400' : ''}`}
                                    onClick={(e) => handleShiftClick(shift, e)}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                        </p>
                                        {shift.break_minutes > 0 && (
                                          <p className="text-[10px] opacity-80">
                                            {shift.break_minutes}min break
                                          </p>
                                        )}
                                        {shift.notes && (
                                          <p className="text-[10px] opacity-80 truncate mt-0.5">
                                            {shift.notes}
                                          </p>
                                        )}
                                      </div>
                                      {overlap && (
                                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/30">
                                      <span className="text-[10px] font-medium capitalize">
                                        {getStatusLabel(shift.status)}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedShift(shift)
                                          }}
                                          className="p-1 rounded hover:bg-white/30 transition-colors"
                                          aria-label="Edit shift"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setShowDeleteConfirm(shift.id)
                                          }}
                                          className="p-1 rounded hover:bg-white/30 transition-colors text-red-600"
                                          aria-label="Delete shift"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {hasOverlap && (
                            <div className="absolute bottom-1 left-1 right-1 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Overlapping shifts
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}

            {employees.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-clay-400" />
                    </div>
                    <p className="text-clay-600">No employees found</p>
                    <p className="text-sm text-clay-400">Add employees from the Employees page</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected shift detail panel */}
      {selectedShift && (
        <div className="border-t border-clay-200 bg-clay-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-clay-900">
                {employees.find(e => e.id === selectedShift.employee_id)?.full_name || 'Unknown'}
              </p>
              <p className="text-sm text-clay-600">
                {format(new Date(selectedShift.date), 'EEEE, MMMM d, yyyy')} •
                {formatTime(selectedShift.start_time)} – {formatTime(selectedShift.end_time)}
              </p>
              {selectedShift.notes && (
                <p className="text-sm text-clay-500 mt-1">{selectedShift.notes}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-clay-500">
                <span className={`badge ${getShiftColor(selectedShift.status).replace('bg-', 'badge-').replace('text-', '').replace('border-', '')}`}>
                  {getStatusLabel(selectedShift.status)}
                </span>
                {selectedShift.break_minutes > 0 && (
                  <span>{selectedShift.break_minutes}min break</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedShift(null)}
              className="p-2 rounded-lg text-clay-500 hover:bg-white hover:text-clay-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-clay-900 mb-2">Delete Shift</h3>
            <p className="text-clay-600 mb-6">
              Are you sure you want to delete this shift? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement delete
                  setShowDeleteConfirm(null)
                }}
                className="btn btn-destructive btn-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
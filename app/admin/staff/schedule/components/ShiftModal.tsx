'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { X, XCircle, Copy, Plus } from 'lucide-react'

// Type declaration for confirm
declare const confirm: (message: string) => boolean

interface ShiftModalProps {
  employees: Array<{
    id: string
    employee_code: string
    full_name: string
    hourly_wage_cents: number
    status: string
    hire_date: string
  }>
  weekStart: Date
}

export default function ShiftModal({ employees, weekStart }: ShiftModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<{
    id?: string
    employee_id: string
    date: string
    start_time: string
    end_time: string
    status: 'scheduled' | 'published'
    break_minutes: number
    notes: string
  } | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    date: format(weekStart, 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    status: 'scheduled' as 'scheduled' | 'published',
    break_minutes: 60,
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

  const openModal = (shift?: typeof editingShift) => {
    if (shift) {
      setEditingShift(shift)
      setFormData({
        employee_id: shift.employee_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status,
        break_minutes: shift.break_minutes,
        notes: shift.notes || '',
      })
    } else {
      setEditingShift(null)
      setFormData({
        employee_id: '',
        date: format(weekStart, 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '17:00',
        status: 'scheduled',
        break_minutes: 60,
        notes: '',
      })
    }
    setErrors({})
    setOverlapWarning(null)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setEditingShift(null)
    setErrors({})
    setOverlapWarning(null)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.employee_id) newErrors.employee_id = 'Employee is required'
    if (!formData.date) newErrors.date = 'Date is required'
    if (!formData.start_time) newErrors.start_time = 'Start time is required'
    if (!formData.end_time) newErrors.end_time = 'End time is required'
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = 'End time must be after start time'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkOverlap = () => {
    // This would check against existing shifts
    // For now, just a placeholder
    setOverlapWarning(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    checkOverlap()
    if (overlapWarning && !confirm(`${overlapWarning}. Continue anyway?`)) {
      return
    }

    // TODO: Submit to API
    console.log('Submit shift:', { ...formData, id: editingShift?.id })
    closeModal()
  }

  const handleCopyShift = () => {
    // TODO: Implement copy to another date
    console.log('Copy shift')
  }

  const handleDuplicateWeek = () => {
    // TODO: Implement duplicate previous week
    console.log('Duplicate week')
  }

  if (!isOpen) return null

  const scheduledHours = formData.start_time && formData.end_time
    ? (parseISO(`2000-01-01T${formData.end_time}`).getTime() - parseISO(`2000-01-01T${formData.start_time}`).getTime()) / 3600000 - formData.break_minutes / 60
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-clay-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-clay-900">
            {editingShift ? 'Edit Shift' : 'Add Shift'}
          </h2>
          <button onClick={closeModal} className="p-2 rounded-lg text-clay-500 hover:bg-clay-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Employee */}
          <div>
            <label htmlFor="employee_id" className="label">Employee *</label>
            <select
              id="employee_id"
              value={formData.employee_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
              className={`input ${errors.employee_id ? 'input-error' : ''}`}
              required
            >
              <option value="">Select employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </select>
            {errors.employee_id && <p className="text-red-500 text-sm mt-1">{errors.employee_id}</p>}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="label">Date *</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className={`input ${errors.date ? 'input-error' : ''}`}
              required
            />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
          </div>

          {/* Time range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start_time" className="label">Start Time *</label>
              <input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ ...prev, start_time: e.target.value }))
                  checkOverlap()
                }}
                className={`input ${errors.start_time ? 'input-error' : ''}`}
                required
              />
              {errors.start_time && <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>}
            </div>
            <div>
              <label htmlFor="end_time" className="label">End Time *</label>
              <input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ ...prev, end_time: e.target.value }))
                  checkOverlap()
                }}
                className={`input ${errors.end_time ? 'input-error' : ''}`}
                required
              />
              {errors.end_time && <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>}
            </div>
          </div>

          {/* Break minutes */}
          <div>
            <label htmlFor="break_minutes" className="label">Break (minutes)</label>
            <input
              id="break_minutes"
              type="number"
              min="0"
              max="480"
              value={formData.break_minutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, break_minutes: parseInt(e.target.value) || 0 }))}
              className="input"
            />
            <p className="text-sm text-clay-500 mt-1">
              Scheduled hours: <span className="font-medium text-clay-900">{scheduledHours.toFixed(1)}h</span>
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="scheduled"
                  checked={formData.status === 'scheduled'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, status: e.target.value as 'scheduled' | 'published' }))}
                  className="text-clay-600 focus:ring-clay-500"
                />
                <span className="text-sm text-clay-700">Draft (not visible to staff)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === 'published'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, status: e.target.value as 'scheduled' | 'published' }))}
                  className="text-clay-600 focus:ring-clay-500"
                />
                <span className="text-sm text-clay-700">Published (visible to staff)</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input min-h-[80px] resize-y"
              placeholder="Optional notes for this shift..."
            />
          </div>

          {/* Overlap warning */}
          {overlapWarning && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">{overlapWarning}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-clay-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyShift}
                className="btn btn-outline btn-sm"
                disabled={!editingShift}
              >
                <Copy className="w-4 h-4" />
                Copy to Date
              </button>
              {!editingShift && (
                <button
                  type="button"
                  onClick={handleDuplicateWeek}
                  className="btn btn-outline btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  Duplicate Week
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
              >
                {editingShift ? 'Save Changes' : 'Create Shift'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
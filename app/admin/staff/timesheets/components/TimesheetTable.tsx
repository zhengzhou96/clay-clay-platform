'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Edit, Trash2, AlertTriangle, Clock, CheckCircle, XCircle, Plus, MoreVertical } from 'lucide-react'

// Type declaration for confirm
declare const confirm: (message: string) => boolean

interface TimesheetRow {
  employee_id: string
  employee_name: string
  employee_code: string
  date: string
  scheduled_in: string | null
  scheduled_out: string | null
  actual_in: string | null
  actual_out: string | null
  hours_worked: number | null
  scheduled_hours: number | null
  estimated_wages_cents: number | null
  status: string
  attendance_id: string | null
  shift_id: string | null
  flags: string[]
}

interface TimesheetTableProps {
  rows: TimesheetRow[]
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  checked_in: { label: 'Checked In', icon: <Clock className="w-3 h-3" />, className: 'badge-info' },
  checked_out: { label: 'Checked Out', icon: <CheckCircle className="w-3 h-3" />, className: 'badge-success' },
  missed: { label: 'Missed', icon: <XCircle className="w-3 h-3" />, className: 'badge-destructive' },
  late: { label: 'Late', icon: <AlertTriangle className="w-3 h-3" />, className: 'badge-warning' },
  unscheduled: { label: 'Unscheduled', icon: <Plus className="w-3 h-3" />, className: 'badge-secondary' },
}

export default function TimesheetTable({ rows }: TimesheetTableProps) {
  const [editingRow, setEditingRow] = useState<TimesheetRow | null>(null)
  const [editForm, setEditForm] = useState({
    actual_in: '',
    actual_out: '',
    correction_reason: '',
  })

  const handleEdit = (row: TimesheetRow) => {
    setEditingRow(row)
    setEditForm({
      actual_in: row.actual_in ? format(parseISO(row.actual_in), 'HH:mm') : '',
      actual_out: row.actual_out ? format(parseISO(row.actual_out), 'HH:mm') : '',
      correction_reason: '',
    })
  }

  const handleSave = async () => {
    if (!editingRow) return
    // TODO: Submit to API
    console.log('Save attendance:', {
      id: editingRow.attendance_id,
      actual_in: editForm.actual_in ? `${editingRow.date}T${editForm.actual_in}` : null,
      actual_out: editForm.actual_out ? `${editingRow.date}T${editForm.actual_out}` : null,
      correction_reason: editForm.correction_reason,
    })
    setEditingRow(null)
  }

  const handleVoid = async (attendanceId: string | null) => {
    if (!attendanceId) return
    if (!confirm('Void this attendance record? This will mark it as voided but preserve audit history.')) return
    // TODO: Submit to API
    console.log('Void attendance:', attendanceId)
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—'
    try {
      return format(parseISO(timeStr), 'h:mm a')
    } catch {
      return timeStr
    }
  }

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return '—'
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getStatusBadge = (status: string, voided: boolean) => {
    if (voided) {
      return <span className="badge badge-secondary">Voided</span>
    }
    const config = statusConfig[status] || { label: status, icon: null, className: 'badge-default' }
    return (
      <span className={`badge ${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </span>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-clay-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m-1.5 0h1.5m-18.00 0v11.25A2.25 2.25 0 0 0 6 16.5h12.75m-18.00 0V3m0 0h18v11.25A2.25 2.25 0 0 1 18 16.5H5.25m0 0A2.25 2.25 0 0 1 3 14.25V3" />
              </svg>
            </div>
            <p className="text-clay-600">No attendance records found</p>
            <p className="text-sm text-clay-400 mt-1">Try adjusting your filters</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-head">Date</th>
              <th className="table-head">Employee</th>
              <th className="table-head hidden md:table-cell">Scheduled</th>
              <th className="table-head">Actual In</th>
              <th className="table-head">Actual Out</th>
              <th className="table-head hidden lg:table-cell">Hours Worked</th>
              <th className="table-head hidden lg:table-cell">Scheduled Hrs</th>
              <th className="table-head">Est. Wages</th>
              <th className="table-head">Status</th>
              <th className="table-head">Flags</th>
              <th className="table-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="table-body divide-y divide-clay-100">
            {rows.map(row => (
              <tr key={row.attendance_id || row.shift_id || `${row.employee_id}-${row.date}`} className="table-row">
                <td className="table-cell whitespace-nowrap">
                  <span className="font-medium text-clay-900">{format(parseISO(row.date), 'MMM d')}</span>
                  <p className="text-xs text-clay-500">{format(parseISO(row.date), 'EEE')}</p>
                </td>
                <td className="table-cell">
                  <div>
                    <p className="font-medium text-clay-900">{row.employee_name}</p>
                    <p className="text-xs text-clay-500">{row.employee_code}</p>
                  </div>
                </td>
                <td className="table-cell hidden md:table-cell">
                  {row.scheduled_in && row.scheduled_out ? (
                    <span className="text-sm text-clay-700">
                      {formatTime(row.scheduled_in)} – {formatTime(row.scheduled_out)}
                    </span>
                  ) : (
                    <span className="text-clay-400">Not scheduled</span>
                  )}
                </td>
                <td className="table-cell whitespace-nowrap">
                  {editingRow?.attendance_id === row.attendance_id ? (
                    <input
                      type="time"
                      value={editForm.actual_in}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({ ...prev, actual_in: e.target.value }))}
                      className="input w-32"
                    />
                  ) : (
                    formatTime(row.actual_in)
                  )}
                </td>
                <td className="table-cell whitespace-nowrap">
                  {editingRow?.attendance_id === row.attendance_id ? (
                    <input
                      type="time"
                      value={editForm.actual_out}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({ ...prev, actual_out: e.target.value }))}
                      className="input w-32"
                    />
                  ) : (
                    formatTime(row.actual_out)
                  )}
                </td>
                <td className="table-cell hidden lg:table-cell">
                  {row.hours_worked !== null ? (
                    <span className="font-mono font-medium text-clay-900">{row.hours_worked.toFixed(2)}h</span>
                  ) : (
                    <span className="text-clay-400">—</span>
                  )}
                </td>
                <td className="table-cell hidden lg:table-cell">
                  {row.scheduled_hours !== null ? (
                    <span className="font-mono text-clay-700">{row.scheduled_hours.toFixed(2)}h</span>
                  ) : (
                    <span className="text-clay-400">—</span>
                  )}
                </td>
                <td className="table-cell whitespace-nowrap">
                  {formatCurrency(row.estimated_wages_cents)}
                </td>
                <td className="table-cell">
                  {getStatusBadge(row.status, row.flags.includes('Voided'))}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {row.flags.map(flag => (
                      <span key={flag} className="badge badge-warning text-[10px]">
                        {flag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="table-cell text-right">
                  {editingRow?.attendance_id === row.attendance_id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSave}
                        className="btn btn-primary btn-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingRow(null)}
                        className="btn btn-outline btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {row.attendance_id && (
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100"
                          aria-label="Edit attendance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {row.attendance_id && !row.flags.includes('Voided') && (
                        <button
                          onClick={() => handleVoid(row.attendance_id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Void attendance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
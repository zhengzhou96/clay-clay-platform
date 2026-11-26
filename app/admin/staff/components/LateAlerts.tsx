'use client'

import { AlertTriangle, AlertCircle, Clock } from 'lucide-react'

interface LateAlertsProps {
  alerts: Array<{
    employee_id: string
    employee_name: string
    employee_code: string
    shift_id: string
    shift_start: string
    minutes_late: number
    alert_type: 'late' | 'not_checked_in'
  }>
}

export default function LateAlerts({ alerts }: LateAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="card border-yellow-200 bg-yellow-50">
      <div className="card-header bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-700" />
          </div>
          <div>
            <h3 className="card-title text-yellow-900">Attendance Alerts</h3>
            <p className="card-description text-yellow-700">
              {alerts.length} employee{alerts.length !== 1 ? 's' : ''} need attention
            </p>
          </div>
        </div>
      </div>
      <div className="card-content p-0">
        <div className="table-container">
          <table className="table">
            <thead className="table-header bg-yellow-50">
              <tr>
                <th className="table-head">Employee</th>
                <th className="table-head">Shift Start</th>
                <th className="table-head">Alert</th>
                <th className="table-head">Minutes Late</th>
                <th className="table-head text-right">Action</th>
              </tr>
            </thead>
            <tbody className="table-body divide-y divide-yellow-100">
              {alerts.map(alert => (
                <tr key={alert.shift_id} className="table-row bg-white">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-yellow-700">
                          {alert.employee_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-clay-900">{alert.employee_name}</p>
                        <p className="text-xs text-clay-500">{alert.employee_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-clay-700">{alert.shift_start}</span>
                  </td>
                  <td className="table-cell">
                    {alert.alert_type === 'not_checked_in' ? (
                      <span className="badge badge-destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Checked In
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        <Clock className="w-3 h-3 mr-1" />
                        Late
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className="font-medium text-clay-900">{alert.minutes_late} min</span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-sm btn-outline">
                        Contact
                      </button>
                      <button className="btn btn-sm btn-primary">
                        Manual Check-in
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
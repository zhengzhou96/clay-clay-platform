'use client'

import { format } from 'date-fns'

interface CurrentlyWorkingProps {
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
  employees: Array<{
    id: string
    employee_code: string
    full_name: string
    hourly_wage_cents: number
    status: string
  }>
}

export default function CurrentlyWorking({ attendances, employees }: CurrentlyWorkingProps) {
  const employeeMap = new Map(employees.map(e => [e.id, e]))
  
  const currentlyWorking = attendances.filter(a => 
    a.actual_in && !a.actual_out && a.status === 'checked_in'
  )

  if (currentlyWorking.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Currently Working</h3>
          <p className="card-description">Employees checked in right now</p>
        </div>
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-clay-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-clay-600">No one currently working</p>
            <p className="text-sm text-clay-400 mt-1">Employees will appear here when they check in</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Currently Working ({currentlyWorking.length})</h3>
        <p className="card-description">Employees checked in right now</p>
      </div>
      <div className="card-content p-0">
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-head">Employee</th>
                <th className="table-head hidden sm:table-cell">Checked In</th>
                <th className="table-head hidden md:table-cell">Duration</th>
                <th className="table-head">Est. Wages</th>
              </tr>
            </thead>
            <tbody className="table-body divide-y divide-clay-100">
              {currentlyWorking.map(attendance => {
                const employee = employeeMap.get(attendance.employee_id)
                const checkedInAt = attendance.actual_in ? new Date(attendance.actual_in) : null
                const now = new Date()
                const durationMs = checkedInAt ? now.getTime() - checkedInAt.getTime() : 0
                const hours = Math.floor(durationMs / 3600000)
                const minutes = Math.floor((durationMs % 3600000) / 60000)
                
                return (
                  <tr key={attendance.id} className="table-row">
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
                      {checkedInAt ? format(checkedInAt, 'h:mm a') : '—'}
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="font-mono text-clay-700">
                        {hours}h {minutes}m
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-clay-900">
                        {attendance.estimated_wages_cents 
                          ? formatCurrency(attendance.estimated_wages_cents)
                          : '—'}
                      </span>
                    </td>
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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
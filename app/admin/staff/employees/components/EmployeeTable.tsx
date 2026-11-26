'use client'

import { format, parseISO } from 'date-fns'
import { Edit, Eye, Key, MoreVertical, AlertTriangle } from 'lucide-react'

interface EmployeeTableProps {
  employees: Array<{
    id: string
    employee_code: string
    full_name: string
    email: string
    phone: string | null
    hourly_wage_cents: number
    wage_rate_type: string
    status: string
    hire_date: string
    termination_date: string | null
    avatar_url: string | null
    notes: string | null
    created_at: string
  }>
  wageRates: Array<{
    id: string
    employee_id: string
    hourly_rate_cents: number
    effective_date: string
    end_date: string | null
    created_by: string | null
  }>
}

export default function EmployeeTable({ employees, wageRates }: EmployeeTableProps) {
  const getCurrentWageRate = (employeeId: string) => {
    const rates = wageRates.filter(r => r.employee_id === employeeId)
    return rates[0] || null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge badge-success">Active</span>
      case 'inactive': return <span className="badge badge-secondary">Inactive</span>
      case 'on_leave': return <span className="badge badge-warning">On Leave</span>
      default: return <span className="badge badge-default">{status}</span>
    }
  }

  if (employees.length === 0) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-clay-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm9-4.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
              </svg>
            </div>
            <p className="text-clay-600">No employees found</p>
            <p className="text-sm text-clay-400 mt-1">Click "Add Employee" to get started</p>
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
              <th className="table-head">Employee</th>
              <th className="table-head hidden md:table-cell">Contact</th>
              <th className="table-head hidden lg:table-cell">Wage Rate</th>
              <th className="table-head hidden lg:table-cell">Wage Type</th>
              <th className="table-head">Status</th>
              <th className="table-head hidden md:table-cell">Hire Date</th>
              <th className="table-head">Actions</th>
            </tr>
          </thead>
          <tbody className="table-body divide-y divide-clay-100">
            {employees.map(employee => {
              const currentWage = getCurrentWageRate(employee.id)
              const effectiveWage = currentWage?.hourly_rate_cents || employee.hourly_wage_cents
              
              return (
                <tr key={employee.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-clay-100 flex items-center justify-center flex-shrink-0">
                        {employee.avatar_url ? (
                          <img src={employee.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-clay-700">
                            {employee.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-clay-900">{employee.full_name}</p>
                        <p className="text-xs text-clay-500">{employee.employee_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <div className="text-sm">
                      <p className="text-clay-700">{employee.email}</p>
                      {employee.phone && (
                        <p className="text-clay-500">{employee.phone}</p>
                      )}
                    </div>
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    <span className="font-mono font-medium text-clay-900">
                      {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(effectiveWage / 100)}/hr
                    </span>
                    {currentWage && currentWage.hourly_rate_cents !== employee.hourly_wage_cents && (
                      <span className="ml-1 badge badge-info text-[10px]">Override</span>
                    )}
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    <span className="capitalize">{employee.wage_rate_type.replace('_', ' ')}</span>
                  </td>
                  <td className="table-cell">
                    {getStatusBadge(employee.status)}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <span className="text-clay-700">{format(parseISO(employee.hire_date), 'MMM d, yyyy')}</span>
                    {employee.termination_date && (
                      <p className="text-xs text-red-600">Ended: {format(parseISO(employee.termination_date), 'MMM d, yyyy')}</p>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100"
                        aria-label="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100"
                        aria-label="Edit employee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100"
                        aria-label="Reset credentials"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {employee.status === 'active' && (
                        <button
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Deactivate employee"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
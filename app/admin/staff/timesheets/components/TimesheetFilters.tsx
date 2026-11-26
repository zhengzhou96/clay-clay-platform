'use client'

import { Search, X } from 'lucide-react'

interface TimesheetFiltersProps {
  employees: Array<{
    id: string
    employee_code: string
    full_name: string
    status: string
  }>
  selectedEmployeeId: string
  onChange: (employeeId: string) => void
}

export default function TimesheetFilters({ employees, selectedEmployeeId, onChange }: TimesheetFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clay-400" />
        <select
          value={selectedEmployeeId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
          className="input pl-10 pr-10 w-56 sm:w-72"
          aria-label="Filter by employee"
        >
          <option value="">All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} ({emp.employee_code})
            </option>
          ))}
        </select>
      </div>
      {selectedEmployeeId && (
        <button
          onClick={() => onChange('')}
          className="btn btn-outline btn-sm"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}
    </div>
  )
}
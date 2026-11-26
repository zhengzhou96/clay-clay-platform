'use client'

import { Download } from 'lucide-react'

interface MonthlyWageSummary {
  employee_id: string
  employee_name: string
  employee_code: string
  scheduled_hours: number
  actual_hours: number
  estimated_gross_wages_cents: number
}

interface WagesTableProps {
  summaries: MonthlyWageSummary[]
}

export default function WagesTable({ summaries }: WagesTableProps) {
  const handleDownloadCSV = () => {
    const headers = ['Employee Code', 'Employee Name', 'Scheduled Hours', 'Actual Hours', 'Est. Gross Wages (SGD)']
    const rows = summaries.map(s => [
      s.employee_code,
      s.employee_name,
      s.scheduled_hours.toFixed(2),
      s.actual_hours.toFixed(2),
      (s.estimated_gross_wages_cents / 100).toFixed(2),
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `wages-summary-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (summaries.length === 0) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-clay-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <p className="text-clay-600">No wage data for this month</p>
            <p className="text-sm text-clay-400 mt-1">Employees with shifts will appear here</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="card-title">Employee Wage Summary</h3>
        <button
          onClick={handleDownloadCSV}
          className="btn btn-outline btn-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </button>
      </div>
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-head">Employee</th>
              <th className="table-head text-right">Scheduled Hours</th>
              <th className="table-head text-right">Actual Hours</th>
              <th className="table-head text-right">Variance</th>
              <th className="table-head text-right">Est. Gross Wages</th>
            </tr>
          </thead>
          <tbody className="table-body divide-y divide-clay-100">
            {summaries.map(summary => {
              const variance = summary.actual_hours - summary.scheduled_hours
              const varianceClass = variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-clay-600'
              
              return (
                <tr key={summary.employee_id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-clay-900">{summary.employee_name}</p>
                      <p className="text-xs text-clay-500">{summary.employee_code}</p>
                    </div>
                  </td>
                  <td className="table-cell text-right font-mono text-clay-700">
                    {summary.scheduled_hours.toFixed(2)}
                  </td>
                  <td className="table-cell text-right font-mono font-medium text-clay-900">
                    {summary.actual_hours.toFixed(2)}
                  </td>
                  <td className="table-cell text-right font-mono">
                    <span className={varianceClass}>
                      {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                    </span>
                  </td>
                  <td className="table-cell text-right font-mono font-medium text-clay-900">
                    {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(summary.estimated_gross_wages_cents / 100)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-clay-200 bg-clay-50">
            <tr>
              <td className="table-cell font-semibold text-clay-900">Totals</td>
              <td className="table-cell text-right font-mono font-semibold text-clay-900">
                {summaries.reduce((sum, s) => sum + s.scheduled_hours, 0).toFixed(2)}
              </td>
              <td className="table-cell text-right font-mono font-semibold text-clay-900">
                {summaries.reduce((sum, s) => sum + s.actual_hours, 0).toFixed(2)}
              </td>
              <td className="table-cell text-right font-mono font-semibold text-clay-900">
                {summaries.reduce((sum, s) => sum + s.actual_hours - s.scheduled_hours, 0).toFixed(2)}
              </td>
              <td className="table-cell text-right font-mono font-semibold text-clay-900">
                {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(summaries.reduce((sum, s) => sum + s.estimated_gross_wages_cents, 0) / 100)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
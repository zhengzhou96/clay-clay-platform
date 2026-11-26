import { createClient } from '@/lib/supabase/server'
import EmployeeTable from './components/EmployeeTable'
import EmployeeModal from './components/EmployeeModal'

export default async function EmployeesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, email, phone, hourly_wage_cents, wage_rate_type, status, hire_date, termination_date, avatar_url, notes, created_at')
    .order('full_name')

  const { data: wageRates } = await supabase
    .from('wage_rates')
    .select('id, employee_id, hourly_rate_cents, effective_date, end_date, created_by')
    .order('effective_date', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage staff profiles, wages, and access</p>
        </div>
        <button className="btn btn-primary" id="add-employee-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
          Add Employee
        </button>
      </div>

      <EmployeeTable employees={employees || []} wageRates={wageRates || []} />
      <EmployeeModal employees={employees || []} />
    </div>
  )
}
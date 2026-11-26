import { createClient } from '@/lib/supabase/server'
import { StaffHoursClient } from '@/app/staff/hours/StaffHoursClient'
import { redirect } from 'next/navigation'

export default async function StaffHoursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff/login')
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!employee) {
    redirect('/staff/login')
  }

  // Get all attendances for this employee (completed shifts)
  const { data: attendances } = await supabase
    .from('attendances')
    .select('*')
    .eq('employee_id', employee.id)
    .not('hours_worked', 'is', null)
    .order('date', { ascending: false })

  // Get shifts for these attendances to show scheduled vs actual
  const shiftIds = attendances?.map(a => a.shift_id).filter(Boolean) || []
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .in('id', shiftIds.length > 0 ? shiftIds : ['00000000-0000-0000-0000-000000000000'])

  // Get wage rates for historical calculation
  const { data: wageRates } = await supabase
    .from('wage_rates')
    .select('*')
    .eq('employee_id', employee.id)
    .order('effective_date', { ascending: false })

  return (
    <StaffHoursClient
      employee={employee}
      attendances={attendances || []}
      shifts={shifts || []}
      wageRates={wageRates || []}
    />
  )
}
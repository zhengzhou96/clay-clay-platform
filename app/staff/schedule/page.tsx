import { createClient } from '@/lib/supabase/server'
import { StaffScheduleClient } from '@/app/staff/schedule/StaffScheduleClient'
import { redirect } from 'next/navigation'

export default async function StaffSchedulePage() {
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

  // Get query params for week/month view
  // We'll handle this client-side for better UX

  // Get all published shifts for this employee
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  // Get attendance records for these shifts
  const shiftIds = shifts?.map(s => s.id) || []
  const { data: attendances } = await supabase
    .from('attendances')
    .select('*')
    .in('shift_id', shiftIds.length > 0 ? shiftIds : ['00000000-0000-0000-0000-000000000000'])

  return (
    <StaffScheduleClient
      employee={employee}
      shifts={shifts || []}
      attendances={attendances || []}
    />
  )
}
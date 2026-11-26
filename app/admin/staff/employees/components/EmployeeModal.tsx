'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { X, User, Key, AlertTriangle, Trash2 } from 'lucide-react'

interface EmployeeModalProps {
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
}

export default function EmployeeModal({ employees }: EmployeeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<typeof employees[0] | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'wages' | 'credentials'>('profile')
  const [formData, setFormData] = useState<{
      employee_code: string
      full_name: string
      email: string
      phone: string
      hourly_wage_cents: number
      wage_rate_type: 'hourly' | 'salary'
      status: 'active' | 'inactive' | 'on_leave'
      hire_date: string
      termination_date: string
      notes: string
    }>({
      employee_code: '',
      full_name: '',
      email: '',
      phone: '',
      hourly_wage_cents: 0,
      wage_rate_type: 'hourly',
      status: 'active',
      hire_date: format(new Date(), 'yyyy-MM-dd'),
      termination_date: '',
      notes: '',
    })
  const [wageFormData, setWageFormData] = useState({
    hourly_rate_cents: 0,
    effective_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
  })
  const [credFormData, setCredFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [wageErrors, setWageErrors] = useState<Record<string, string>>({})

  const openModal = (employee?: typeof employees[0]) => {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        email: employee.email,
        phone: employee.phone || '',
        hourly_wage_cents: employee.hourly_wage_cents,
        wage_rate_type: employee.wage_rate_type,
        status: employee.status,
        hire_date: employee.hire_date,
        termination_date: employee.termination_date || '',
        notes: employee.notes || '',
      })
      setCredFormData({ email: employee.email, password: '', confirm_password: '' })
    } else {
      setEditingEmployee(null)
      setFormData({
        employee_code: '',
        full_name: '',
        email: '',
        phone: '',
        hourly_wage_cents: 0,
        wage_rate_type: 'hourly',
        status: 'active',
        hire_date: format(new Date(), 'yyyy-MM-dd'),
        termination_date: '',
        notes: '',
      })
      setCredFormData({ email: '', password: '', confirm_password: '' })
    }
    setActiveTab('profile')
    setErrors({})
    setWageErrors({})
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setEditingEmployee(null)
    setErrors({})
    setWageErrors({})
  }

  const validateProfile = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.employee_code.trim()) newErrors.employee_code = 'Employee code is required'
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format'
    if (!formData.hire_date) newErrors.hire_date = 'Hire date is required'
    if (formData.hourly_wage_cents < 0) newErrors.hourly_wage_cents = 'Wage must be positive'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateWages = () => {
    const newErrors: Record<string, string> = {}
    if (!editingEmployee) newErrors.general = 'Select an employee first'
    if (wageFormData.hourly_rate_cents <= 0) newErrors.hourly_rate_cents = 'Rate must be greater than 0'
    if (!wageFormData.effective_date) newErrors.effective_date = 'Effective date is required'
    setWageErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateProfile()) return
    console.log('Save employee:', { ...formData, id: editingEmployee?.id })
    closeModal()
  }

  const handleWageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateWages()) return
    console.log('Add wage rate:', { ...wageFormData, employee_id: editingEmployee?.id })
    closeModal()
  }

  const handleResetCredentials = () => {
    if (!editingEmployee) return
    if (!confirm('Reset login credentials for this employee?')) return
    console.log('Reset credentials for:', editingEmployee.id)
  }

  const handleDeactivate = () => {
    if (!editingEmployee) return
    if (!confirm(`Deactivate ${editingEmployee.full_name}? They will no longer be able to access the system.`)) return
    console.log('Deactivate employee:', editingEmployee.id)
  }

  const handleDelete = () => {
    if (!editingEmployee) return
    if (!confirm(`Permanently delete ${editingEmployee.full_name}? This cannot be undone.`)) return
    console.log('Delete employee:', editingEmployee.id)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-clay-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-clay-900">
            {editingEmployee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={closeModal} className="p-2 rounded-lg text-clay-500 hover:bg-clay-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-clay-200">
          <nav className="flex -mb-px" aria-label="Employee tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile' ? 'border-clay-600 text-clay-900' : 'border-transparent text-clay-500 hover:text-clay-700'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('wages')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'wages' ? 'border-clay-600 text-clay-900' : 'border-transparent text-clay-500 hover:text-clay-700'
              }`}
              disabled={!editingEmployee}
            >
              Wage Rates
            </button>
            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'credentials' ? 'border-clay-600 text-clay-900' : 'border-transparent text-clay-500 hover:text-clay-700'
              }`}
              disabled={!editingEmployee}
            >
              Credentials
            </button>
          </nav>
        </div>

        {/* Tab Panels */}
        <div className="p-4 space-y-4">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="employee_code" className="label">Employee Code *</label>
                  <input
                    id="employee_code"
                    type="text"
                    value={formData.employee_code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                    className={`input ${errors.employee_code ? 'input-error' : ''}`}
                    required
                    disabled={!!editingEmployee}
                  />
                  {errors.employee_code && <p className="text-red-500 text-sm mt-1">{errors.employee_code}</p>}
                </div>
                <div>
                  <label htmlFor="status" className="label">Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'on_leave' }))}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="full_name" className="label">Full Name *</label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={`input ${errors.full_name ? 'input-error' : ''}`}
                  required
                />
                {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="label">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  required
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="label">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="hire_date" className="label">Hire Date *</label>
                  <input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                    className={`input ${errors.hire_date ? 'input-error' : ''}`}
                    required
                  />
                  {errors.hire_date && <p className="text-red-500 text-sm mt-1">{errors.hire_date}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="hourly_wage_cents" className="label">Hourly Wage (cents) *</label>
                  <input
                    id="hourly_wage_cents"
                    type="number"
                    min="0"
                    value={formData.hourly_wage_cents}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, hourly_wage_cents: parseInt(e.target.value) || 0 }))}
                    className={`input ${errors.hourly_wage_cents ? 'input-error' : ''}`}
                    required
                  />
                  {errors.hourly_wage_cents && <p className="text-red-500 text-sm mt-1">{errors.hourly_wage_cents}</p>}
                </div>
                <div>
                  <label htmlFor="wage_rate_type" className="label">Wage Type</label>
                  <select
                    id="wage_rate_type"
                    value={formData.wage_rate_type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, wage_rate_type: e.target.value as 'hourly' | 'salary' }))}
                    className="input"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="termination_date" className="label">Termination Date</label>
                <input
                  id="termination_date"
                  type="date"
                  value={formData.termination_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, termination_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="notes" className="label">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-clay-200">
                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployee ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          )}

          {/* Wage Rates Tab */}
          {activeTab === 'wages' && editingEmployee && (
            <form onSubmit={handleWageSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-clay-50">
                <p className="text-sm text-clay-700">
                  <strong>Current Base Wage:</strong>{' '}
                  {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(formData.hourly_wage_cents / 100)}/hr
                </p>
                <p className="text-xs text-clay-500 mt-1">
                  Wage rates below will override the base wage for the specified date ranges.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="hourly_rate_cents" className="label">Hourly Rate (cents) *</label>
                  <input
                    id="hourly_rate_cents"
                    type="number"
                    min="1"
                    value={wageFormData.hourly_rate_cents}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWageFormData(prev => ({ ...prev, hourly_rate_cents: parseInt(e.target.value) || 0 }))}
                    className={`input ${wageErrors.hourly_rate_cents ? 'input-error' : ''}`}
                    required
                  />
                  {wageErrors.hourly_rate_cents && <p className="text-red-500 text-sm mt-1">{wageErrors.hourly_rate_cents}</p>}
                </div>
                <div>
                  <label htmlFor="effective_date" className="label">Effective Date *</label>
                  <input
                    id="effective_date"
                    type="date"
                    value={wageFormData.effective_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWageFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                    className={`input ${wageErrors.effective_date ? 'input-error' : ''}`}
                    required
                  />
                  {wageErrors.effective_date && <p className="text-red-500 text-sm mt-1">{wageErrors.effective_date}</p>}
                </div>
                <div>
                  <label htmlFor="end_date" className="label">End Date (optional)</label>
                  <input
                    id="end_date"
                    type="date"
                    value={wageFormData.end_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWageFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              {wageErrors.general && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {wageErrors.general}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-clay-200">
                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Wage Rate</button>
              </div>
            </form>
          )}

          {/* Credentials Tab */}
          {activeTab === 'credentials' && editingEmployee && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-clay-50">
                <p className="text-sm text-clay-700">
                  <strong>Current Email:</strong> {editingEmployee.email}
                </p>
              </div>

              <form className="space-y-4">
                <div>
                  <label htmlFor="cred_email" className="label">Email</label>
                  <input
                    id="cred_email"
                    type="email"
                    value={credFormData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label">New Password</label>
                  <input
                    id="password"
                    type="password"
                    value={credFormData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="input"
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div>
                  <label htmlFor="confirm_password" className="label">Confirm Password</label>
                  <input
                    id="confirm_password"
                    type="password"
                    value={credFormData.confirm_password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="input"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-clay-200">
                  <button
                    type="button"
                    onClick={handleResetCredentials}
                    className="btn btn-destructive"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Reset Credentials
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-clay-200">
                <h4 className="font-medium text-clay-900 mb-3">Danger Zone</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDeactivate}
                    className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Deactivate Employee
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {(!editingEmployee && (activeTab === 'wages' || activeTab === 'credentials')) && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-clay-500">
              <User className="w-12 h-12 mb-3 opacity-50" />
              <p>Select an employee to manage wage rates or credentials</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
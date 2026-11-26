'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Home', href: '/staff', icon: HomeIcon },
  { name: 'Schedule', href: '/staff/schedule', icon: CalendarIcon },
  { name: 'My Hours', href: '/staff/hours', icon: ClockIcon },
]

export function StaffNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-clay-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-50 md:hidden">
      <div className="flex justify-around">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-clay-600'
                  : 'text-clay-500 hover:text-clay-700'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function StaffSidebar() {
  const pathname = usePathname()
  const { employee, signOut } = useStaffAuth()

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:border-clay-200 md:bg-white md:z-40">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-clay-200">
          <h1 className="text-lg font-bold text-clay-900">Clay Clay</h1>
          <p className="text-xs text-clay-500 mt-0.5">Staff Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-clay-50 text-clay-600'
                    : 'text-clay-500 hover:bg-clay-50 hover:text-clay-700'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="p-4 border-t border-clay-200">
          {employee && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-clay-100 flex items-center justify-center">
                <span className="text-clay-600 font-medium text-sm">
                  {employee.full_name.split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-clay-900 truncate">{employee.full_name}</p>
                <p className="text-xs text-clay-500 truncate">{employee.employee_code}</p>
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-clay-500 hover:bg-clay-50 hover:text-clay-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
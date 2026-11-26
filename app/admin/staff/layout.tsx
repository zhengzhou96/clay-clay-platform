'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, Menu, ChevronRight } from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/admin/staff', icon: 'layout' },
  { name: 'Schedule', href: '/admin/staff/schedule', icon: 'calendar' },
  { name: 'Timesheets', href: '/admin/staff/timesheets', icon: 'clock' },
  { name: 'Employees', href: '/admin/staff/employees', icon: 'users' },
  { name: 'Wages', href: '/admin/staff/wages', icon: 'dollar-sign' },
]

const icons: Record<string, React.ReactNode> = {
  layout: <LayoutIcon />,
  calendar: <CalendarIcon />,
  clock: <ClockIcon />,
  users: <UsersIcon />,
  'dollar-sign': <DollarSignIcon />,
}

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m-1.5 0h1.5m-18.00 0v11.25A2.25 2.25 0 0 0 6 16.5h12.75m-18.00 0V3m0 0h18v11.25A2.25 2.25 0 0 1 18 16.5H5.25m0 0A2.25 2.25 0 0 1 3 14.25V3" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm9-4.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  )
}

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user] = useState<{ name: string; email: string } | null>(null)
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="min-h-screen bg-clay-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-clay-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-clay-200">
            <div className="w-10 h-10 rounded-lg bg-clay-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m-1.5 0h1.5m-18.00 0v11.25A2.25 2.25 0 0 0 6 16.5h12.75m-18.00 0V3m0 0h18v11.25A2.25 2.25 0 0 1 18 16.5H5.25m0 0A2.25 2.25 0 0 1 3 14.25V3" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-clay-900">Clay Clay</h1>
              <p className="text-xs text-clay-500">Admin Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="w-5 h-5 flex-shrink-0">{icons[item.icon]}</span>
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-clay-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center">
                <User className="w-5 h-5 text-clay-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-clay-900 truncate">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-clay-500 truncate">{user?.email || 'admin@clayclay.com'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-clay-500 hover:bg-clay-100 hover:text-clay-700 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-clay-200">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-clay-500 hover:bg-clay-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h2 className="text-lg font-semibold text-clay-900">
                {navigation.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))?.name || 'Staff Management'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-clay-50">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-clay-600">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
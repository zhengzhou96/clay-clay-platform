import { StaffAuthProvider } from '@/components/staff/StaffAuthProvider'
import { StaffSidebar, StaffNavigation } from '@/components/staff/StaffNavigation'
import type { ReactNode } from 'react'

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <StaffAuthProvider>
      <div className="min-h-screen bg-clay-50">
        {/* Mobile bottom navigation */}
        <StaffNavigation />
        
        <div className="md:pl-64 pb-16 md:pb-0">
          {/* Desktop sidebar */}
          <StaffSidebar />
          
          {/* Main content */}
          <main className="p-4 md:p-6 md:ml-0">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </StaffAuthProvider>
  )
}
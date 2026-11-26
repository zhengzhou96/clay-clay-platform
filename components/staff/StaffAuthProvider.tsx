'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Employee } from '@/types'

interface StaffAuthContextType {
  user: User | null
  employee: Employee | null
  loading: boolean
  signOut: () => Promise<void>
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined)

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch employee data linked to this user
          const { data: emp } = await supabase
            .from('employees')
            .select('*')
            .eq('email', session.user.email)
            .single()
          setEmployee(emp)
        } else {
          setEmployee(null)
        }
        setLoading(false)
      }
    )

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: emp } = await supabase
          .from('employees')
          .select('*')
          .eq('email', session.user.email)
          .single()
        setEmployee(emp)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setEmployee(null)
  }

  return (
    <StaffAuthContext.Provider value={{ user, employee, loading, signOut }}>
      {children}
    </StaffAuthContext.Provider>
  )
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext)
  if (!context) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider')
  }
  return context
}
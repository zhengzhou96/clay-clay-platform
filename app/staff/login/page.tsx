'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function StaffLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMagicLink, setIsMagicLink] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const redirectTo = searchParams.get('redirectTo') || '/staff'

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isMagicLink) {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/staff/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          },
        })
        if (error) throw error
        setError('Magic link sent! Check your email.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-clay-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-clay-900">Clay Clay</h1>
          <p className="text-clay-500 mt-1">Staff Portal</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <div className="card-content space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-clay-900">
                {isMagicLink ? 'Magic Link Sign In' : 'Welcome Back'}
              </h2>
              <p className="text-clay-500 mt-1">
                {isMagicLink
                  ? 'Enter your email to receive a sign-in link'
                  : 'Sign in with your staff credentials'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail((e.target as HTMLInputElement).value)}
                  className="input"
                  placeholder="staff@clayclay.sg"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {!isMagicLink && (
                <div>
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword((e.target as HTMLInputElement).value)}
                    className="input"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || (!isMagicLink && !password)}
                className="btn btn-primary w-full py-3"
              >
                {loading ? (
                  'Please wait...'
                ) : isMagicLink ? (
                  'Send Magic Link'
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-clay-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-clay-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMagicLink(!isMagicLink)}
              className="btn btn-outline w-full"
              disabled={loading}
            >
              {isMagicLink ? 'Use Password Instead' : 'Use Magic Link Instead'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-clay-400 mt-6">
          Clay Clay Pottery Studio • Staff Portal
        </p>
      </div>
    </div>
  )
}
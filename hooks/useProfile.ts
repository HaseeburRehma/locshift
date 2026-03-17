// hooks/useProfile.ts

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { ProfileRow, UserRole } from '@/lib/types/database.types'

interface UseProfileReturn {
  user: User | null
  profile: ProfileRow | null
  role: UserRole | null
  isAdmin: boolean
  isManager: boolean
  isViewer: boolean
  loading: boolean
  error: string | null
}

/**
 * Hook to get the current authenticated user and their profile from the
 * `profiles` table. Exposed helpers: isAdmin, isManager, isViewer.
 */
export function useProfile(): UseProfileReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()

        if (authErr || !user) {
          if (!cancelled) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (!cancelled) setUser(user)

        const { data, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!cancelled) {
          if (profileErr) {
            setError(profileErr.message)
          } else {
            setProfile(data as ProfileRow)
          }
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      }
    }

    load()

    // Listen for auth state changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const role = profile?.role ?? null

  return {
    user,
    profile,
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isViewer: role === 'viewer',
    loading,
    error,
  }
}

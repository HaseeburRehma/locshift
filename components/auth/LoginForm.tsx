//components/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { AlertCircle, Zap, Eye, EyeOff, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  redirectTo?: string
}

/**
 * Client-side login form using React Hook Form + Zod.
 * Signs in via Supabase Auth and redirects to redirectTo (default: /dashboard).
 */
export function LoginForm({ redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    })
    if (error) toast.error(error.message)
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'E-Mail oder Passwort ist falsch'
        : error.message
      setServerError(msg)
      toast.error(msg)
      return
    }

    toast.success('Erfolgreich angemeldet!')
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm shadow-xl border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0064E0] shadow-lg shadow-blue-500/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Willkommen zurück</CardTitle>
        <CardDescription>Melden Sie sich bei Ihrem Konto an</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-bold text-gray-700">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@beispiel.de"
              className="h-11 rounded-xl"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" title="Passwort" className="font-bold text-gray-700">Passwort</Label>
              <Button variant="link" size="sm" className="px-0 text-[#0064E0] font-bold text-xs" onClick={() => router.push('/forgot-password')} type="button">
                Vergessen?
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 pr-10 rounded-xl"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center space-x-2 pt-1 pb-2">
             <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-[#0064E0] focus:ring-[#0064E0]" />
             <label htmlFor="remember" className="text-xs font-bold text-gray-500 cursor-pointer">Angemeldet bleiben</label>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base bg-[#0064E0] hover:bg-[#0050B3] rounded-xl font-bold" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Anmelden...
              </span>
            ) : (
              'Anmelden'
            )}
          </Button>

          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
             <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold tracking-widest">Oder</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button type="button" variant="outline" className="h-12 rounded-xl border-gray-100 font-bold gap-2 text-xs" onClick={() => handleSocialLogin('google')}>
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Google
             </Button>
             <Button type="button" variant="outline" className="h-12 rounded-xl border-gray-100 font-bold gap-2 text-xs" onClick={() => handleSocialLogin('apple')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C4.31 16.94 4.07 10.46 7.42 10.3c1.13.06 1.9.7 2.76.74 1.25.04 1.56-.7 3.32-.7 1.48.06 2.65.6 3.34 1.6-3.04 1.76-2.58 5.68.5 6.94-.64 1.6-1.44 3.1-2.29 4.14zM12.03 9.25c-.1-.02-.19-.04-.28-.04-1.62-.09-2.91-1.35-2.73-3.13.02-.19.04-.38.08-.56 1.58.11 2.8 1.46 2.8 3.1-.01.21-.03.42-.07.63z" /></svg>
                Apple
             </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          🔒 DSGVO-konform &amp; verschlüsselt
        </p>
      </CardContent>
    </Card>
  )
}

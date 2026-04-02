// components/marketing/header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Zap, Menu, X, Globe, LayoutDashboard, LogOut, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export function MarketingHeader() {
    const { user, signOut } = useUser()
    const { t, locale, setLocale } = useTranslation()
    const router = useRouter()
    const [menuOpen, setMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        await signOut()
        router.push('/login')
        router.refresh()
    }

    const navLinks = [
        { key: 'nav.features' as const, href: '#features' },
        { key: 'nav.pricing' as const, href: '#pricing' },
        { key: 'nav.about' as const, href: '#about' },
    ]

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <Image src="/logo-3.png" alt="LokShift Logo" width={140} height={32} className="h-8 w-auto transition-transform group-hover:scale-105" />
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map(link => (
                        <Link
                            key={link.key}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t(link.key)}
                        </Link>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {/* Language Toggle */}
                    <button
                        onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                        title="Toggle language"
                    >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="uppercase">{mounted ? locale : 'de'}</span>
                    </button>

                    {mounted && (user ? (
                        <>
                            <Button asChild variant="ghost" size="sm" className="hidden md:flex gap-2">
                                <Link href="/dashboard">
                                    <LayoutDashboard className="h-4 w-4" />
                                    {t('nav.dashboard')}
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden md:flex gap-2"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4" />
                                {t('nav.logout')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button asChild variant="ghost" size="sm" className="hidden md:flex gap-2">
                                <Link href="/login">
                                    <LogIn className="h-4 w-4" />
                                    {t('nav.login')}
                                </Link>
                            </Button>
                            <Button asChild size="sm" className="hidden md:flex">
                                <Link href="/register">{t('nav.signup')}</Link>
                            </Button>
                        </>
                    ))}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 rounded-md hover:bg-muted"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {menuOpen && (
                <div className="md:hidden border-t border-border bg-background">
                    <div className="px-6 py-4 space-y-4">
                        {navLinks.map(link => (
                            <Link
                                key={link.key}
                                href={link.href}
                                className="block text-sm font-medium text-muted-foreground hover:text-foreground"
                                onClick={() => setMenuOpen(false)}
                            >
                                {t(link.key)}
                            </Link>
                        ))}
                        <div className="pt-4 border-t border-border flex flex-col gap-2">
                            {mounted && (user ? (
                                <>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/dashboard">{t('nav.dashboard')}</Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleSignOut}>{t('nav.logout')}</Button>
                                </>
                            ) : (
                                <>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/login">{t('nav.login')}</Link>
                                    </Button>
                                    <Button asChild size="sm">
                                        <Link href="/register">{t('nav.signup')}</Link>
                                    </Button>
                                </>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}

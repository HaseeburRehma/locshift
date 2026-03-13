'use client'

import Link from 'next/link'
import { Zap, Twitter, Linkedin, Github } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function MarketingFooter() {
    const { t } = useTranslation()

    const footerLinks = {
        [t('footer.product')]: [
            { label: t('nav.features'), href: '#features' },
            { label: t('nav.pricing'), href: '#pricing' },
            { label: t('nav.dashboard'), href: '/' },
        ],
        [t('footer.company')]: [
            { label: t('nav.about'), href: '#about' },
            { label: t('nav.contact'), href: '#contact' },
            { label: 'Blog', href: '#blog' },
        ],
        [t('footer.legal')]: [
            { label: t('footer.privacy'), href: '/privacy' },
            { label: t('footer.terms'), href: '/terms' },
            { label: t('footer.imprint'), href: '/imprint' },
        ],
    }

    return (
        <footer className="border-t border-border bg-card">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-12">
                    {/* Brand */}
                    <div className="col-span-2">
                        <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform group-hover:scale-110">
                                <Zap className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-xl">fixdone.de</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            {t('footer.tagline')}
                        </p>
                        <div className="flex items-center gap-3 mt-6">
                            {[
                                { Icon: Twitter, href: '#', label: 'Twitter' },
                                { Icon: Linkedin, href: '#', label: 'LinkedIn' },
                                { Icon: Github, href: '#', label: 'GitHub' },
                            ].map(({ Icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
                            <ul className="space-y-3">
                                {links.map(link => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">{t('footer.copyright')}</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs text-muted-foreground">{t('footer.status')}</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

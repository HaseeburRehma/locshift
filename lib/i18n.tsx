'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Locale = 'de' | 'en'

interface I18nContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

const translations = {
    de: {
        'nav.features': 'Funktionen',
        'nav.pricing': 'Preise',
        'nav.about': 'Über uns',
        'nav.contact': 'Kontakt',
        'nav.dashboard': 'Dashboard',
        'nav.login': 'Anmelden',
        'nav.signup': 'Registrieren',
        'nav.logout': 'Abmelden',
        'hero.title': 'Der smarteste Weg zu Ihren Heimprojekten',
        'hero.subtitle': 'KI-gestützte Vermittlung von Top-Elektrikern und Handwerkern. Schnell, zuverlässig und passgenau.',
        'hero.cta': 'Jetzt kostenlose Anfrage stellen',
        'hero.stats.projects': 'Projekte abgeschlossen',
        'hero.stats.techs': 'Geprüfte Fachbetriebe',
        'hero.stats.matching': 'Matching Zeit',
        'features.title': 'Warum fixdone.de?',
        'features.subtitle': 'Wir revolutionieren die Handwerkersuche mit künstlicher Intelligenz.',
        'features.matching.title': 'Intelligentes Matching',
        'features.matching.desc': 'Unsere KI findet den perfekten Experten basierend auf Ihren Anforderungen und dem Standort.',
        'features.speed.title': 'Blitzschnelle Antwort',
        'features.speed.desc': 'Erhalten Sie qualifizierte Rückmeldungen innerhalb weniger Minuten, nicht Tage.',
        'features.quality.title': 'Geprüfte Qualität',
        'features.quality.desc': 'Alle Partnerbetriebe werden von uns vorab auf Qualifikation und Zuverlässigkeit geprüft.',
        'process.title': 'So funktioniert es',
        'process.subtitle': 'In 4 Schritten zum fertigen Projekt',
        'hero.video': 'Video ansehen',
        'hero.explainer': 'Wie es funktioniert',
        'features.tagline': 'Zukunft des Handwerks',
        'features.highlight': 'Handwerks',
        'testimonials.heading': 'Kundenerfahrungen',
        'testimonials.title': 'Was unsere Kunden sagen',
        'trust.title': 'Bekannt aus & Zertifiziert durch',
        'cta.title': 'Bereit für Ihr nächstes Projekt?',
        'cta.subtitle': 'Starten Sie jetzt Ihre kostenlose Anfrage und finden Sie den passenden Experten.',
        'inquiry.title': 'Kostenloses Angebot anfordern',
        'inquiry.subtitle': 'In nur 60 Sekunden zum passenden Experten',
        'inquiry.name': 'Vollständiger Name',
        'inquiry.email': 'E-Mail-Adresse',
        'inquiry.phone': 'Telefonnummer',
        'inquiry.postcode': 'Postleitzahl',
        'inquiry.city': 'Stadt',
        'inquiry.description': 'Projektbeschreibung (Was soll gemacht werden?)',
        'inquiry.button': 'Jetzt KI-Angebot anfordern',
        'inquiry.disclaimer': 'Ihre Daten sind sicher und werden DSGVO-konform verarbeitet.',
        'inquiry.success': 'Anfrage erfolgreich gesendet!',
        'inquiry.error': 'Fehler beim Senden. Bitte versuchen Sie es erneut.',
        'inquiry.status.active': 'KI-Orchestrierung aktiv',
        'inquiry.section.personal': 'Persönliche Angaben',
        'inquiry.section.service': 'Auftrag & Budget',
        'inquiry.section.location': 'Einsatzort',
        'inquiry.section.description': 'Projektbeschreibung',
        'inquiry.gps.button': 'Aktuelle Position',
        'inquiry.geocoding.loading': 'Koordinaten werden ermittelt...',
        'inquiry.geocoding.success': 'Standort identifiziert!',
        'inquiry.geocoding.error': 'Fehler beim Abrufen der Adressdetails',
        'inquiry.analysis.loading': 'KI ANALYSE...',
        'inquiry.analysis.success': 'Unsere KI-Agenten analysieren jetzt Ihre Anfrage. Wir melden uns in wenigen Minuten.',
        'inquiry.placeholder.name': 'Max Mustermann',
        'inquiry.placeholder.email': 'max@beispiel.de',
        'inquiry.placeholder.phone': '+49...',
        'inquiry.placeholder.street': 'Musterstraße',
        'inquiry.placeholder.house_no': '12a',
        'inquiry.placeholder.city': 'Berlin',
        'inquiry.placeholder.description': 'Beschreiben Sie Ihr Projekt...',
        'inquiry.placeholder.service': 'Wählen Sie einen Service',
        'inquiry.placeholder.budget': 'z.B. 200-500',
        'footer.product': 'Produkt',
        'footer.company': 'Unternehmen',
        'footer.legal': 'Rechtliches',
        'footer.tagline': 'Die KI-Plattform für effizientes Handwerks-Management.',
        'footer.copyright': '© 2024 fixdone.de. Alle Rechte vorbehalten.',
        'footer.status': 'KI-Agenten aktiv',
        'footer.privacy': 'Datenschutz',
        'footer.terms': 'AGB',
        'footer.imprint': 'Impressum',
        'auth.login.title': 'Willkommen zurück',
        'auth.login.subtitle': 'Melden Sie sich an, um Ihr Dashboard zu verwalten',
        'auth.login.email': 'E-Mail',
        'auth.login.password': 'Passwort',
        'auth.login.submit': 'Anmelden',
        'dashboard.title': 'Zentrale',
        'dashboard.stats.leads': 'Offene Anfragen',
        'dashboard.stats.jobs': 'Aktive Aufträge',
        'dashboard.stats.techs': 'Verfügbare Techniker',
        'dashboard.stats.revenue': 'Umsatz (geschätzt)',
    },
    en: {
        'nav.features': 'Features',
        'nav.pricing': 'Pricing',
        'nav.about': 'About',
        'nav.contact': 'Contact',
        'nav.dashboard': 'Dashboard',
        'nav.login': 'Login',
        'nav.signup': 'Sign Up',
        'nav.logout': 'Logout',
        'hero.title': 'The smartest way to your home projects',
        'hero.subtitle': 'AI-powered matching for top electricians and craftsmen. Fast, reliable, and perfectly tailored.',
        'hero.cta': 'Get free quote now',
        'hero.stats.projects': 'Projects completed',
        'hero.stats.techs': 'Verified technicians',
        'hero.stats.matching': 'Matching time',
        'features.title': 'Why fixdone.de?',
        'features.subtitle': 'We revolutionize craftsman search with artificial intelligence.',
        'features.matching.title': 'Smart Matching',
        'features.matching.desc': 'Our AI finds the perfect expert based on your requirements and location.',
        'features.speed.title': 'Lightning Fast Response',
        'features.speed.desc': 'Receive qualified feedback in minutes, not days.',
        'features.quality.title': 'Verified Quality',
        'features.quality.desc': 'All partner companies are pre-screened for qualification and reliability.',
        'process.title': 'How it works',
        'process.subtitle': 'In 4 easy steps to completion',
        'hero.video': 'Watch Video',
        'hero.explainer': 'How it works',
        'features.tagline': 'Future of Craft',
        'features.highlight': 'Craft',
        'testimonials.heading': 'Customer Stories',
        'testimonials.title': 'What our customers say',
        'trust.title': 'Featured in & Certified by',
        'cta.title': 'Ready for your next project?',
        'cta.subtitle': 'Start your free inquiry now and find the right expert.',
        'inquiry.title': 'Request Free Quote',
        'inquiry.subtitle': 'Find your expert in just 60 seconds',
        'inquiry.name': 'Full Name',
        'inquiry.email': 'Email Address',
        'inquiry.phone': 'Phone Number',
        'inquiry.postcode': 'Postcode',
        'inquiry.city': 'City',
        'inquiry.description': 'Project Description',
        'inquiry.button': 'Get AI Quote Now',
        'inquiry.disclaimer': 'Your data is secure and processed GDPR-compliant.',
        'inquiry.success': 'Inquiry sent successfully!',
        'inquiry.error': 'Error sending. Please try again.',
        'inquiry.status.active': 'AI Orchestration Active',
        'inquiry.section.personal': 'Personal Details',
        'inquiry.section.service': 'Service & Budget',
        'inquiry.section.location': 'Location',
        'inquiry.section.description': 'Project Description',
        'inquiry.gps.button': 'Current Position',
        'inquiry.geocoding.loading': 'Identifying location...',
        'inquiry.geocoding.success': 'Location identified!',
        'inquiry.geocoding.error': 'Failed to fetch address details',
        'inquiry.analysis.loading': 'AI ANALYSIS...',
        'inquiry.analysis.success': 'Our AI agents are now analyzing your request. We will get back to you in minutes.',
        'inquiry.placeholder.name': 'John Doe',
        'inquiry.placeholder.email': 'john@example.com',
        'inquiry.placeholder.phone': '+1...',
        'inquiry.placeholder.street': 'Main Street',
        'inquiry.placeholder.house_no': '12',
        'inquiry.placeholder.city': 'New York',
        'inquiry.placeholder.description': 'Describe your project...',
        'inquiry.placeholder.service': 'Select a service',
        'inquiry.placeholder.budget': 'e.g. 200-500',
        'footer.product': 'Product',
        'footer.company': 'Company',
        'footer.legal': 'Legal',
        'footer.tagline': 'The AI platform for efficient craftsman management.',
        'footer.copyright': '© 2024 fixdone.de. All rights reserved.',
        'footer.status': 'AI Agents Active',
        'footer.privacy': 'Privacy',
        'footer.terms': 'Terms',
        'footer.imprint': 'Imprint',
        'auth.login.title': 'Welcome Back',
        'auth.login.subtitle': 'Sign in to manage your dashboard',
        'auth.login.email': 'Email',
        'auth.login.password': 'Password',
        'auth.login.submit': 'Login',
        'dashboard.title': 'Operations Center',
        'dashboard.stats.leads': 'Open Inquiries',
        'dashboard.stats.jobs': 'Active Jobs',
        'dashboard.stats.techs': 'Available Techs',
        'dashboard.stats.revenue': 'Revenue (Est.)',
    }
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const savedLocale = localStorage.getItem('locale') as Locale
        if (savedLocale && (savedLocale === 'de' || savedLocale === 'en')) {
            setLocaleState(savedLocale)
        }
        setMounted(true)
    }, [])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem('locale', newLocale)
    }

    const t = (key: string): string => {
        const localeTranslations = translations[locale]

        // First check for direct match (flat dots)
        if (key in localeTranslations) {
            return localeTranslations[key as keyof typeof localeTranslations]
        }

        // Then fallback to nested traversal
        const keys = key.split('.')
        let value: any = localeTranslations

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k]
            } else {
                return key
            }
        }

        return typeof value === 'string' ? value : key
    }

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
                {children}
            </div>
        </I18nContext.Provider>
    )
}

export function useTranslation() {
    const context = useContext(I18nContext)
    if (context === undefined) {
        throw new Error('useTranslation must be used within an I18nProvider')
    }
    return context
}

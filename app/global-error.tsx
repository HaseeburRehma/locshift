'use client'

/**
 * Last-resort error boundary (errors in the root layout itself). Must render
 * its own <html>/<body>; kept dependency-free so it can't fail in turn.
 */

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#F8FAFC', color: '#0F172A' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>LokShift ist gerade nicht erreichbar</h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px' }}>
              Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
            </p>
            {error?.digest && <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>Fehler-ID: {error.digest}</p>}
            <button
              onClick={reset}
              style={{ background: '#0064E0', color: '#fff', border: 0, borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

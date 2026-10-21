import { redirect } from 'next/navigation'

/** Old detail route — the detail view now lives inside /dashboard/times. */
export default async function TimeDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/times?entry=${encodeURIComponent(id)}`)
}

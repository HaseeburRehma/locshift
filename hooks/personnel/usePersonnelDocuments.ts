'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { PersonnelDocument } from '@/lib/personnel/documents'
import { personnelFilePath } from '@/lib/personnel/documents'
import { dbErrorMessage } from '@/lib/times/entry-status'
import { fetchAllPages } from '@/lib/supabase/paginate'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

const BUCKET = 'personnel-files'

export interface DocumentInput {
  user_id: string
  name: string
  doc_type: string
  issuer: string | null
  reference: string | null
  issued_at: string | null
  expires_at: string | null
  remark: string | null
  reminder_days: number[]
  is_confidential: boolean
  is_required: boolean
}

/** Personnel documents of the organisation (or one employee). */
export function usePersonnelDocuments(opts: { employeeId?: string; includeArchived?: boolean } = {}) {
  const { profile, user } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()
  const suffix = useRef(Math.random().toString(36).slice(2, 8))
  const [documents, setDocuments] = useState<PersonnelDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = useCallback(async () => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id
    // Rebuilt per page: PostgREST caps each response at 1000 rows.
    const { data, error } = await fetchAllPages<PersonnelDocument>((from, to) => {
      let q = supabase
        .from('qualifications')
        .select('*, employee:profiles!user_id(id, full_name)')
        .eq('organization_id', orgId)
      if (opts.employeeId) q = q.eq('user_id', opts.employeeId)
      if (!opts.includeArchived) q = q.is('archived_at', null)
      return q
        .order('expires_at', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(from, to)
    })
    // A failed page keeps the previous list instead of showing a partial one.
    if (error) console.warn('[usePersonnelDocuments]', error.message)
    else setDocuments(data)
    setLoading(false)
  }, [profile?.organization_id, opts.employeeId, opts.includeArchived, supabase])

  // Realtime bursts (bulk import / renewals) → one refetch at a time.
  const scheduleRefresh = useCoalescedRefetch(fetchDocs)

  useEffect(() => {
    fetchDocs()
    if (!profile?.organization_id) return
    const channel = supabase
      .channel(`personnel-${profile.organization_id}-${suffix.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qualifications', filter: `organization_id=eq.${profile.organization_id}` }, () => scheduleRefresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDocs, scheduleRefresh, profile?.organization_id, supabase])

  /** Confidential files go to the protected (admin-only) folder. */
  const upload = async (employeeId: string, file: File, confidential: boolean) => {
    if (!profile?.organization_id) throw new Error('no org')
    const path = personnelFilePath(profile.organization_id, employeeId, file.name, confidential)
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return { file_path: path, file_name: file.name }
  }

  const createDocument = async (input: DocumentInput, file?: File | null, replaces?: PersonnelDocument | null) => {
    if (!profile?.organization_id) return false
    try {
      const fileFields = file ? await upload(input.user_id, file, input.is_confidential) : replaces && !file ? { file_path: null, file_name: null } : {}
      const { data, error } = await supabase
        .from('qualifications')
        .insert({ ...input, ...fileFields, organization_id: profile.organization_id, created_by: user?.id ?? null })
        .select('id')
        .single()
      if (error) throw error
      if (replaces) {
        const { error: archErr } = await supabase
          .from('qualifications')
          .update({ archived_at: new Date().toISOString(), replaced_by: data.id })
          .eq('id', replaces.id)
        if (archErr) throw archErr
      }
      toast.success(replaces ? L('Nachweis erneuert – alte Frist erledigt', 'Document renewed – old deadline closed') : L('Nachweis gespeichert', 'Document saved'))
      await fetchDocs()
      return true
    } catch (err) {
      toast.error(dbErrorMessage(err, locale, L('Nachweis konnte nicht gespeichert werden', 'Could not save document')))
      return false
    }
  }

  const updateDocument = async (id: string, input: DocumentInput, file?: File | null) => {
    try {
      const fileFields = file ? await upload(input.user_id, file, input.is_confidential) : {}
      const { error } = await supabase
        .from('qualifications')
        .update({ ...input, ...fileFields, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success(L('Nachweis aktualisiert', 'Document updated'))
      await fetchDocs()
      return true
    } catch (err) {
      toast.error(dbErrorMessage(err, locale, L('Änderung konnte nicht gespeichert werden', 'Could not save changes')))
      return false
    }
  }

  const deleteDocument = async (doc: PersonnelDocument) => {
    const { error } = await supabase.from('qualifications').delete().eq('id', doc.id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Löschen fehlgeschlagen', 'Delete failed')))
      return false
    }
    if (doc.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path])
    toast.success(L('Nachweis gelöscht', 'Document deleted'))
    await fetchDocs()
    return true
  }

  /** Short-lived signed link — the bucket is private. */
  const openFile = async (doc: PersonnelDocument) => {
    if (doc.file_path) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 120)
      if (error || !data?.signedUrl) {
        toast.error(L('Datei konnte nicht geöffnet werden', 'Could not open file'))
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } else if (doc.document_url) {
      window.open(doc.document_url, '_blank', 'noopener,noreferrer')
    }
  }

  return { documents, loading, refetch: fetchDocs, createDocument, updateDocument, deleteDocument, openFile }
}

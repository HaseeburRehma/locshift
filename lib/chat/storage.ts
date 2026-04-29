import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/**
 * Normalize a Supabase storage / Postgrest error into a plain object so
 * `console.error` actually prints something useful instead of `{}`.
 */
function normalizeError(err: any): Record<string, unknown> {
  if (!err) return { message: 'unknown error' }
  if (typeof err === 'string') return { message: err }
  return {
    message: err.message ?? err.error_description ?? String(err),
    code: err.code,
    details: err.details,
    hint: err.hint,
    status: err.status,
    statusText: err.statusText,
  }
}

export async function uploadChatAttachment(
  file: File,
  conversationId: string
): Promise<{ url: string; name: string; type: 'image' | 'file' | 'audio' }> {
  // File extension fallback — some browsers don't include `.webm` in the
  // generated voice-message filename, so derive it from the MIME type too.
  const fileExt =
    file.name.includes('.')
      ? file.name.split('.').pop()
      : (file.type.split('/')[1] || 'bin')
  const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = `attachments/${fileName}`

  // Pass an explicit contentType — the default detection sometimes mis-types
  // recordings produced by MediaRecorder (e.g. blob from getUserMedia gets
  // labelled 'application/octet-stream' which is then rejected by the
  // storage policy that whitelists audio/* and image/*).
  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
      cacheControl: '3600',
    })

  if (uploadError) {
    const detail = normalizeError(uploadError)
    console.error('[uploadChatAttachment] Upload failed:', detail)
    // Re-throw with a useful message so the UI toast shows the real reason.
    throw new Error(
      (detail.message as string) ||
        (detail.hint as string) ||
        'Upload failed'
    )
  }

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath)

  // Categorize for the message renderer — audio gets its own bubble.
  const t = file.type
  const type: 'image' | 'file' | 'audio' = t.startsWith('image/')
    ? 'image'
    : t.startsWith('audio/')
    ? 'audio'
    : 'file'

  return { url: publicUrl, name: file.name, type }
}

/**
 * Upload many files in parallel. Returns one attachment record per file.
 * Used by the multi-attachment picker in the chat composer.
 */
export async function uploadChatAttachments(
  files: File[],
  conversationId: string
) {
  return Promise.all(files.map((f) => uploadChatAttachment(f, conversationId)))
}

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function uploadChatAttachment(file: File, conversationId: string): Promise<{ url: string; name: string; type: 'image' | 'file' }> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${conversationId}/${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `attachments/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath)

  return {
    url: publicUrl,
    name: file.name,
    type: file.type.startsWith('image/') ? 'image' : 'file'
  }
}

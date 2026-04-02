import { createClient } from '@/lib/supabase/client'
import { ChatConversation, Profile } from '@/lib/types'

const supabase = createClient()

export async function getOrCreateDirectConversation(senderId: string, receiverId: string, orgId: string): Promise<string> {
  // 1. Check if a 1:1 conversation already exists between these two users
  const { data: existing, error: checkError } = await supabase
    .from('chat_members')
    .select('conversation_id')
    .eq('user_id', senderId)
    .filter('conversation_id', 'in', 
      supabase.from('chat_members').select('conversation_id').eq('user_id', receiverId)
    )

  // Use a more robust check: Find conversations where both are members and is_group is false
  const { data: convs, error: convError } = await supabase
    .from('chat_conversations')
    .select(`
      id,
      members:chat_members!inner(user_id)
    `)
    .eq('is_group', false)
    .eq('organization_id', orgId)

  const directConv = convs?.find(c => 
    c.members.length === 2 && 
    c.members.some(m => m.user_id === senderId) && 
    c.members.some(m => m.user_id === receiverId)
  )

  if (directConv) {
    return directConv.id
  }

  // 2. Create new conversation
  const { data: newConv, error: createError } = await supabase
    .from('chat_conversations')
    .insert({
      organization_id: orgId,
      is_group: false,
      created_by: senderId
    })
    .select()
    .single()

  if (createError) throw createError

  // 3. Add members
  const { error: memberError } = await supabase
    .from('chat_members')
    .insert([
      { conversation_id: newConv.id, user_id: senderId, role: 'member' },
      { conversation_id: newConv.id, user_id: receiverId, role: 'member' }
    ])

  if (memberError) throw memberError

  return newConv.id
}

export async function createGroupConversation(
  creatorId: string, 
  memberIds: string[], 
  orgId: string, 
  name: string,
  avatar_url?: string
): Promise<string> {
  // 1. Create conversation
  const { data: newConv, error: createError } = await supabase
    .from('chat_conversations')
    .insert({
      organization_id: orgId,
      is_group: true,
      name,
      avatar_url,
      created_by: creatorId
    })
    .select()
    .single()

  if (createError) throw createError

  // 2. Add members
  const members = [creatorId, ...memberIds].map(id => ({
    conversation_id: newConv.id,
    user_id: id,
    role: id === creatorId ? 'admin' : 'member'
  }))

  const { error: memberError } = await supabase
    .from('chat_members')
    .insert(members)

  if (memberError) throw memberError

  return newConv.id
}

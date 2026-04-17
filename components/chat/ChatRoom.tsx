import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChatConversation, ChatMessage, ChatMember, Profile } from '@/lib/types'
import { Send, Plus, Smile, ChevronLeft, MoreVertical, Image as ImageIcon, Paperclip, Mic, Square, X, FileText, Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { OnlineIndicator } from './OnlineIndicator'
import { RoleBadge } from './RoleBadge'
import { uploadChatAttachment } from '@/lib/chat/storage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

interface ChatRoomProps {
  conversation: ChatConversation
  messages: ChatMessage[]
  currentUserId: string
  typingUsers: { user_id: string; full_name: string }[]
  isOnline: boolean
  onSendMessage: (content: string, attachment?: { url: string; type: 'image' | 'file'; name: string }) => Promise<void>
  onTyping: (isTyping: boolean) => void
  onBack?: () => void
}

export function ChatRoom({
  conversation,
  messages,
  currentUserId,
  typingUsers,
  isOnline,
  onSendMessage,
  onTyping,
  onBack
}: ChatRoomProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ file: File; preview?: string; type: 'image' | 'file' } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)

  const otherMember = conversation.is_group
    ? null
    : conversation.members?.find((m: ChatMember) => m.user_id !== currentUserId)?.profile

  const displayName = conversation.is_group ? conversation.name : otherMember?.full_name
  const avatarUrl = conversation.is_group ? null : otherMember?.avatar_url
  const role = otherMember?.role

  // ── Scroll to bottom ─────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUsers, scrollToBottom])

  // ── Close attach menu on outside click ────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false)
      }
    }
    if (showAttachMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showAttachMenu])

  // ── Send text message ─────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSending) return

    // If there's a pending file, upload and send
    if (pendingFile) {
      await handleSendWithAttachment()
      return
    }

    if (!input.trim()) return

    const content = input.trim()
    setInput('')
    setIsSending(true)
    onTyping(false)

    try {
      await onSendMessage(content)
    } catch (error) {
      console.error('Failed to send message:', error)
      setInput(content)
      toast.error(t('chat.failedSend'))
    } finally {
      setIsSending(false)
    }
  }

  // ── Send with attachment ──────────────────────────────
  const handleSendWithAttachment = async () => {
    if (!pendingFile) return
    setIsUploading(true)
    setIsSending(true)

    try {
      const attachment = await uploadChatAttachment(pendingFile.file, conversation.id)
      await onSendMessage(input.trim() || '', attachment)
      setInput('')
      setPendingFile(null)
    } catch (error: any) {
      console.error('Upload failed:', error)
      toast.error(error?.message || t('chat.failedUpload'))
    } finally {
      setIsUploading(false)
      setIsSending(false)
    }
  }

  // ── File selection handlers ───────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('chat.fileTooLarge10'))
      return
    }
    const preview = URL.createObjectURL(file)
    setPendingFile({ file, preview, type: 'image' })
    setShowAttachMenu(false)
    e.target.value = ''
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      toast.error(t('chat.fileTooLarge25'))
      return
    }
    const type = file.type.startsWith('image/') ? 'image' as const : 'file' as const
    const preview = type === 'image' ? URL.createObjectURL(file) : undefined
    setPendingFile({ file, preview, type })
    setShowAttachMenu(false)
    e.target.value = ''
  }

  const clearPendingFile = () => {
    if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview)
    setPendingFile(null)
  }

  // ── Voice recording ───────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })

        // Upload and send as file attachment
        setIsUploading(true)
        setIsSending(true)
        try {
          const attachment = await uploadChatAttachment(audioFile, conversation.id)
          await onSendMessage('🎤 Voice message', { ...attachment, type: 'file', name: audioFile.name })
        } catch (error) {
          console.error('Voice upload failed:', error)
          toast.error(t('chat.failedVoice'))
        } finally {
          setIsUploading(false)
          setIsSending(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch (err) {
      toast.error(t('chat.micPermission'))
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingDuration(0)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // ── Typing handler ────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    onTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[#FAFBFC]">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-blue-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full text-sm font-bold text-gray-400">
                  {displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            {!conversation.is_group && (
              <OnlineIndicator isOnline={isOnline} className="absolute bottom-0 right-0" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-gray-900 truncate">{displayName}</h3>
              {role && <RoleBadge role={role} />}
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              {conversation.is_group
                ? `${conversation.members?.length || 0} ${t('chat.members')}`
                : isOnline ? t('chat.online') : t('chat.offline')}
            </p>
          </div>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">{t('chat.sendFirst')}</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1]
          const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              showSender={showSender && conversation.is_group}
            />
          )
        })}

        <TypingIndicator names={typingUsers.map(u => u.full_name?.split(' ')[0] || '')} />
        <div ref={messagesEndRef} />
      </div>

      {/* ── Pending file preview ──────────────────────── */}
      {pendingFile && (
        <div className="px-5 py-3 bg-white border-t border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl max-w-sm">
            {pendingFile.type === 'image' && pendingFile.preview ? (
              <img src={pendingFile.preview} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{pendingFile.file.name}</p>
              <p className="text-xs text-gray-400">{(pendingFile.file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={clearPendingFile} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input Bar ────────────────────────────────── */}
      <div className="px-5 py-4 bg-white border-t border-gray-100 flex-shrink-0">
        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileSelect} />

        {isRecording ? (
          /* Recording UI */
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button
              onClick={cancelRecording}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-red-600 tabular-nums">{formatDuration(recordingDuration)}</span>
              <span className="text-xs text-red-400 font-medium">{t('chat.recording')}</span>
            </div>

            <button
              onClick={stopRecording}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#0064E0] text-white shadow-md hover:bg-blue-700 transition-all active:scale-95"
              title="Send voice note"
            >
              <Send className="w-5 h-5 fill-current translate-x-0.5 -translate-y-0.5" />
            </button>
          </div>
        ) : (
          /* Normal input UI */
          <form onSubmit={handleSend} className="flex items-end gap-2 max-w-3xl mx-auto relative">
            {/* Attachment button */}
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-xl transition-all",
                  showAttachMenu ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                )}
              >
                <Plus className="w-5 h-5" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-14 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 w-44 animate-in fade-in slide-in-from-bottom-2 duration-150 z-20">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    {t('chat.photo')}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Paperclip className="w-4 h-4 text-blue-500" />
                    {t('chat.file')}
                  </button>
                </div>
              )}
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={pendingFile ? t('chat.addCaption') : t('chat.typeMessage')}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium placeholder:text-gray-400"
                disabled={isSending}
              />
            </div>

            {/* Voice or Send button */}
            {!input.trim() && !pendingFile ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                title="Record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSending || (!input.trim() && !pendingFile)}
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-xl transition-all",
                  (input.trim() || pendingFile) && !isSending
                    ? 'bg-[#0064E0] text-white shadow-md active:scale-95'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                )}
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 fill-current translate-x-0.5 -translate-y-0.5" />
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

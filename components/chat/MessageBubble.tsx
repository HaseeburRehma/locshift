import React, { useState, useRef } from 'react'
import { ChatMessage } from '@/lib/types'
import { format } from 'date-fns'
import { FileText, Download, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  showSender?: boolean
}

function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100
    setProgress(pct)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
        )}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className={cn("h-1.5 rounded-full overflow-hidden", isOwn ? 'bg-white/20' : 'bg-gray-200')}>
          <div
            className={cn("h-full rounded-full transition-all", isOwn ? 'bg-white/70' : 'bg-blue-500')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn("text-[10px] font-medium tabular-nums", isOwn ? 'text-white/60' : 'text-gray-400')}>
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const { t } = useTranslation()
  const timestamp = format(new Date(message.created_at), 'HH:mm')
  const isVoice = message.attachment_name?.endsWith('.webm') || message.attachment_name?.endsWith('.ogg')
  const isImage = message.attachment_type === 'image'
  const isFile = message.attachment_url && !isImage && !isVoice

  return (
    <div className={`flex flex-col mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      {showSender && !isOwn && message.sender && (
        <span className="text-[11px] font-semibold text-gray-500 mb-1 ml-11">
          {message.sender.full_name}
        </span>
      )}

      <div className="flex items-end gap-2 max-w-[80%]">
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {message.sender?.avatar_url ? (
              <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-gray-400">
                {message.sender?.full_name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <div className={cn(
            "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
            isOwn
              ? 'bg-[#0064E0] text-white rounded-br-sm'
              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
          )}>
            {/* Image attachment */}
            {isImage && message.attachment_url && (
              <div className="mb-2 -mx-1 -mt-1 rounded-xl overflow-hidden">
                <img
                  src={message.attachment_url}
                  alt={message.attachment_name || 'Image'}
                  className="max-w-full max-h-[280px] w-auto h-auto object-cover rounded-xl cursor-pointer"
                  onClick={() => window.open(message.attachment_url!, '_blank')}
                />
              </div>
            )}

            {/* Voice note */}
            {isVoice && message.attachment_url && (
              <AudioPlayer src={message.attachment_url} isOwn={isOwn} />
            )}

            {/* File attachment */}
            {isFile && message.attachment_url && (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5 transition-colors",
                  isOwn ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  isOwn ? 'bg-white/20' : 'bg-blue-50'
                )}>
                  <FileText className={cn("w-4 h-4", isOwn ? 'text-white/80' : 'text-blue-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-semibold truncate",
                    isOwn ? 'text-white' : 'text-gray-800'
                  )}>
                    {message.attachment_name || t('chat.file')}
                  </p>
                  <p className={cn("text-[10px]", isOwn ? 'text-white/50' : 'text-gray-400')}>
                    {t('chat.tapToDownload')}
                  </p>
                </div>
                <Download className={cn("w-4 h-4 flex-shrink-0", isOwn ? 'text-white/50' : 'text-gray-300')} />
              </a>
            )}

            {/* Text content (hide if only voice note emoji) */}
            {message.content && !(isVoice && message.content === '🎤 Voice message') && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>

          {/* Timestamp + read receipt */}
          <div className={`flex items-center gap-1 ${isOwn ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
            <span className="text-[10px] text-gray-400 font-medium">{timestamp}</span>
            {isOwn && (
              <span className="text-blue-500 text-[10px] font-bold">✓✓</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

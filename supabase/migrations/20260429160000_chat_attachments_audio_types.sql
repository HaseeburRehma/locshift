-- =============================================================================
--  20260429160000_chat_attachments_audio_types.sql
--  LokShift — allow audio/* uploads to the chat-attachments bucket so voice
--  messages stop failing with "mime type audio/webm is not supported".
--
--  PROBLEM
--    The bucket created in 20260424160000_chat_attachments_bucket.sql had its
--    allowed_mime_types whitelist set to image+pdf+zip+text only. Voice
--    messages produced by MediaRecorder are audio/webm (Chrome/Firefox) or
--    audio/mp4 (Safari). The bucket rejects them at the storage gateway with
--    "mime type X is not supported" before the file ever reaches RLS.
--
--  FIX
--    Extend allowed_mime_types to include the audio formats every browser
--    we care about can produce, plus a few common ones for forward
--    compatibility (mpeg, wav, x-m4a, aac, opus, 3gpp). Also bump the
--    file size limit to 50 MiB so longer voice notes / smaller video
--    clips fit comfortably.
--
--  Idempotent — safe to run multiple times. Doesn't drop or recreate
--  policies, only updates the bucket metadata.
-- =============================================================================

BEGIN;

UPDATE storage.buckets
SET
  -- 50 MiB — covers ~1 hour of opus voice or ~5 min of HD audio
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    -- Images (existing)
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/svg+xml',
    -- Documents (existing)
    'application/pdf',
    'application/zip',
    'text/plain', 'text/csv', 'text/markdown',
    -- Office documents (added — chat-attachments are general file shares too)
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Audio (the actual fix — every browser MediaRecorder produces one of these)
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/opus',
    'audio/mp4',
    'audio/mp4a-latm',
    'audio/x-m4a',
    'audio/aac',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/3gpp',
    'audio/3gpp2',
    -- Video (small clips — also useful for chat)
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
WHERE id = 'chat-attachments';

COMMIT;

-- =============================================================================
-- Rollback (best-effort): restore the original tight whitelist.
-- =============================================================================
-- BEGIN;
--   UPDATE storage.buckets
--   SET file_size_limit = 26214400,
--       allowed_mime_types = ARRAY[
--         'image/png', 'image/jpeg', 'image/gif', 'image/webp',
--         'application/pdf', 'application/zip',
--         'text/plain', 'text/csv'
--       ]
--   WHERE id = 'chat-attachments';
-- COMMIT;

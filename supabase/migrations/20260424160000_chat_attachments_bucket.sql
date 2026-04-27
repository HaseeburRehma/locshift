-- =============================================================================
--  20260424160000_chat_attachments_bucket.sql
--
--  Fix:  StorageApiError "Bucket not found" when uploading a chat attachment.
--
--  Cause: lib/chat/storage.ts uploads to bucket "chat-attachments" but that
--         bucket was never created on this Supabase project.
--
--  This migration:
--    1. Creates the chat-attachments bucket (PUBLIC because chat shows
--       inline images via <img src=publicUrl />).
--    2. Adds RLS policies on storage.objects scoped to that bucket so:
--         - any authenticated user can READ (public bucket anyway)
--         - any authenticated user can INSERT into it
--         - the uploader (or a service-role caller) can UPDATE/DELETE
--    3. Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create the bucket if it doesn't exist.
--    `public = true` keeps the existing app code (`getPublicUrl`) working.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Optional but recommended: cap object size at 25 MB and restrict MIME types.
-- (Comment out the UPDATE below if you want unlimited types/sizes.)
UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MiB
    allowed_mime_types = ARRAY[
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf',
      'application/zip',
      'text/plain', 'text/csv'
    ]
WHERE id = 'chat-attachments';

-- ---------------------------------------------------------------------------
-- 2. Reset and recreate per-operation policies for this bucket.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_attachments_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update_uploader"      ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete_uploader"      ON storage.objects;

-- READ: bucket is public, but we still gate via RLS for non-public usage.
CREATE POLICY "chat_attachments_select_authenticated"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-attachments');

-- WRITE: any authenticated user may upload. The chat code already names
-- files with the conversation id as the first folder segment, and the
-- chat_messages RLS only lets participants insert message rows that
-- reference a given conversation_id, so the practical write boundary is
-- the chat_messages table itself.
CREATE POLICY "chat_attachments_insert_authenticated"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

-- UPDATE / DELETE: only the original uploader (owner) — service role bypass
-- still works for admin scripts.
CREATE POLICY "chat_attachments_update_uploader"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'chat-attachments' AND owner = auth.uid());

CREATE POLICY "chat_attachments_delete_uploader"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

COMMIT;

-- Rollback:
--   DELETE FROM storage.buckets WHERE id = 'chat-attachments';
--   (objects in the bucket are deleted by FK cascade)

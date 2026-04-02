-- ──────────────────────────────────────────────────────────
-- CONVERSATION TIMESTAMP TRIGGER
-- Updates 'updated_at' on conv whenever a message is sent.
-- This ensures the sidebar sorts correctly in real-time.
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_message_inserted ON public.chat_messages;
CREATE TRIGGER on_chat_message_inserted
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_timestamp();

-- Re-verify that real-time is enabled for the table
-- (Assuming done, but for safety):
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

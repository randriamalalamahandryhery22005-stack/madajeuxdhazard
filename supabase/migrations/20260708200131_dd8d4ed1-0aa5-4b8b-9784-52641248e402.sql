
ALTER TABLE public.global_chat_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.global_chat_messages(id) ON DELETE SET NULL;

ALTER TABLE public.global_chat_messages DROP CONSTRAINT IF EXISTS global_chat_messages_content_check;
ALTER TABLE public.global_chat_messages ADD CONSTRAINT global_chat_messages_content_check
  CHECK (char_length(content) <= 2000);

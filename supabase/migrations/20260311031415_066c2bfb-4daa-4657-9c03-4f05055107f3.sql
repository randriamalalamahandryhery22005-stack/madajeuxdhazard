
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0;

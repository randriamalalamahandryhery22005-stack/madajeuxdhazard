ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_info text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
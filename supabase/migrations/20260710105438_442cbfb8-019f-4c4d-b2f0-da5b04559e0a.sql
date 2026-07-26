
CREATE TABLE IF NOT EXISTS public.voice_call_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.voice_call_rooms TO authenticated;
GRANT ALL ON public.voice_call_rooms TO service_role;

ALTER TABLE public.voice_call_rooms ENABLE ROW LEVEL SECURITY;

DO $wrap$ BEGIN
  CREATE POLICY "Authenticated can read calls" ON public.voice_call_rooms
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN
  CREATE POLICY "Authenticated can start call" ON public.voice_call_rooms
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiated_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN
  CREATE POLICY "Initiator or admin can end call" ON public.voice_call_rooms
    FOR UPDATE TO authenticated
    USING (auth.uid() = initiated_by OR public.has_role(auth.uid(),'admin'))
    WITH CHECK (auth.uid() = initiated_by OR public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_call_rooms_single_active
  ON public.voice_call_rooms ((status)) WHERE status = 'active';

ALTER TABLE public.voice_call_rooms REPLICA IDENTITY FULL;

DO $wrap$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_rooms;
EXCEPTION WHEN others THEN NULL; END $wrap$;

-- Dynamic JSON-driven app config with versioning
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false,
  notes text
);

CREATE UNIQUE INDEX app_config_version_idx ON public.app_config(version);
CREATE INDEX app_config_active_idx ON public.app_config(is_active) WHERE is_active = true;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read configs"
  ON public.app_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage configs"
  ON public.app_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure single active version
CREATE OR REPLACE FUNCTION public.ensure_single_active_config()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.app_config SET is_active = false WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_config
  AFTER INSERT OR UPDATE OF is_active ON public.app_config
  FOR EACH ROW WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_config();

-- AI prompt history / logs
CREATE TABLE public.ai_config_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  prompt text NOT NULL,
  response jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  config_id uuid REFERENCES public.app_config(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_config_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai logs"
  ON public.ai_config_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
ALTER TABLE public.app_config REPLICA IDENTITY FULL;

-- Seed v1 (empty active config)
INSERT INTO public.app_config (version, config, is_active, notes)
VALUES (1, '{"theme":{},"home":{"banners":[],"sections":[]},"games":{}}'::jsonb, true, 'Initial empty config');

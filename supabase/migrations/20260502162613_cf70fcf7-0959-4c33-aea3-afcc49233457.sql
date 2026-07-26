
-- Audit log for all predictions generated
CREATE TABLE IF NOT EXISTS public.prediction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  custom_prediction_id UUID,
  input_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  reliability_avg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prediction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own prediction logs"
  ON public.prediction_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own prediction logs"
  ON public.prediction_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all prediction logs"
  ON public.prediction_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete prediction logs"
  ON public.prediction_logs FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS prediction_logs_user_idx ON public.prediction_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prediction_logs_mode_idx ON public.prediction_logs(mode, created_at DESC);

-- Custom prediction types managed by admins
CREATE TABLE IF NOT EXISTS public.custom_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'sparkles',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_subscription BOOLEAN NOT NULL DEFAULT false,
  subscription_key TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active custom predictions"
  ON public.custom_predictions FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage custom predictions"
  ON public.custom_predictions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_custom_predictions_updated_at
  BEFORE UPDATE ON public.custom_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Extensions for scheduled polling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cache table for API-Football responses
CREATE TABLE public.football_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.football_cache TO authenticated;
GRANT ALL ON public.football_cache TO service_role;

ALTER TABLE public.football_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cache"
ON public.football_cache FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_football_cache_expires ON public.football_cache(expires_at);

-- Live fixtures table (pushed via realtime)
CREATE TABLE public.live_fixtures (
  fixture_id BIGINT PRIMARY KEY,
  league_id BIGINT,
  league_name TEXT,
  league_logo TEXT,
  country TEXT,
  home_id BIGINT,
  home_name TEXT,
  home_logo TEXT,
  away_id BIGINT,
  away_name TEXT,
  away_logo TEXT,
  home_goals INTEGER,
  away_goals INTEGER,
  status_short TEXT,
  status_long TEXT,
  minute INTEGER,
  raw JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_fixtures TO authenticated;
GRANT ALL ON public.live_fixtures TO service_role;

ALTER TABLE public.live_fixtures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read live fixtures"
ON public.live_fixtures FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_live_fixtures_status ON public.live_fixtures(status_short);
CREATE INDEX idx_live_fixtures_updated ON public.live_fixtures(updated_at);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_fixtures;
ALTER TABLE public.live_fixtures REPLICA IDENTITY FULL;

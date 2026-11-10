ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS placement_fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO public.platform_settings (key, value)
VALUES ('placement_fee', '20000')
ON CONFLICT (key) DO NOTHING;

GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_rc text,
  ADD COLUMN IF NOT EXISTS company_cnas text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo_url text;

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  nif text,
  address text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own clients" ON public.clients;
CREATE POLICY "own clients" ON public.clients FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.invoice_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  last_seq integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);
GRANT SELECT ON public.invoice_counters TO authenticated;
GRANT ALL ON public.invoice_counters TO service_role;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own counter" ON public.invoice_counters;
CREATE POLICY "read own counter" ON public.invoice_counters FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  y integer := EXTRACT(YEAR FROM now())::int;
  n integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.invoice_counters (user_id, year, last_seq)
  VALUES (uid, y, 1)
  ON CONFLICT (user_id, year) DO UPDATE SET last_seq = public.invoice_counters.last_seq + 1
  RETURNING last_seq INTO n;
  RETURN 'FAC-' || y::text || '-' || lpad(n::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_invoice_number() FROM anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

DROP POLICY IF EXISTS "logos owner read" ON storage.objects;
CREATE POLICY "logos owner read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "logos owner insert" ON storage.objects;
CREATE POLICY "logos owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "logos owner update" ON storage.objects;
CREATE POLICY "logos owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "logos owner delete" ON storage.objects;
CREATE POLICY "logos owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
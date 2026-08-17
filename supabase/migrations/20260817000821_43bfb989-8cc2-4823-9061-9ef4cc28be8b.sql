-- user_roles: self-read without calling has_role (base for inline admin checks)
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- activation_codes
DROP POLICY IF EXISTS "admins manage codes" ON public.activation_codes;
CREATE POLICY "admins manage codes" ON public.activation_codes
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- exchange_rates
DROP POLICY IF EXISTS "admins write rates" ON public.exchange_rates;
CREATE POLICY "admins write rates" ON public.exchange_rates
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- payment_receipts
DROP POLICY IF EXISTS "admins update receipts" ON public.payment_receipts;
CREATE POLICY "admins update receipts" ON public.payment_receipts
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

DROP POLICY IF EXISTS "read own receipts" ON public.payment_receipts;
CREATE POLICY "read own receipts" ON public.payment_receipts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
CREATE POLICY "read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- subscriptions
DROP POLICY IF EXISTS "read own subscription" ON public.subscriptions;
CREATE POLICY "read own subscription" ON public.subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- storage receipts policies rewritten without has_role
DROP POLICY IF EXISTS "receipts update own" ON storage.objects;
DROP POLICY IF EXISTS "receipts delete own" ON storage.objects;

CREATE POLICY "receipts update own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)))
WITH CHECK (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)));

CREATE POLICY "receipts delete own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)));

-- existing storage select/insert policies that reference has_role
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, cmd, qual, with_check FROM pg_policies
           WHERE schemaname = 'storage' AND tablename = 'objects'
             AND (coalesce(qual,'') LIKE '%has_role%' OR coalesce(with_check,'') LIKE '%has_role%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "receipts read own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)));

CREATE POLICY "receipts insert own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- helper no longer used by any policy: lock it down
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
-- Fix infinite recursion in RLS policies by creating security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Update admin user to have admin role
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'admin@test.com';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policies using security definer function
CREATE POLICY "Admins can do everything on profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Also fix other policies that might have recursion issues
DROP POLICY IF EXISTS "Admins and workers can manage tasks" ON public.tasks;
CREATE POLICY "Admins and workers can manage tasks" 
ON public.tasks 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'worker'));

DROP POLICY IF EXISTS "Admins and workers can manage tickets" ON public.tickets;
CREATE POLICY "Admins and workers can manage tickets" 
ON public.tickets 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'worker'));

DROP POLICY IF EXISTS "Users can view tasks they are involved in" ON public.tasks;
CREATE POLICY "Users can view tasks they are involved in" 
ON public.tasks 
FOR SELECT 
USING (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_worker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'worker')
);

DROP POLICY IF EXISTS "Users can view tickets they are involved in" ON public.tickets;
CREATE POLICY "Users can view tickets they are involved in" 
ON public.tickets 
FOR SELECT 
USING (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_worker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'worker')
);

-- Fix services policies
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" 
ON public.services 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Fix invoices policies
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Admins can manage invoices" 
ON public.invoices 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Fix wiki policies
DROP POLICY IF EXISTS "Admins and workers can manage wiki articles" ON public.wiki_articles;
CREATE POLICY "Admins and workers can manage wiki articles" 
ON public.wiki_articles 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'worker'));
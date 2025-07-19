-- Dodaj constraint za radnike - samo admin može kreirati
ALTER TABLE public.profiles 
ADD CONSTRAINT check_worker_creation 
CHECK (
  CASE 
    WHEN role = 'worker' THEN get_current_user_role() = 'admin'
    ELSE true
  END
);
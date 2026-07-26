-- Add trial support (15 min free premium for new accounts)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- New signups get their trial started immediately in handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, name, email, is_validated, trial_started_at)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.email, ''),
    CASE WHEN NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN true ELSE false END,
    now()
  ) ON CONFLICT (user_id) DO NOTHING;
  IF NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.protected_admins (user_id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
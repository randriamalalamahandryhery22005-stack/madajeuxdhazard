ALTER TABLE public.profiles ADD COLUMN is_validated boolean NOT NULL DEFAULT false;

-- Admin is auto-validated
UPDATE public.profiles SET is_validated = true WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

-- Update the trigger to auto-validate admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'randriamalalamahandryhery@gmail.com' THEN
    INSERT INTO public.profiles (user_id, name, email, is_validated)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email, true);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.profiles (user_id, name, email, is_validated)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email, false);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;
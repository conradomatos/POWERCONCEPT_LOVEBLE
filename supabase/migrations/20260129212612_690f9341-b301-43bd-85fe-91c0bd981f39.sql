
-- ============================================================
-- Fix user synchronization between auth.users and profiles
-- Create trigger that was missing
-- ============================================================

-- 1. Drop existing trigger if any (cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Update handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, is_active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    true,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Sync any existing orphaned users from auth.users to profiles
INSERT INTO public.profiles (user_id, full_name, email, is_active, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', split_part(au.email, '@', 1)),
  au.email,
  true,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

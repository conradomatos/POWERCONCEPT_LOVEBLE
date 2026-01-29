-- Remove the old SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new policy: user sees own profile OR admins see all
-- Using the existing has_role() security definer function to avoid RLS recursion
CREATE POLICY "Users can view own profile or admins view all" ON profiles
FOR SELECT USING (
  auth.uid() = user_id 
  OR 
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'super_admin'::app_role)
);


# Fix RLS Policy for Admin User Visibility

## Problem Identified
The current RLS policy on `profiles` table only allows users to view their own record:
```sql
qual: (auth.uid() = user_id)
```
This is why the Admin panel shows only 1 user instead of all 5.

## Solution
Update the SELECT policy to allow:
- Regular users: see only their own profile
- Admins and Super Admins: see ALL profiles

## Database Migration

```sql
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
```

## Important Technical Notes

| Aspect | Detail |
|--------|--------|
| Role Names | Uses lowercase `'admin'`, `'super_admin'` (NOT uppercase as in user's example) |
| Enum Type | Uses `::app_role` cast for type safety |
| Security Function | Uses existing `has_role()` SECURITY DEFINER function to prevent RLS recursion |

## Why Use has_role() Function
The `has_role()` function is defined as `SECURITY DEFINER` which:
- Bypasses RLS when checking the `user_roles` table
- Prevents infinite recursion that could occur with a direct subquery
- Already exists in the database (no need to create it)

## Expected Result After Migration
| Metric | Before | After |
|--------|--------|-------|
| Users visible to admin | 1 | 5 |
| Total de Usuarios card | 1 | 5 |
| Pendentes de Ativacao | N/A | 4 |


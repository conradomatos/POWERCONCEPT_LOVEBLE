
-- Fix: Restrict budget-documents DELETE to owner or admin/super_admin
DROP POLICY IF EXISTS "Authenticated users can delete budget docs" ON storage.objects;

CREATE POLICY "Owner or Admin can delete budget docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'budget-documents' AND
  (auth.uid() = owner OR
   has_role(auth.uid(), 'admin'::app_role) OR
   has_role(auth.uid(), 'super_admin'::app_role))
);

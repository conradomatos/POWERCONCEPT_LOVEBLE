-- Super Admin can delete any apontamentos_consolidado record
CREATE POLICY "Super Admin can delete apontamentos_consolidado"
ON public.apontamentos_consolidado FOR DELETE
USING (is_super_admin(auth.uid()));
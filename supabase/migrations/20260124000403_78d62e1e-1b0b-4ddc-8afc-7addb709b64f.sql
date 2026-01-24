-- Allow admin/financeiro/rh to update arquivos_importacao records
CREATE POLICY "Admin, RH and Financeiro can update arquivos_importacao"
ON public.arquivos_importacao
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'rh') OR 
  public.has_role(auth.uid(), 'financeiro') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow financeiro to insert into arquivos_importacao (for catalog imports)
CREATE POLICY "Financeiro can insert arquivos_importacao"
ON public.arquivos_importacao
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'financeiro') OR
  public.has_role(auth.uid(), 'super_admin')
);
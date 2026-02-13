
-- Create private storage bucket for budget documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-documents', 'budget-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS: Authenticated users can read budget documents
CREATE POLICY "Authenticated users can read budget docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'budget-documents' AND auth.role() = 'authenticated');

-- RLS: Only authenticated users can upload (via edge function with service role, but defense in depth)
CREATE POLICY "Authenticated users can upload budget docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'budget-documents' AND auth.role() = 'authenticated');

-- RLS: Only authenticated users can delete their docs
CREATE POLICY "Authenticated users can delete budget docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'budget-documents' AND auth.role() = 'authenticated');

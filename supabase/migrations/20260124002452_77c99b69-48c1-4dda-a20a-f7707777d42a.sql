
-- Material Groups (top level)
CREATE TABLE public.material_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Material Categories (depends on group)
CREATE TABLE public.material_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.material_groups(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, nome)
);

-- Material Subcategories (depends on category)
CREATE TABLE public.material_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.material_categories(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, nome)
);

-- Material Tags (standalone)
CREATE TABLE public.material_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Junction table for material-tag relationship
CREATE TABLE public.material_catalog_tags (
  material_id uuid NOT NULL REFERENCES public.material_catalog(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.material_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, tag_id)
);

-- Add new columns to material_catalog
ALTER TABLE public.material_catalog 
ADD COLUMN group_id uuid REFERENCES public.material_groups(id),
ADD COLUMN category_id uuid REFERENCES public.material_categories(id),
ADD COLUMN subcategory_id uuid REFERENCES public.material_subcategories(id);

-- Create indexes for performance
CREATE INDEX idx_material_catalog_group ON public.material_catalog(group_id);
CREATE INDEX idx_material_catalog_category ON public.material_catalog(category_id);
CREATE INDEX idx_material_catalog_subcategory ON public.material_catalog(subcategory_id);
CREATE INDEX idx_material_categories_group ON public.material_categories(group_id);
CREATE INDEX idx_material_subcategories_category ON public.material_subcategories(category_id);
CREATE INDEX idx_material_catalog_tags_material ON public.material_catalog_tags(material_id);
CREATE INDEX idx_material_catalog_tags_tag ON public.material_catalog_tags(tag_id);

-- RLS for material_groups
ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material_groups"
ON public.material_groups FOR SELECT
USING (true);

CREATE POLICY "Admin and financeiro can manage material_groups"
ON public.material_groups FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'financeiro') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS for material_categories
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material_categories"
ON public.material_categories FOR SELECT
USING (true);

CREATE POLICY "Admin and financeiro can manage material_categories"
ON public.material_categories FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'financeiro') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS for material_subcategories
ALTER TABLE public.material_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material_subcategories"
ON public.material_subcategories FOR SELECT
USING (true);

CREATE POLICY "Admin and financeiro can manage material_subcategories"
ON public.material_subcategories FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'financeiro') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS for material_tags
ALTER TABLE public.material_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material_tags"
ON public.material_tags FOR SELECT
USING (true);

CREATE POLICY "Admin and financeiro can manage material_tags"
ON public.material_tags FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'financeiro') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS for material_catalog_tags
ALTER TABLE public.material_catalog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material_catalog_tags"
ON public.material_catalog_tags FOR SELECT
USING (true);

CREATE POLICY "Admin and financeiro can manage material_catalog_tags"
ON public.material_catalog_tags FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'financeiro') OR 
  public.has_role(auth.uid(), 'super_admin')
);

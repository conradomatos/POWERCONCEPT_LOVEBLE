ALTER TABLE budget_material_items
ADD COLUMN catalog_id uuid REFERENCES material_catalog(id) ON DELETE SET NULL;
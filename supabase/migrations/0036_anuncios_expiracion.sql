ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS expira_tipo text NOT NULL DEFAULT 'leido' CHECK (expira_tipo IN ('leido', 'dias')),
  ADD COLUMN IF NOT EXISTS expira_dias int;

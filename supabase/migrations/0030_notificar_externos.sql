ALTER TABLE plazos
  ADD COLUMN IF NOT EXISTS notificar_externos text[] NOT NULL DEFAULT '{}';

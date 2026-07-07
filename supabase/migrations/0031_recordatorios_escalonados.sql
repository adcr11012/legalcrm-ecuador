ALTER TABLE plazos
  ADD COLUMN IF NOT EXISTS recordatorios_activos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aviso_30_enviado      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aviso_8_enviado       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aviso_48h_enviado     boolean NOT NULL DEFAULT false;

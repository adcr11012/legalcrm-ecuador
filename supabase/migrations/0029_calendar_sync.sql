-- Sincronización de plazos/agenda con Google Calendar (usa la misma cuenta
-- conectada para Drive; requiere reconectar para ampliar el scope).
ALTER TABLE plazos
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS notificar_a uuid[] NOT NULL DEFAULT '{}';

-- Extiende plazos para unificar con tareas
ALTER TABLE plazos
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo    text NOT NULL DEFAULT 'plazo'     CHECK (tipo IN ('plazo','audiencia','tarea','otro')),
  ADD COLUMN IF NOT EXISTS estado  text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_progreso','completada','vencida')),
  ADD COLUMN IF NOT EXISTS asignado_a uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nota    text;

-- Rellenar workspace_id desde el caso relacionado
UPDATE plazos p
SET workspace_id = c.workspace_id
FROM casos c
WHERE p.caso_id = c.id AND p.workspace_id IS NULL;

-- Migra tareas existentes a plazos con tipo='tarea'
INSERT INTO plazos (id, caso_id, workspace_id, titulo, descripcion, fecha, tipo, estado, asignado_a, created_at)
SELECT
  id,
  caso_id,
  workspace_id,
  titulo,
  descripcion,
  COALESCE(fecha_limite, CURRENT_DATE),
  'tarea',
  CASE estado
    WHEN 'completada'  THEN 'completada'
    WHEN 'en_progreso' THEN 'en_progreso'
    ELSE 'pendiente'
  END,
  asignado_a,
  created_at
FROM tareas
ON CONFLICT (id) DO NOTHING;

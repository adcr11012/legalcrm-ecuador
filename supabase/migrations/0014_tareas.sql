-- Tabla de tareas vinculadas a casos
CREATE TABLE tareas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  caso_id        uuid NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  titulo         text NOT NULL,
  descripcion    text,
  asignado_a     uuid REFERENCES users(id) ON DELETE SET NULL,
  fecha_limite   date,
  estado         text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','en_progreso','completada')),
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro del workspace puede ver tareas de sus casos
CREATE POLICY "tareas_select" ON tareas
  FOR SELECT USING (workspace_id = current_workspace_id());

-- Solo master/admin pueden crear tareas
CREATE POLICY "tareas_insert" ON tareas
  FOR INSERT WITH CHECK (workspace_id = current_workspace_id() AND is_master());

-- El asignado puede actualizar su propia tarea; master/admin pueden actualizar cualquiera
CREATE POLICY "tareas_update" ON tareas
  FOR UPDATE USING (
    workspace_id = current_workspace_id()
    AND (is_master() OR asignado_a = auth.uid())
  );

-- Solo master/admin pueden eliminar
CREATE POLICY "tareas_delete" ON tareas
  FOR DELETE USING (workspace_id = current_workspace_id() AND is_master());

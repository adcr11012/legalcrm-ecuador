-- ════════════════════════════════════════════════════════════════════════
-- Avisos de inactividad para administradores, visibles en la campanita.
-- Se generan desde el cron (alertas-plazos) y se marcan leído al hacer clic.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE avisos_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('usuario_inactivo', 'caso_inactivo')),
  titulo text NOT NULL,
  subtitulo text NOT NULL,
  ref_id uuid NOT NULL, -- user_id o caso_id según el tipo
  to_path text NOT NULL,
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avisos_admin_workspace_id_idx ON avisos_admin(workspace_id);
CREATE INDEX avisos_admin_tipo_ref_idx ON avisos_admin(workspace_id, tipo, ref_id, leido);

ALTER TABLE avisos_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY avisos_admin_select ON avisos_admin FOR SELECT
  USING (workspace_id = current_workspace_id() AND is_admin());

CREATE POLICY avisos_admin_update ON avisos_admin FOR UPDATE
  USING (workspace_id = current_workspace_id() AND is_admin())
  WITH CHECK (workspace_id = current_workspace_id() AND is_admin());

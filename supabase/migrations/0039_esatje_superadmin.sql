-- ════════════════════════════════════════════════════════════════════════
-- eSATJE pasa a ser un servicio centralizado del superadmin: cada workspace
-- puede activarlo desde Configuración, y el superadmin extrae/consulta las
-- causas de TODOS los workspaces que lo tengan activo en una sola pasada
-- (un solo captcha diario cubre a todos los clientes).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS satje_sincronizacion_activa boolean NOT NULL DEFAULT false;

-- El superadmin necesita ver las etapas de cualquier workspace para poder
-- excluir los casos ya finalizados al armar la lista de causas a consultar.
CREATE POLICY etapas_superadmin_select ON etapas FOR SELECT
  USING (is_superadmin());

-- satje_movimientos pasa a guardar también el workspace_id (antes solo
-- caso_id) para que el superadmin pueda filtrar/insertar entre workspaces
-- sin depender de current_workspace_id(), que no aplica para él.
ALTER TABLE satje_movimientos
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

UPDATE satje_movimientos sm
SET workspace_id = c.workspace_id
FROM casos c
WHERE sm.caso_id = c.id AND sm.workspace_id IS NULL;

ALTER TABLE satje_movimientos ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS satje_movimientos_workspace_id_idx ON satje_movimientos(workspace_id);

DROP POLICY IF EXISTS satje_movimientos_admin_insert ON satje_movimientos;
CREATE POLICY satje_movimientos_insert ON satje_movimientos FOR INSERT
  WITH CHECK (
    importado_por = auth.uid()
    AND (
      (is_admin() AND workspace_id = current_workspace_id())
      OR is_superadmin()
    )
  );

CREATE POLICY satje_movimientos_superadmin_select ON satje_movimientos FOR SELECT
  USING (is_superadmin());

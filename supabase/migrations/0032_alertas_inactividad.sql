-- ════════════════════════════════════════════════════════════════════════
-- Alertas de inactividad: usuarios sin conectarse hace X días y casos sin
-- movimiento hace Y días. Configurable y activable por workspace (admin).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS alertas_inactividad_activas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dias_inactividad_usuario int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS dias_inactividad_caso int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alertas_inactividad_ultimo_envio date;

-- Siembra una etapa terminal "Finalizado" para workspaces que no tengan
-- ninguna etapa marcada como terminal todavía.
INSERT INTO etapas (workspace_id, nombre, color, es_terminal, posicion)
SELECT w.id, 'Finalizado', 'success', true, COALESCE((SELECT MAX(posicion) FROM etapas WHERE workspace_id = w.id), 0) + 1
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM etapas e WHERE e.workspace_id = w.id AND e.es_terminal = true);

-- Evita quitarle "es_terminal" a la última etapa terminal de un workspace,
-- y evita eliminarla, para garantizar que siempre exista un cierre definido.
CREATE OR REPLACE FUNCTION proteger_etapa_terminal() RETURNS trigger AS $$
DECLARE
  terminales_restantes int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.es_terminal THEN
      SELECT COUNT(*) INTO terminales_restantes FROM etapas
        WHERE workspace_id = OLD.workspace_id AND es_terminal = true AND id <> OLD.id;
      IF terminales_restantes = 0 THEN
        RAISE EXCEPTION 'Debe existir al menos una etapa terminal (ej. "Finalizado").';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.es_terminal = true AND NEW.es_terminal = false THEN
    SELECT COUNT(*) INTO terminales_restantes FROM etapas
      WHERE workspace_id = OLD.workspace_id AND es_terminal = true AND id <> OLD.id;
    IF terminales_restantes = 0 THEN
      RAISE EXCEPTION 'Debe existir al menos una etapa terminal (ej. "Finalizado").';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS etapas_proteger_terminal ON etapas;
CREATE TRIGGER etapas_proteger_terminal
  BEFORE UPDATE OR DELETE ON etapas
  FOR EACH ROW EXECUTE FUNCTION proteger_etapa_terminal();

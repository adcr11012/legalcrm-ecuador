-- ════════════════════════════════════════════════════════════════════════
-- Movimientos judiciales importados desde SATJE (eSATJE). Solo guarda una
-- descripción de cada movimiento (fecha, tipo, detalle) — nunca documentos
-- ni el expediente completo. SATJE sigue siendo la fuente de verdad; esto
-- es un registro descriptivo + detector de novedades para la app.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE satje_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  numero_causa text NOT NULL,
  fecha_movimiento date NOT NULL,
  tipo text NOT NULL,
  descripcion text,
  importado_por uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caso_id, numero_causa, fecha_movimiento, tipo)
);

CREATE INDEX satje_movimientos_caso_id_idx ON satje_movimientos(caso_id);

ALTER TABLE satje_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY satje_movimientos_select ON satje_movimientos FOR SELECT
  USING (can_view_caso(caso_id));

CREATE POLICY satje_movimientos_admin_insert ON satje_movimientos FOR INSERT
  WITH CHECK (
    importado_por = auth.uid()
    AND is_admin()
    AND EXISTS (SELECT 1 FROM casos c WHERE c.id = caso_id AND c.workspace_id = current_workspace_id())
  );

-- Refleja cada movimiento importado como una entrada más del historial del
-- caso (mismo lugar donde ya se ven cambios de etapa, documentos, etc.),
-- siguiendo el mismo patrón de "solo triggers insertan en historial".
CREATE OR REPLACE FUNCTION log_satje_movimiento() RETURNS trigger AS $$
BEGIN
  INSERT INTO historial (caso_id, user_id, accion, detalle)
  VALUES (
    NEW.caso_id,
    NEW.importado_por,
    'satje_movimiento',
    NEW.tipo || COALESCE(' — ' || NEW.descripcion, '') || ' (' || to_char(NEW.fecha_movimiento, 'DD/MM/YYYY') || ')'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS satje_movimientos_log_historial ON satje_movimientos;
CREATE TRIGGER satje_movimientos_log_historial
  AFTER INSERT ON satje_movimientos
  FOR EACH ROW EXECUTE FUNCTION log_satje_movimiento();

-- ════════════════════════════════════════════════════════════════════════
-- Fecha exacta en que un caso pasó a una etapa terminal (ej. "Finalizado").
-- Base para el futuro módulo de reportes: tiempo de resolución por caso,
-- promedio por abogado, casos cerrados en un rango de fechas, etc.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS fecha_finalizado timestamptz;

CREATE OR REPLACE FUNCTION marcar_fecha_finalizado() RETURNS trigger AS $$
DECLARE
  nueva_es_terminal boolean;
BEGIN
  IF NEW.etapa_id IS DISTINCT FROM OLD.etapa_id THEN
    SELECT es_terminal INTO nueva_es_terminal FROM etapas WHERE id = NEW.etapa_id;
    IF nueva_es_terminal THEN
      NEW.fecha_finalizado := now();
    ELSE
      NEW.fecha_finalizado := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS casos_marcar_finalizado ON casos;
CREATE TRIGGER casos_marcar_finalizado
  BEFORE UPDATE ON casos
  FOR EACH ROW EXECUTE FUNCTION marcar_fecha_finalizado();

-- Rellena retroactivamente los casos que ya están en una etapa terminal,
-- usando la fecha del cambio de etapa más reciente en su historial (o la
-- fecha de creación del caso si no hay ese registro).
UPDATE casos c
SET fecha_finalizado = COALESCE(
  (SELECT h.created_at FROM historial h
   WHERE h.caso_id = c.id AND h.accion = 'etapa_cambiada'
   ORDER BY h.created_at DESC LIMIT 1),
  c.created_at
)
FROM etapas e
WHERE e.id = c.etapa_id AND e.es_terminal = true AND c.fecha_finalizado IS NULL;

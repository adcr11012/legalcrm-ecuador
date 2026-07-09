-- ════════════════════════════════════════════════════════════════════════
-- La restricción única anterior era (caso_id, numero_causa, fecha_movimiento,
-- tipo), pero varias actuaciones reales comparten la misma fecha/hora y el
-- mismo tipo (ej. una notificación enviada a varias partes a la vez), así
-- que se estaban descartando eventos legítimos y distintos como si fueran
-- duplicados. Cada actuación real trae su propio "codigo" único en SATJE —
-- lo usamos como identificador real de duplicados.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE satje_movimientos ADD COLUMN codigo text;

-- Busca y elimina la restricción única original, sea cual sea su nombre
-- exacto (Postgres trunca nombres auto-generados largos a 63 caracteres).
DO $$
DECLARE nombre_restriccion text;
BEGIN
  SELECT conname INTO nombre_restriccion
  FROM pg_constraint
  WHERE conrelid = 'satje_movimientos'::regclass AND contype = 'u';
  IF nombre_restriccion IS NOT NULL THEN
    EXECUTE format('ALTER TABLE satje_movimientos DROP CONSTRAINT %I', nombre_restriccion);
  END IF;
END $$;

-- Los movimientos ya importados sin "codigo" (importados antes de este
-- cambio) no tienen forma de distinguirse por código real; se deja la
-- fecha+tipo como respaldo solo para esos casos legacy vía un índice
-- parcial, para no bloquear la re-importación con datos completos.
CREATE UNIQUE INDEX satje_movimientos_codigo_unq ON satje_movimientos (caso_id, numero_causa, codigo) WHERE codigo IS NOT NULL;
CREATE UNIQUE INDEX satje_movimientos_legacy_unq ON satje_movimientos (caso_id, numero_causa, fecha_movimiento, tipo) WHERE codigo IS NULL;

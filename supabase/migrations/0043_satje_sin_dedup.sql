-- ════════════════════════════════════════════════════════════════════════
-- Se decidió NO deduplicar movimientos de SATJE: si la API los devuelve
-- repetidos, se guardan repetidos, tal como aparecen en el sistema real.
-- Se agrega "orden" para preservar el orden exacto en que SATJE los
-- devuelve (en vez de reordenar por fecha, que podía cambiar el orden
-- cuando había duplicados con la misma fecha/hora).
-- ════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS satje_movimientos_codigo_unq;
DROP INDEX IF EXISTS satje_movimientos_legacy_unq;

ALTER TABLE satje_movimientos ADD COLUMN IF NOT EXISTS orden integer;

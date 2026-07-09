-- ════════════════════════════════════════════════════════════════════════
-- Agrupa los movimientos de SATJE por jurisdicción (judicatura/instancia
-- procesal) y agrega los "datos generales" del proceso, para poder
-- mostrar la info tal como aparece en SATJE: una viñeta colapsable por
-- cada jurisdicción, con sus propios datos generales + eventos.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE satje_movimientos
  ADD COLUMN jurisdiccion text,
  ADD COLUMN ciudad text;

-- Datos generales del proceso (número de proceso, materia, tipo de acción,
-- etc.) — una ficha por CADA jurisdicción del caso (no siempre son iguales
-- entre instancias), se sobrescribe en cada importación.
CREATE TABLE satje_datos_generales (
  caso_id uuid NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  jurisdiccion text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  numero_proceso text,
  materia text,
  tipo_accion text,
  delito_asunto text,
  judicatura_actual text,
  actor text,
  demandado text,
  importado_por uuid NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (caso_id, jurisdiccion)
);

ALTER TABLE satje_datos_generales ENABLE ROW LEVEL SECURITY;

CREATE POLICY satje_datos_generales_select ON satje_datos_generales FOR SELECT
  USING (can_view_caso(caso_id));

CREATE POLICY satje_datos_generales_superadmin_select ON satje_datos_generales FOR SELECT
  USING (is_superadmin());

CREATE POLICY satje_datos_generales_upsert ON satje_datos_generales FOR INSERT
  WITH CHECK (importado_por = auth.uid() AND is_superadmin());

CREATE POLICY satje_datos_generales_update ON satje_datos_generales FOR UPDATE
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

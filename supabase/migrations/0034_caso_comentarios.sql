-- ════════════════════════════════════════════════════════════════════════
-- Comentarios del caso: hilo tipo blog visible para quien puede ver el
-- caso. Un usuario borra solo el suyo; el admin puede borrar cualquiera.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE caso_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX caso_comentarios_caso_id_idx ON caso_comentarios(caso_id);

ALTER TABLE caso_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY caso_comentarios_select ON caso_comentarios FOR SELECT
  USING (can_view_caso(caso_id));

CREATE POLICY caso_comentarios_insert ON caso_comentarios FOR INSERT
  WITH CHECK (can_view_caso(caso_id) AND user_id = auth.uid());

CREATE POLICY caso_comentarios_delete ON caso_comentarios FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

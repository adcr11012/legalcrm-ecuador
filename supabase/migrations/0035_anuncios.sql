-- ════════════════════════════════════════════════════════════════════════
-- Anuncios del admin: broadcast dirigido a todos, un grupo, o usuarios
-- específicos. Queda visible para el destinatario hasta que lo marque
-- como leído.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE anuncios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES users(id),
  titulo text NOT NULL,
  contenido text NOT NULL,
  destinatario_tipo text NOT NULL CHECK (destinatario_tipo IN ('todos', 'grupo', 'usuarios')),
  destinatario_ids uuid[] NOT NULL DEFAULT '{}', -- ids de grupos o de usuarios, según destinatario_tipo
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX anuncios_workspace_id_idx ON anuncios(workspace_id);

CREATE TABLE anuncio_lecturas (
  anuncio_id uuid NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leido_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anuncio_id, user_id)
);

ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anuncio_lecturas ENABLE ROW LEVEL SECURITY;

-- Un usuario ve un anuncio si: es para todos, o pertenece a alguno de los
-- grupos destinatarios, o está directamente entre los usuarios destinatarios.
CREATE POLICY anuncios_select ON anuncios FOR SELECT
  USING (
    workspace_id = current_workspace_id()
    AND (
      destinatario_tipo = 'todos'
      OR (destinatario_tipo = 'usuarios' AND auth.uid() = ANY(destinatario_ids))
      OR (destinatario_tipo = 'grupo' AND EXISTS (
        SELECT 1 FROM grupo_usuarios gu WHERE gu.user_id = auth.uid() AND gu.grupo_id = ANY(destinatario_ids)
      ))
    )
  );

CREATE POLICY anuncios_admin_write ON anuncios FOR ALL
  USING (workspace_id = current_workspace_id() AND is_admin())
  WITH CHECK (workspace_id = current_workspace_id() AND is_admin());

CREATE POLICY anuncio_lecturas_select ON anuncio_lecturas FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY anuncio_lecturas_insert ON anuncio_lecturas FOR INSERT
  WITH CHECK (user_id = auth.uid());

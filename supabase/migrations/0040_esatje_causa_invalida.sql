-- ════════════════════════════════════════════════════════════════════════
-- Permite que el superadmin cree avisos en avisos_admin para el workspace
-- correspondiente (uno a la vez, nunca mezclado) cuando detecta un número
-- de causa con formato inválido durante la exportación de eSATJE.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE avisos_admin DROP CONSTRAINT IF EXISTS avisos_admin_tipo_check;
ALTER TABLE avisos_admin ADD CONSTRAINT avisos_admin_tipo_check
  CHECK (tipo IN ('usuario_inactivo', 'caso_inactivo', 'satje_causa_invalida'));

CREATE POLICY avisos_admin_superadmin_insert ON avisos_admin FOR INSERT
  WITH CHECK (is_superadmin());

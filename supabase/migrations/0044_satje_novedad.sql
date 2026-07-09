-- ════════════════════════════════════════════════════════════════════════
-- Aviso en la campanita (solo admins) cuando una importación de SATJE trae
-- movimientos nuevos para un caso. Un aviso por caso por corrida, se
-- mantiene sin leer hasta que el admin le da clic (mismo patrón que
-- satje_causa_invalida).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE avisos_admin DROP CONSTRAINT IF EXISTS avisos_admin_tipo_check;
ALTER TABLE avisos_admin ADD CONSTRAINT avisos_admin_tipo_check
  CHECK (tipo IN ('usuario_inactivo', 'caso_inactivo', 'satje_causa_invalida', 'satje_novedad'));

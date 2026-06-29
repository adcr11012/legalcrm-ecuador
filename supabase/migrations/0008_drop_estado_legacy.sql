-- ════════════════════════════════════════════════════════════════════════
-- Limpieza: elimina la columna "estado" (enum fijo) y su trigger asociado,
-- ya reemplazados por "etapa_id" (etapas configurables, migración 0007).
-- ════════════════════════════════════════════════════════════════════════

drop trigger if exists casos_log_estado on casos;
drop function if exists log_caso_estado_cambiado();

alter table casos drop column if exists estado;

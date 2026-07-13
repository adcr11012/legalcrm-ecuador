-- ════════════════════════════════════════════════════════════════════════
-- Auditoría de rendimiento: plazos y tareas no tenían índice en
-- workspace_id, la columna que usa RLS en cada consulta de estas tablas
-- (listAllPlazos, listAllTareasPendientes, Buscar, Dashboard, Agenda).
-- Sin índice, cada una de esas consultas hace un escaneo secuencial de
-- toda la tabla del workspace en lugar de un lookup indexado.
-- ════════════════════════════════════════════════════════════════════════

create index if not exists plazos_workspace_id_idx on plazos(workspace_id);
create index if not exists tareas_workspace_id_idx on tareas(workspace_id);
create index if not exists tareas_caso_id_idx on tareas(caso_id);

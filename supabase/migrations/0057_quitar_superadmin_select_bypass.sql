-- ════════════════════════════════════════════════════════════════════════
-- Bug de aislamiento entre workspaces: la migración 0024 le dio al
-- superadmin políticas de RLS que le permiten leer TODOS los workspaces,
-- casos, documentos y usuarios directamente sobre esas tablas — pero el
-- panel de superadmin (/admin/*) nunca usa selects directos ahí, siempre
-- pasa por funciones RPC dedicadas (admin_workspaces, admin_workspace_detail,
-- admin_global_stats), que son SECURITY DEFINER y ya bypasean RLS por su
-- cuenta, sin depender de estas políticas.
--
-- Efecto real: cuando la cuenta superadmin también usa su propio workspace
-- normal día a día (como cualquier otro usuario), TODAS las consultas de
-- la app que no filtran explícitamente por workspace (confían en RLS, el
-- patrón usado en toda la app) le devuelven filas de TODOS los workspaces
-- mezcladas — ej. Casos, conteo de Documentos, lista de Usuarios. Así
-- aparecieron casos de un workspace de prueba dentro del workspace real
-- del superadmin.
--
-- No se tocan las políticas superadmin de etapas ni satje_movimientos:
-- esas sí las usa directamente el panel /admin/esatje (servicio
-- centralizado multi-workspace por diseño), confirmado en el código.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists "workspaces_superadmin_select" on public.workspaces;
drop policy if exists "users_superadmin_select" on public.users;
drop policy if exists "casos_superadmin_select" on public.casos;
drop policy if exists "documentos_superadmin_select" on public.documentos;

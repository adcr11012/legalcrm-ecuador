-- ════════════════════════════════════════════════════════════════════════
-- tareas_select solo verificaba el workspace, no si el usuario puede ver
-- el caso — un usuario 'limitado' veía tareas de casos donde no está
-- asignado. Se corrige al mismo criterio que plazos/documentos.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists "tareas_select" on tareas;
create policy "tareas_select" on tareas for select
  using (is_master() or is_lawyer_on_caso(caso_id) or asignado_a = auth.uid());

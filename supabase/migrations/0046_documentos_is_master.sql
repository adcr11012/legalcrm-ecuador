-- ════════════════════════════════════════════════════════════════════════
-- La política de documentos usaba is_admin() (solo rol 'administrador'),
-- pero casos ya usa is_master() (administrador + master) desde la
-- migración 0013. Esto dejaba a los usuarios 'master' sin ver documentos
-- de casos donde no estuvieran asignados como abogado — inconsistente con
-- que sí pueden ver esos mismos casos. Se corrige para que documentos siga
-- el mismo criterio que casos.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists documentos_select on documentos;
create policy documentos_select on documentos for select
  using (
    is_master()
    or is_lawyer_on_caso(caso_id)
    or (visibilidad = 'compartido' and is_client_on_caso(caso_id))
  );

drop policy if exists documentos_update on documentos;
create policy documentos_update on documentos for update
  using (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists documentos_delete on documentos;
create policy documentos_delete on documentos for delete
  using (is_master() or is_lawyer_on_caso(caso_id));

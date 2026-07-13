-- ════════════════════════════════════════════════════════════════════════
-- Mismo bug de fondo que la migración 0058, pero en las políticas que
-- usan is_master() directamente en vez de pasar por can_view_caso():
-- documentos, caso_anticipos, caso_gastos, caso_horas y tareas.
-- is_master() no verifica a qué workspace pertenece el caso — un
-- admin/master veía documentos, anticipos, gastos, horas facturables y
-- tareas de casos de OTROS workspaces.
--
-- Se agrega is_master_on_caso(p_caso_id), que sí valida que el caso sea
-- del workspace actual, y se reemplaza is_master() por esta función en
-- cada política afectada.
-- ════════════════════════════════════════════════════════════════════════

create or replace function is_master_on_caso(p_caso_id uuid) returns boolean as $$
  select is_master() and exists (
    select 1 from casos c
    where c.id = p_caso_id and c.workspace_id = current_workspace_id()
  )
$$ language sql stable security definer set search_path = public;

-- documentos
drop policy if exists documentos_select on documentos;
create policy documentos_select on documentos for select
  using (
    is_master_on_caso(caso_id)
    or is_lawyer_on_caso(caso_id)
    or (visibilidad = 'compartido' and is_client_on_caso(caso_id))
  );

drop policy if exists documentos_update on documentos;
create policy documentos_update on documentos for update
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));

drop policy if exists documentos_delete on documentos;
create policy documentos_delete on documentos for delete
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));

-- caso_anticipos
drop policy if exists anticipos_select on caso_anticipos;
create policy anticipos_select on caso_anticipos for select
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));
drop policy if exists anticipos_insert on caso_anticipos;
create policy anticipos_insert on caso_anticipos for insert
  with check (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));
drop policy if exists anticipos_delete on caso_anticipos;
create policy anticipos_delete on caso_anticipos for delete
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));

-- caso_gastos
drop policy if exists gastos_select on caso_gastos;
create policy gastos_select on caso_gastos for select
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));
drop policy if exists gastos_insert on caso_gastos;
create policy gastos_insert on caso_gastos for insert
  with check (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));
drop policy if exists gastos_delete on caso_gastos;
create policy gastos_delete on caso_gastos for delete
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));

-- caso_horas
drop policy if exists horas_select on caso_horas;
create policy horas_select on caso_horas for select
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));
drop policy if exists horas_insert on caso_horas;
create policy horas_insert on caso_horas for insert
  with check (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));
drop policy if exists horas_delete on caso_horas;
create policy horas_delete on caso_horas for delete
  using (is_master_on_caso(caso_id) or is_lawyer_on_caso(caso_id));

-- tareas: tiene su propia columna workspace_id, no hace falta join a casos.
drop policy if exists "tareas_select" on tareas;
create policy "tareas_select" on tareas for select
  using (workspace_id = current_workspace_id() and (is_master() or is_lawyer_on_caso(caso_id) or asignado_a = auth.uid()));

-- ════════════════════════════════════════════════════════════════════════
-- Las políticas de facturación (anticipos, gastos, horas) solo verificaban
-- que el caso fuera del mismo workspace, no si el usuario realmente puede
-- ver ese caso — un usuario 'limitado' podía ver datos financieros de
-- casos donde no está asignado. Se corrige para usar el mismo criterio de
-- can_view_caso() que ya usan documentos y plazos.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists anticipos_select on caso_anticipos;
create policy anticipos_select on caso_anticipos for select
  using (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists anticipos_insert on caso_anticipos;
create policy anticipos_insert on caso_anticipos for insert
  with check (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists anticipos_delete on caso_anticipos;
create policy anticipos_delete on caso_anticipos for delete
  using (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists gastos_select on caso_gastos;
create policy gastos_select on caso_gastos for select
  using (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists gastos_insert on caso_gastos;
create policy gastos_insert on caso_gastos for insert
  with check (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists gastos_delete on caso_gastos;
create policy gastos_delete on caso_gastos for delete
  using (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists horas_select on caso_horas;
create policy horas_select on caso_horas for select
  using (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists horas_insert on caso_horas;
create policy horas_insert on caso_horas for insert
  with check (is_master() or is_lawyer_on_caso(caso_id));

drop policy if exists horas_delete on caso_horas;
create policy horas_delete on caso_horas for delete
  using (is_master() or is_lawyer_on_caso(caso_id));

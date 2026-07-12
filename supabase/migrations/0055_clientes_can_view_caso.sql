-- ════════════════════════════════════════════════════════════════════════
-- clientes_select solo verificaba el workspace (vía is_staff(), que desde
-- la migración 0013 es "cualquier miembro del workspace"), no si el
-- usuario realmente tiene acceso a un caso de ese cliente — un usuario
-- 'limitado' veía TODOS los clientes del despacho, no solo los de sus
-- casos asignados. Se corrige al mismo criterio que documentos/plazos:
-- master ve todo, un limitado solo los clientes vinculados a algún caso
-- donde está asignado como abogado.
-- ════════════════════════════════════════════════════════════════════════

create or replace function can_view_cliente(p_cliente_id uuid) returns boolean as $$
  select is_master() or exists (
    select 1 from caso_personas cp
    where cp.cliente_id = p_cliente_id and is_lawyer_on_caso(cp.caso_id)
  )
$$ language sql stable security definer set search_path = public;

drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes for select
  using (workspace_id = current_workspace_id() and can_view_cliente(id));

-- Crear un cliente nuevo (sin caso todavía) solo tiene sentido si quien lo
-- crea lo va a poder ver después — se restringe a master/admin, igual que
-- la creación de casos, para no generar clientes "huérfanos" invisibles
-- para un usuario limitado que los cree sin vincularlos a un caso.
drop policy if exists clientes_insert on clientes;
create policy clientes_insert on clientes for insert
  with check (workspace_id = current_workspace_id() and is_master());

drop policy if exists clientes_update on clientes;
create policy clientes_update on clientes for update
  using (workspace_id = current_workspace_id() and (is_master() or can_view_cliente(id)));

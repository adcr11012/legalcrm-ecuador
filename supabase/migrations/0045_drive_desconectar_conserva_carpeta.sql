-- ════════════════════════════════════════════════════════════════════════
-- Desconectar Drive dejaba de tener registro de la carpeta raíz (se borraba
-- la fila entera), obligando a reconectar a "adivinar" buscando en Drive
-- por una etiqueta — búsqueda que puede fallar por las limitaciones del
-- scope drive.file. Ahora desconectar solo borra la sesión (refresh_token,
-- email), pero conserva el workspace_id + root_folder_id, así reconectar
-- la misma cuenta reutiliza el ID directamente, sin depender de buscar.
-- ════════════════════════════════════════════════════════════════════════

alter table drive_conexion alter column refresh_token drop not null;
alter table drive_conexion alter column connected_email drop not null;

create or replace function drive_estado()
returns table(conectado boolean, email text)
as $$
  select (d.refresh_token is not null), d.connected_email
  from (select current_workspace_id() as wid) w
  left join drive_conexion d on d.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

create or replace function drive_desconectar()
returns void
as $$
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede desconectar Google Drive';
  end if;
  update drive_conexion
  set refresh_token = null, connected_email = null, updated_at = now()
  where workspace_id = current_workspace_id();
end;
$$ language plpgsql security definer set search_path = public;

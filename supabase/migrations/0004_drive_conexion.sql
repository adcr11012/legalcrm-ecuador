-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Conexión persistente a Google Drive (a nivel workspace)
-- ════════════════════════════════════════════════════════════════════════

create table drive_conexion (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  refresh_token text not null,
  connected_email text not null,
  root_folder_id text not null,
  connected_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sin policies de select/insert/update/delete: solo accesible vía Edge
-- Functions con la service role key. El refresh_token nunca debe llegar al cliente.
alter table drive_conexion enable row level security;

-- Carpeta de Drive cacheada por caso (se crea la primera vez que se sube algo).
alter table casos add column drive_folder_id text;

-- Estado de conexión expuesto al cliente sin filtrar el refresh_token.
create function drive_estado()
returns table(conectado boolean, email text)
as $$
  select (d.workspace_id is not null), d.connected_email
  from (select current_workspace_id() as wid) w
  left join drive_conexion d on d.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

-- Solo admin puede desconectar.
create function drive_desconectar()
returns void
as $$
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede desconectar Google Drive';
  end if;
  delete from drive_conexion where workspace_id = current_workspace_id();
end;
$$ language plpgsql security definer set search_path = public;

-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Conexión a Gemini (IA) por workspace
-- Cada workspace usa su propia clave de API (Google AI Studio), aislada
-- de los demás — sin esto, el cupo gratuito se compartiría entre todos.
-- ════════════════════════════════════════════════════════════════════════

create table gemini_conexion (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  api_key text not null,
  connected_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sin policies de select/insert/update/delete: solo accesible vía Edge
-- Functions con la service role key. La clave nunca debe llegar al cliente.
alter table gemini_conexion enable row level security;

-- Estado de conexión expuesto al cliente sin filtrar la clave.
create function gemini_estado()
returns table(conectado boolean)
as $$
  select (g.workspace_id is not null)
  from (select current_workspace_id() as wid) w
  left join gemini_conexion g on g.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

-- Solo admin puede desconectar.
create function gemini_desconectar()
returns void
as $$
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede desconectar Gemini';
  end if;
  delete from gemini_conexion where workspace_id = current_workspace_id();
end;
$$ language plpgsql security definer set search_path = public;

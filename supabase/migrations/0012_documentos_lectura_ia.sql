-- ════════════════════════════════════════════════════════════════════════
-- Lectura de documentos para TSADOQ IA: cada documento se procesa en
-- segundo plano (cron) para extraer su texto, sin bloquear al usuario.
-- mime_type decide la ruta: PDF con texto / PDF escaneado o imagen (visión)
-- / Word (texto directo) / el resto no se lee.
-- ════════════════════════════════════════════════════════════════════════

alter table documentos add column mime_type text;
alter table documentos add column estado_lectura text not null default 'no_aplica'
  check (estado_lectura in ('no_aplica', 'pendiente', 'procesando', 'listo', 'error'));
alter table documentos add column contenido_texto text;
alter table documentos add column error_lectura text;

create index documentos_estado_lectura_idx on documentos(estado_lectura) where estado_lectura = 'pendiente';

-- Conexión de OpenRouter por workspace (mismo patrón que groq_conexion:
-- sin policies de RLS, solo accesible vía service_role desde Edge Functions).
create table openrouter_conexion (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  api_key text not null,
  connected_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table openrouter_conexion enable row level security;

create function openrouter_estado()
returns table(conectado boolean)
as $$
  select (o.workspace_id is not null)
  from (select current_workspace_id() as wid) w
  left join openrouter_conexion o on o.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

create function openrouter_desconectar()
returns void
as $$
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede desconectar la IA de visión';
  end if;
  delete from openrouter_conexion where workspace_id = current_workspace_id();
end;
$$ language plpgsql security definer set search_path = public;

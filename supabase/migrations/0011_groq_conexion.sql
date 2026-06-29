-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Reemplaza Gemini por Groq (gratis en Ecuador).
-- El nivel gratuito de la API de Gemini no está disponible por país;
-- Groq sí, sin tarjeta. Misma idea: una clave por workspace.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists gemini_estado();
drop function if exists gemini_desconectar();
drop table if exists gemini_conexion;

create table groq_conexion (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  api_key text not null,
  connected_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table groq_conexion enable row level security;

create function groq_estado()
returns table(conectado boolean)
as $$
  select (g.workspace_id is not null)
  from (select current_workspace_id() as wid) w
  left join groq_conexion g on g.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

create function groq_desconectar()
returns void
as $$
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede desconectar la IA';
  end if;
  delete from groq_conexion where workspace_id = current_workspace_id();
end;
$$ language plpgsql security definer set search_path = public;

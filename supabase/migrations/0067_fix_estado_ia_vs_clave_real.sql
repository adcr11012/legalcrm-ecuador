-- ════════════════════════════════════════════════════════════════════════
-- Bug: groq_estado() y openrouter_estado() solo verificaban que existiera
-- una FILA en groq_conexion/openrouter_conexion, sin comprobar que esa
-- fila tuviera una clave válida enlazada al vault (api_key_secret_id no
-- nulo). Resultado: el punto verde del sidebar decía "Conectado" mientras
-- get_groq_key()/get_openrouter_key() (las que realmente usan las Edge
-- Functions caso-ia y workspace-ia) devolvían null, mostrando "TSADOQ IA
-- no está conectada en este workspace" pese al indicador verde.
-- ════════════════════════════════════════════════════════════════════════

create or replace function groq_estado()
returns table(conectado boolean)
as $$
  select (g.api_key_secret_id is not null)
  from (select current_workspace_id() as wid) w
  left join groq_conexion g on g.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

create or replace function openrouter_estado()
returns table(conectado boolean)
as $$
  select (o.api_key_secret_id is not null)
  from (select current_workspace_id() as wid) w
  left join openrouter_conexion o on o.workspace_id = w.wid
$$ language sql stable security definer set search_path = public;

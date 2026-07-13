-- ════════════════════════════════════════════════════════════════════════
-- Bug de fondo, más serio que los anteriores: can_view_caso(p_caso_id)
-- nunca verificaba que el caso perteneciera al workspace del usuario que
-- consulta. Para un admin/master, is_master() es simplemente "¿mi rol es
-- administrador o master?" — no está atado a ningún caso ni workspace en
-- particular. Como resultado, can_view_caso(id) devolvía true para
-- CUALQUIER caso_id de CUALQUIER workspace si quien pregunta es
-- admin/master en su propio workspace, sin importar si ese caso era suyo.
--
-- Esto afectaba a TODAS las tablas cuya política usa can_view_caso():
-- caso_personas, plazos, historial, caso_comentarios, satje_movimientos,
-- satje_datos_generales. Un admin/master veía plazos, personas asignadas,
-- historial, comentarios internos y movimientos SATJE de casos de OTROS
-- workspaces — se manifestó primero como plazos ajenos apareciendo en la
-- Agenda propia.
--
-- Se corrige can_view_caso() para que además exija que el caso pertenezca
-- al workspace actual — un solo punto de arreglo que corrige las 6 tablas
-- de una vez, sin tocar cada política por separado.
-- ════════════════════════════════════════════════════════════════════════

create or replace function can_view_caso(p_caso_id uuid) returns boolean as $$
  select exists (
    select 1 from casos c
    where c.id = p_caso_id and c.workspace_id = current_workspace_id()
  ) and (
    is_master() or is_lawyer_on_caso(p_caso_id) or is_client_on_caso(p_caso_id)
  )
$$ language sql stable security definer set search_path = public;

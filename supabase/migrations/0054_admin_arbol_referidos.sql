-- ════════════════════════════════════════════════════════════════════════
-- Vista de auditoría para el superadmin: todos los códigos de referido
-- (no solo los raíz), con el nombre del workspace que los generó y el
-- que los usó — para poder rastrear de dónde viene cada registro nuevo.
-- ════════════════════════════════════════════════════════════════════════

create or replace function admin_arbol_referidos()
returns table(
  id                      uuid,
  codigo                  text,
  semillas                int,
  usado                   boolean,
  expira_at               timestamptz,
  created_at              timestamptz,
  usado_at                timestamptz,
  generado_por_workspace  text,
  generado_por_email      text,
  usado_por_workspace     text,
  usado_por_email         text
) as $$
  select
    cr.id,
    cr.codigo,
    cr.semillas,
    cr.usado,
    cr.expira_at,
    cr.created_at,
    cr.usado_at,
    wg.nombre                                as generado_por_workspace,
    auwg.email                               as generado_por_email,
    wu.nombre                                as usado_por_workspace,
    auwu.email                               as usado_por_email
  from codigos_referido cr
  left join workspaces wg on wg.id = cr.creado_por_workspace_id
  left join users owg on owg.workspace_id = wg.id and owg.es_propietario = true
  left join auth.users auwg on auwg.id = owg.id
  left join workspaces wu on wu.id = cr.usado_por_workspace_id
  left join users owu on owu.workspace_id = wu.id and owu.es_propietario = true
  left join auth.users auwu on auwu.id = owu.id
  where is_superadmin()
  order by cr.created_at desc
$$ language sql stable security definer set search_path = public;

-- ════════════════════════════════════════════════════════════════════════
-- admin_listar_codigos_raiz: ahora también trae nombre y correo de quien
-- usó cada código raíz, para no tener que ir a la pestaña "Cadena completa"
-- solo para saber quién se registró con él.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.admin_listar_codigos_raiz();

create or replace function admin_listar_codigos_raiz()
returns table(
  id                  uuid,
  codigo              text,
  semillas            int,
  usado               boolean,
  usado_por_workspace_id uuid,
  usado_at            timestamptz,
  expira_at           timestamptz,
  created_at          timestamptz,
  usado_por_nombre    text,
  usado_por_email     text
) as $$
  select
    cr.id,
    cr.codigo,
    cr.semillas,
    cr.usado,
    cr.usado_por_workspace_id,
    cr.usado_at,
    cr.expira_at,
    cr.created_at,
    wu.nombre  as usado_por_nombre,
    auwu.email as usado_por_email
  from codigos_referido cr
  left join workspaces wu on wu.id = cr.usado_por_workspace_id
  left join users owu on owu.workspace_id = wu.id and owu.es_propietario = true
  left join auth.users auwu on auwu.id = owu.id
  where cr.creado_por_workspace_id is null and is_superadmin()
  order by cr.created_at desc
$$ language sql stable security definer set search_path = public;

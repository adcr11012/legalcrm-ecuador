-- ════════════════════════════════════════════════════════════════════════
-- 1) Un workspace normal ahora puede ver, de sus propios códigos de
-- referido, quién se registró con cada uno (nombre + correo) — y lo
-- mismo para los códigos que esa persona a su vez reparte, recursivo,
-- limitado a la cadena que nace en sus propios códigos (no ve nada fuera
-- de su propia cadena, a diferencia de admin_arbol_referidos que ve todo
-- el sistema).
-- ════════════════════════════════════════════════════════════════════════

create or replace function mis_referidos_arbol()
returns table(
  id                  uuid,
  codigo              text,
  semillas            int,
  usado               boolean,
  expira_at           timestamptz,
  created_at          timestamptz,
  usado_at            timestamptz,
  nivel               int,
  generado_por_nombre text,
  generado_por_email  text,
  usado_por_nombre    text,
  usado_por_email     text
) as $$
  with recursive cadena as (
    select cr.*, 1 as nivel
    from codigos_referido cr
    where cr.creado_por_workspace_id = current_workspace_id()
    union all
    select cr.*, c.nivel + 1
    from codigos_referido cr
    join cadena c on cr.creado_por_workspace_id = c.usado_por_workspace_id
  )
  select
    cr.id, cr.codigo, cr.semillas, cr.usado, cr.expira_at, cr.created_at, cr.usado_at, cr.nivel,
    owg.nombre  as generado_por_nombre,
    auwg.email  as generado_por_email,
    owu.nombre  as usado_por_nombre,
    auwu.email  as usado_por_email
  from cadena cr
  left join users owg on owg.workspace_id = cr.creado_por_workspace_id and owg.es_propietario = true
  left join auth.users auwg on auwg.id = owg.id
  left join users owu on owu.workspace_id = cr.usado_por_workspace_id and owu.es_propietario = true
  left join auth.users auwu on auwu.id = owu.id
  order by cr.nivel, cr.created_at desc
$$ language sql stable security definer set search_path = public;

-- ════════════════════════════════════════════════════════════════════════
-- 2) admin_workspaces(): agrega el nombre del propietario (ya traía el
-- correo) y el límite de usuarios incluidos en el plan, para mostrar en
-- el panel algo tipo "3/15" en vez de solo el número absoluto.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.admin_workspaces();

create or replace function public.admin_workspaces()
returns table(
  id             uuid,
  nombre         text,
  plan           text,
  suspended      boolean,
  created_at     timestamptz,
  usuarios       bigint,
  limite_usuarios int,
  casos          bigint,
  documentos     bigint,
  owner_nombre   text,
  owner_email    text
) language sql stable security definer
set search_path = public as $$
  select
    w.id,
    w.nombre,
    w.plan,
    w.suspended,
    w.created_at,
    count(distinct u.id)   as usuarios,
    case w.plan
      when 'free' then 1
      when 'pro' then 3
      when 'enterprise' then 15
      when 'demo_enterprise' then 15
      else 1
    end                     as limite_usuarios,
    count(distinct c.id)   as casos,
    count(distinct d.id)   as documentos,
    ow.nombre               as owner_nombre,
    au.email                as owner_email
  from workspaces w
  left join users u  on u.workspace_id = w.id
  left join users ow on ow.workspace_id = w.id and ow.es_propietario = true
  left join auth.users au on au.id = ow.id
  left join casos c  on c.workspace_id = w.id
  left join documentos d on d.caso_id = c.id
  where is_superadmin()
  group by w.id, w.nombre, w.plan, w.suspended, w.created_at, ow.nombre, au.email
  order by w.created_at desc
$$;

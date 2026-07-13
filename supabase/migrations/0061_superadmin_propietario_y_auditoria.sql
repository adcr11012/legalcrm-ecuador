-- ════════════════════════════════════════════════════════════════════════
-- 1) Superadmin "propietario": un superadmin marcado como propietario no
--    puede ser eliminado por nadie a través de la app (ni por otros
--    superadmins, ni por sí mismo) — solo se puede modificar directamente
--    por SQL. El resto de superadmins sí pueden agregarse/quitarse
--    normalmente desde /admin/superadmins.
--
-- 2) Auditoría de accesos: cuando un superadmin (que NO sea el
--    propietario) revisa el detalle o los pagos de un workspace, queda
--    registrado qué vio y cuándo. El superadmin propietario es el único
--    cuyos accesos NO se registran.
-- ════════════════════════════════════════════════════════════════════════

alter table superadmins add column if not exists es_propietario boolean not null default false;

-- Marca como propietario a la cuenta indicada. Ajusta el correo si hace falta.
update superadmins set es_propietario = true
where user_id = (select id from auth.users where email = 'andrescas@gmail.com');

-- ── Tabla de auditoría ───────────────────────────────────────────────
create table if not exists superadmin_accesos (
  id                  uuid primary key default gen_random_uuid(),
  superadmin_user_id  uuid not null references auth.users(id) on delete cascade,
  workspace_id        uuid references workspaces(id) on delete set null,
  accion              text not null,
  created_at          timestamptz not null default now()
);
create index if not exists superadmin_accesos_workspace_idx on superadmin_accesos(workspace_id);
create index if not exists superadmin_accesos_superadmin_idx on superadmin_accesos(superadmin_user_id);

alter table superadmin_accesos enable row level security;
drop policy if exists "superadmin_accesos_select" on superadmin_accesos;
create policy "superadmin_accesos_select" on superadmin_accesos for select
  using (is_superadmin());
-- Sin políticas de insert/update/delete para clientes: solo se escribe
-- desde funciones SECURITY DEFINER.

-- ── Helper: registra un acceso, salvo que quien accede sea el propietario ──
create or replace function log_acceso_superadmin(p_workspace_id uuid, p_accion text) returns void as $$
begin
  if is_superadmin() and not exists (
    select 1 from superadmins where user_id = auth.uid() and es_propietario
  ) then
    insert into superadmin_accesos (superadmin_user_id, workspace_id, accion)
    values (auth.uid(), p_workspace_id, p_accion);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ── admin_workspace_detail: ahora registra el acceso ────────────────────
create or replace function public.admin_workspace_detail(p_workspace_id uuid)
returns json as $$
declare
  v_result json;
begin
  if not is_superadmin() then
    return null;
  end if;

  perform log_acceso_superadmin(p_workspace_id, 'ver_detalle_workspace');

  select json_build_object(
    'workspace', (select row_to_json(w) from workspaces w where w.id = p_workspace_id),
    'usuarios',  (select json_agg(json_build_object('nombre', u.nombre, 'email', au.email, 'rol', u.rol, 'created_at', u.created_at))
                  from users u join auth.users au on au.id = u.id
                  where u.workspace_id = p_workspace_id),
    'stats',     json_build_object(
                   'casos',      (select count(*)::int from casos where workspace_id = p_workspace_id),
                   'documentos', (select count(*)::int from documentos d join casos c on c.id = d.caso_id where c.workspace_id = p_workspace_id),
                   'clientes',   (select count(*)::int from clientes where workspace_id = p_workspace_id),
                   'tareas',     (select count(*)::int from tareas where workspace_id = p_workspace_id)
                 )
  ) into v_result;

  return v_result;
end;
$$ language plpgsql security definer set search_path = public;

-- ── admin_workspace_pagos: ídem, registra el acceso a información financiera ──
create or replace function public.admin_workspace_pagos(p_workspace_id uuid)
returns table(
  id             uuid,
  periodo_inicio date,
  periodo_fin    date,
  monto          numeric,
  estado         text,
  fecha_pago     date,
  notas          text
) as $$
begin
  if not is_superadmin() then
    return;
  end if;

  perform log_acceso_superadmin(p_workspace_id, 'ver_pagos_workspace');

  return query
    select sp.id, sp.periodo_inicio, sp.periodo_fin, sp.monto, sp.estado, sp.fecha_pago, sp.notas
      from suscripcion_pagos sp
     where sp.workspace_id = p_workspace_id
     order by sp.periodo_inicio desc;
end;
$$ language plpgsql security definer set search_path = public;

-- ── admin_quitar_superadmin: bloquea eliminar al propietario ────────────
create or replace function admin_quitar_superadmin(p_user_id uuid)
returns void as $$
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes quitarte el acceso de superadmin a ti mismo';
  end if;
  if exists (select 1 from superadmins where user_id = p_user_id and es_propietario) then
    raise exception 'No se puede quitar al superadmin propietario';
  end if;

  delete from superadmins where user_id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ── admin_listar_superadmins: ahora incluye es_propietario ──────────────
drop function if exists admin_listar_superadmins();
create or replace function admin_listar_superadmins()
returns table(user_id uuid, email text, nombre text, created_at timestamptz, es_propietario boolean) as $$
  select s.user_id, au.email, u.nombre, s.created_at, s.es_propietario
  from superadmins s
  join auth.users au on au.id = s.user_id
  left join users u on u.id = s.user_id
  where is_superadmin()
  order by s.es_propietario desc, s.created_at
$$ language sql stable security definer set search_path = public;

-- ── RPC: listar accesos registrados (para mostrarlos en el panel) ──────
create or replace function admin_listar_accesos(p_workspace_id uuid default null)
returns table(
  id                  uuid,
  superadmin_email    text,
  superadmin_nombre   text,
  workspace_id        uuid,
  workspace_nombre    text,
  accion              text,
  created_at          timestamptz
) as $$
  select
    sa.id,
    au.email,
    u.nombre,
    sa.workspace_id,
    w.nombre,
    sa.accion,
    sa.created_at
  from superadmin_accesos sa
  join auth.users au on au.id = sa.superadmin_user_id
  left join users u on u.id = sa.superadmin_user_id
  left join workspaces w on w.id = sa.workspace_id
  where is_superadmin()
    and (p_workspace_id is null or sa.workspace_id = p_workspace_id)
  order by sa.created_at desc
  limit 200
$$ language sql stable security definer set search_path = public;

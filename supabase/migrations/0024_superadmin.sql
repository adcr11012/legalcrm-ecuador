-- ── Tabla de superadmins ────────────────────────────────────────────
-- Completamente separada de los roles de workspace.
-- Solo service_role puede insertar/eliminar.
create table public.superadmins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.superadmins enable row level security;

-- El propio superadmin puede leer su fila (para que el cliente sepa si lo es)
create policy "superadmins_self_select"
  on public.superadmins for select
  using (user_id = auth.uid());

-- ── Función auxiliar ────────────────────────────────────────────────
create or replace function public.is_superadmin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from superadmins where user_id = auth.uid())
$$;

-- ── Suspensión de workspaces ─────────────────────────────────────────
alter table public.workspaces add column if not exists
  suspended boolean not null default false;

-- ── Políticas de lectura para superadmin ────────────────────────────
-- workspaces
create policy "workspaces_superadmin_select"
  on public.workspaces for select using (is_superadmin());

-- users
create policy "users_superadmin_select"
  on public.users for select using (is_superadmin());

-- casos
create policy "casos_superadmin_select"
  on public.casos for select using (is_superadmin());

-- documentos
create policy "documentos_superadmin_select"
  on public.documentos for select using (is_superadmin());

-- Superadmin puede actualizar workspaces (plan, suspended)
create policy "workspaces_superadmin_update"
  on public.workspaces for update using (is_superadmin());

-- ── RPC: stats globales ──────────────────────────────────────────────
create or replace function public.admin_global_stats()
returns json language sql stable security definer
set search_path = public as $$
  select case when is_superadmin() then json_build_object(
    'workspaces', (select count(*)::int from workspaces),
    'usuarios',   (select count(*)::int from users),
    'casos',      (select count(*)::int from casos),
    'documentos', (select count(*)::int from documentos)
  ) else null end
$$;

-- ── RPC: lista de workspaces con métricas ───────────────────────────
create or replace function public.admin_workspaces()
returns table(
  id           uuid,
  nombre       text,
  plan         text,
  suspended    boolean,
  created_at   timestamptz,
  usuarios     bigint,
  casos        bigint,
  documentos   bigint,
  owner_email  text
) language sql stable security definer
set search_path = public as $$
  select
    w.id,
    w.nombre,
    w.plan,
    w.suspended,
    w.created_at,
    count(distinct u.id)   as usuarios,
    count(distinct c.id)   as casos,
    count(distinct d.id)   as documentos,
    au.email               as owner_email
  from workspaces w
  left join users u  on u.workspace_id = w.id
  left join users ow on ow.workspace_id = w.id and ow.es_propietario = true
  left join auth.users au on au.id = ow.id
  left join casos c  on c.workspace_id = w.id
  left join documentos d on d.caso_id = c.id
  where is_superadmin()
  group by w.id, w.nombre, w.plan, w.suspended, w.created_at, au.email
  order by w.created_at desc
$$;

-- ── RPC: detalle de un workspace ─────────────────────────────────────
create or replace function public.admin_workspace_detail(p_workspace_id uuid)
returns json language sql stable security definer
set search_path = public as $$
  select case when is_superadmin() then json_build_object(
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
  ) else null end
$$;

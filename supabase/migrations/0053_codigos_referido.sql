-- ════════════════════════════════════════════════════════════════════════
-- Sistema de códigos de referido "semillas decrecientes" (tipo Gmail
-- invite-only). Quien se registra con un código válido obtiene el plan
-- Enterprise de inmediato y hereda N-1 códigos propios para regalar,
-- donde N son las "semillas" del código que usó. Al llegar a 0 semillas,
-- el código sigue dando el beneficio pero ya no genera hijos: ahí
-- termina esa rama de la cadena.
-- ════════════════════════════════════════════════════════════════════════

create table codigos_referido (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique,
  semillas                 int not null,
  creado_por_workspace_id  uuid references workspaces(id) on delete set null,
  usado                    boolean not null default false,
  usado_por_workspace_id   uuid references workspaces(id) on delete set null,
  usado_at                 timestamptz,
  expira_at                timestamptz,
  created_at               timestamptz not null default now()
);
create index codigos_referido_creado_por_idx on codigos_referido(creado_por_workspace_id);

alter table codigos_referido enable row level security;

-- Un administrador del workspace que generó el código puede ver sus propios
-- códigos (para copiarlos/repartirlos), pero no los de otros workspaces.
create policy "codigos_referido_owner_select" on codigos_referido for select
  using (creado_por_workspace_id = current_workspace_id() and is_admin());

-- El superadmin ve todo (para generar y auditar códigos raíz).
create policy "codigos_referido_superadmin_select" on codigos_referido for select
  using (is_superadmin());

create policy "codigos_referido_superadmin_insert" on codigos_referido for insert
  with check (is_superadmin());

-- ── RPC: registrar_workspace ahora acepta un código de referido opcional ──
-- Si el código es válido: crea el workspace en plan 'enterprise', marca el
-- código como usado, y genera (semillas - 1) códigos hijos para el nuevo
-- workspace. Todo en una sola transacción — si el código es inválido, no
-- se crea nada y se lanza una excepción clara para el frontend.
create or replace function registrar_workspace(
  p_nombre_workspace text,
  p_nombre_usuario text,
  p_codigo_referido text default null
)
returns json as $$
declare
  v_workspace_id uuid;
  v_codigo codigos_referido%rowtype;
  v_plan text := 'free';
  v_nuevos_codigos text[] := array[]::text[];
  v_i int;
  v_nuevo_codigo text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'El usuario ya pertenece a un workspace';
  end if;

  if p_codigo_referido is not null and length(trim(p_codigo_referido)) > 0 then
    select * into v_codigo from codigos_referido
      where codigo = upper(trim(p_codigo_referido))
        and usado = false
        and (expira_at is null or expira_at > now())
      for update;
    if v_codigo.id is null then
      raise exception 'CODIGO_INVALIDO';
    end if;
    v_plan := 'enterprise';
  end if;

  insert into workspaces (nombre, plan) values (p_nombre_workspace, v_plan) returning id into v_workspace_id;

  insert into users (id, workspace_id, nombre, email, rol, es_propietario)
  values (auth.uid(), v_workspace_id, p_nombre_usuario, auth.email(), 'administrador', true);

  if v_codigo.id is not null then
    update codigos_referido
      set usado = true, usado_por_workspace_id = v_workspace_id, usado_at = now()
      where id = v_codigo.id;

    if v_codigo.semillas > 0 then
      for v_i in 1..v_codigo.semillas loop
        v_nuevo_codigo := upper(substr(md5(random()::text || clock_timestamp()::text || v_i::text), 1, 8));
        insert into codigos_referido (codigo, semillas, creado_por_workspace_id, expira_at)
          values (v_nuevo_codigo, v_codigo.semillas - 1, v_workspace_id, now() + interval '60 days');
        v_nuevos_codigos := array_append(v_nuevos_codigos, v_nuevo_codigo);
      end loop;
    end if;
  end if;

  return json_build_object(
    'workspace_id', v_workspace_id,
    'plan', v_plan,
    'codigo_valido', v_codigo.id is not null,
    'semillas_heredadas', coalesce(v_codigo.semillas, 0),
    'codigos_generados', to_json(v_nuevos_codigos)
  );
end;
$$ language plpgsql security definer set search_path = public;

-- ── RPC: superadmin genera códigos raíz (sin workspace padre) ───────────
create or replace function admin_crear_codigos_referido(p_cantidad int, p_semillas int default 6)
returns text[] as $$
declare
  v_codigos text[] := array[]::text[];
  v_nuevo_codigo text;
  v_i int;
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if p_cantidad <= 0 or p_cantidad > 100 then
    raise exception 'Cantidad inválida';
  end if;

  for v_i in 1..p_cantidad loop
    v_nuevo_codigo := upper(substr(md5(random()::text || clock_timestamp()::text || v_i::text), 1, 8));
    insert into codigos_referido (codigo, semillas, creado_por_workspace_id, expira_at)
      values (v_nuevo_codigo, p_semillas, null, now() + interval '60 days');
    v_codigos := array_append(v_codigos, v_nuevo_codigo);
  end loop;

  return v_codigos;
end;
$$ language plpgsql security definer set search_path = public;

-- ── RPC: superadmin lista todos los códigos raíz (sin padre) ────────────
create or replace function admin_listar_codigos_raiz()
returns setof codigos_referido as $$
  select * from codigos_referido
  where creado_por_workspace_id is null and is_superadmin()
  order by created_at desc
$$ language sql stable security definer set search_path = public;

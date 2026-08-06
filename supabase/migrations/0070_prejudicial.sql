-- ════════════════════════════════════════════════════════════════════════
-- Gestión prejudicial: un caso puede empezar antes de ser judicial
-- (negociación con aseguradoras, cartas, acuerdos) y de ahí pasar al
-- proceso judicial normal, o cerrarse directo con un acuerdo sin nunca
-- judicializarse.
--
-- 1) Nueva etapa "Prejudicial" (posición 1) en el flujo por defecto de
--    cada workspace, tanto para workspaces nuevos como existentes.
-- 2) casos.paso_por_prejudicial: se marca true la primera vez que el caso
--    entra a la etapa "Prejudicial" — queda así aunque después se
--    judicialice, para poder filtrar/reportar "pasó por prejudicial" sin
--    depender de la etapa actual.
-- 3) casos.resultado_prejudicial: 'acuerdo' | 'judicializado' — se registra
--    al salir de la etapa "Prejudicial" hacia cualquier otra.
-- 4) plazos.tipo admite 'prejudicial' (cartas, reuniones de negociación,
--    plazos de gestión prejudicial, distintos de los plazos procesales).
-- ════════════════════════════════════════════════════════════════════════

alter table casos add column if not exists paso_por_prejudicial boolean not null default false;
alter table casos add column if not exists resultado_prejudicial text
  check (resultado_prejudicial in ('acuerdo', 'judicializado'));

alter table plazos drop constraint if exists plazos_tipo_check;
alter table plazos add constraint plazos_tipo_check
  check (tipo in ('plazo', 'audiencia', 'tarea', 'otro', 'prejudicial'));

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
    v_plan := 'demo_enterprise';
  end if;

  insert into workspaces (nombre, plan) values (p_nombre_workspace, v_plan) returning id into v_workspace_id;

  insert into users (id, workspace_id, nombre, email, rol, es_propietario)
  values (auth.uid(), v_workspace_id, p_nombre_usuario, auth.email(), 'administrador', true);

  insert into etapas (workspace_id, nombre, color, es_terminal, posicion) values
    (v_workspace_id, 'Prejudicial', 'purple', false, 1),
    (v_workspace_id, 'Nuevo', 'neutral', false, 2),
    (v_workspace_id, 'Activo', 'accent', false, 3),
    (v_workspace_id, 'En espera', 'warn', false, 4),
    (v_workspace_id, 'Audiencia próxima', 'danger', false, 5),
    (v_workspace_id, 'Resuelto', 'success', true, 6),
    (v_workspace_id, 'Archivado', 'neutral', true, 7);

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

-- Workspaces existentes: agregar "Prejudicial" al inicio del flujo sin
-- tocar el etapa_id de ningún caso ya creado — solo se recorre la
-- posición del resto de etapas +1 y se inserta la nueva en la posición 1.
do $$
declare
  ws record;
begin
  for ws in select id from workspaces loop
    if not exists (select 1 from etapas where workspace_id = ws.id and nombre = 'Prejudicial') then
      update etapas set posicion = posicion + 1 where workspace_id = ws.id;
      insert into etapas (workspace_id, nombre, color, es_terminal, posicion)
      values (ws.id, 'Prejudicial', 'purple', false, 1);
    end if;
  end loop;
end $$;

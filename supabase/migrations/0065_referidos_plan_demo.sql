-- ════════════════════════════════════════════════════════════════════════
-- Quien se registra con un código de referido (fase de lanzamiento cerrado,
-- antes de tener cobro real) ahora recibe el plan oculto 'demo_enterprise'
-- en vez de 'enterprise' — así no se mezclan con clientes reales pagando
-- una vez que Facturación esté activa (migración 0025 + PayPhone). El
-- beneficio percibido por el usuario (acceso completo) es el mismo; solo
-- cambia la etiqueta interna para no ensuciar los reportes de ingresos.
-- ════════════════════════════════════════════════════════════════════════

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
    (v_workspace_id, 'Nuevo', 'neutral', false, 1),
    (v_workspace_id, 'Activo', 'accent', false, 2),
    (v_workspace_id, 'En espera', 'warn', false, 3),
    (v_workspace_id, 'Audiencia próxima', 'danger', false, 4),
    (v_workspace_id, 'Resuelto', 'success', true, 5),
    (v_workspace_id, 'Archivado', 'neutral', true, 6);

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

-- Backfill: workspaces que ya se registraron con código de referido antes
-- de este cambio y quedaron en 'enterprise' — se pasan a 'demo_enterprise'
-- para no aparecer como clientes reales en Facturación.
update workspaces
set plan = 'demo_enterprise'
where plan = 'enterprise'
  and id in (select usado_por_workspace_id from codigos_referido where usado_por_workspace_id is not null);

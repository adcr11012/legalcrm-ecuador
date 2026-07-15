-- ════════════════════════════════════════════════════════════════════════
-- Canje de código de referido DESPUÉS del registro (sin mezclarlo con el
-- futuro programa de referidos permanente). Un workspace que ya existe
-- (se registró sin código, o quiere usar uno recibido después) puede
-- canjear un código válido desde Configuración y recibir el mismo
-- beneficio que si lo hubiera puesto al registrarse: demo_enterprise +
-- hereda semillas para repartir. Solo se puede canjear una vez por
-- workspace (columna workspaces.codigo_referido_canjeado).
-- ════════════════════════════════════════════════════════════════════════

alter table workspaces add column if not exists codigo_referido_canjeado boolean not null default false;

create or replace function canjear_codigo_referido(p_codigo text)
returns json as $$
declare
  v_workspace_id uuid;
  v_codigo codigos_referido%rowtype;
  v_nuevos_codigos text[] := array[]::text[];
  v_i int;
  v_nuevo_codigo text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select workspace_id into v_workspace_id from users where id = auth.uid();
  if v_workspace_id is null then
    raise exception 'Usuario sin workspace';
  end if;
  if not is_admin() then
    raise exception 'Solo un administrador puede canjear el código';
  end if;
  if exists (select 1 from workspaces where id = v_workspace_id and codigo_referido_canjeado) then
    raise exception 'YA_CANJEADO';
  end if;

  select * into v_codigo from codigos_referido
    where codigo = upper(trim(p_codigo))
      and usado = false
      and (expira_at is null or expira_at > now())
    for update;
  if v_codigo.id is null then
    raise exception 'CODIGO_INVALIDO';
  end if;

  update codigos_referido
    set usado = true, usado_por_workspace_id = v_workspace_id, usado_at = now()
    where id = v_codigo.id;

  update workspaces set plan = 'demo_enterprise', codigo_referido_canjeado = true where id = v_workspace_id;

  if v_codigo.semillas > 0 then
    for v_i in 1..v_codigo.semillas loop
      v_nuevo_codigo := upper(substr(md5(random()::text || clock_timestamp()::text || v_i::text), 1, 8));
      insert into codigos_referido (codigo, semillas, creado_por_workspace_id, expira_at)
        values (v_nuevo_codigo, v_codigo.semillas - 1, v_workspace_id, now() + interval '60 days');
      v_nuevos_codigos := array_append(v_nuevos_codigos, v_nuevo_codigo);
    end loop;
  end if;

  return json_build_object(
    'plan', 'demo_enterprise',
    'semillas_heredadas', v_codigo.semillas,
    'codigos_generados', to_json(v_nuevos_codigos)
  );
end;
$$ language plpgsql security definer set search_path = public;

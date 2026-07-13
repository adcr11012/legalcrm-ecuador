-- ════════════════════════════════════════════════════════════════════════
-- Permite gestionar quién es superadmin desde la propia app (panel
-- /admin), en vez de tener que insertar/borrar filas de la tabla
-- superadmins manualmente por SQL Editor cada vez.
-- ════════════════════════════════════════════════════════════════════════

-- Un superadmin puede ver la lista completa de superadmins (no solo su
-- propia fila, como permitía la política original).
create policy "superadmins_admin_select"
  on public.superadmins for select
  using (is_superadmin());

-- ── RPC: listar superadmins con nombre/correo ───────────────────────────
create or replace function admin_listar_superadmins()
returns table(user_id uuid, email text, nombre text, created_at timestamptz) as $$
  select s.user_id, au.email, u.nombre, s.created_at
  from superadmins s
  join auth.users au on au.id = s.user_id
  left join users u on u.id = s.user_id
  where is_superadmin()
  order by s.created_at
$$ language sql stable security definer set search_path = public;

-- ── RPC: agregar superadmin por correo (debe ser un usuario existente) ──
create or replace function admin_agregar_superadmin(p_email text)
returns void as $$
declare
  v_user_id uuid;
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;

  select id into v_user_id from auth.users where email = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'No existe ninguna cuenta con ese correo';
  end if;

  insert into superadmins (user_id) values (v_user_id)
  on conflict (user_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- ── RPC: quitar superadmin (no permite auto-eliminarse, evita quedar sin acceso) ──
create or replace function admin_quitar_superadmin(p_user_id uuid)
returns void as $$
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes quitarte el acceso de superadmin a ti mismo';
  end if;

  delete from superadmins where user_id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

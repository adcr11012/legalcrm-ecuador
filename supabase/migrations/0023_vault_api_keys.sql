-- Cifrar API keys en Supabase Vault (pgsodium)
-- groq_conexion y openrouter_conexion pasan de texto plano a vault secrets

-- ── 1. Agregar columna para el ID del secret en vault ────────────────────
alter table groq_conexion       add column api_key_secret_id uuid;
alter table openrouter_conexion add column api_key_secret_id uuid;

-- ── 2. Migrar keys existentes al vault ───────────────────────────────────
update groq_conexion
  set api_key_secret_id = vault.create_secret(api_key, 'groq-' || workspace_id::text)
  where api_key is not null;

update openrouter_conexion
  set api_key_secret_id = vault.create_secret(api_key, 'openrouter-' || workspace_id::text)
  where api_key is not null;

-- ── 3. Eliminar columnas en texto plano ──────────────────────────────────
alter table groq_conexion       drop column api_key;
alter table openrouter_conexion drop column api_key;

-- ── 4. Funciones de lectura (solo service_role puede ejecutar) ───────────
create or replace function get_groq_key(p_workspace_id uuid)
returns text language sql security definer set search_path = public, vault as $$
  select ds.decrypted_secret
  from groq_conexion gc
  join vault.decrypted_secrets ds on ds.id = gc.api_key_secret_id
  where gc.workspace_id = p_workspace_id
$$;

create or replace function get_openrouter_key(p_workspace_id uuid)
returns text language sql security definer set search_path = public, vault as $$
  select ds.decrypted_secret
  from openrouter_conexion oc
  join vault.decrypted_secrets ds on ds.id = oc.api_key_secret_id
  where oc.workspace_id = p_workspace_id
$$;

-- ── 5. Funciones de escritura usadas por las edge functions ──────────────
create or replace function save_groq_key(p_workspace_id uuid, p_api_key text, p_user_id uuid)
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  v_existing uuid;
begin
  select api_key_secret_id into v_existing from groq_conexion where workspace_id = p_workspace_id;
  if v_existing is not null then
    perform vault.update_secret(v_existing, p_api_key);
    update groq_conexion set updated_at = now(), connected_by = p_user_id where workspace_id = p_workspace_id;
  else
    insert into groq_conexion (workspace_id, api_key_secret_id, connected_by)
    values (p_workspace_id, vault.create_secret(p_api_key, 'groq-' || p_workspace_id::text), p_user_id);
  end if;
end;
$$;

create or replace function save_openrouter_key(p_workspace_id uuid, p_api_key text, p_user_id uuid)
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  v_existing uuid;
begin
  select api_key_secret_id into v_existing from openrouter_conexion where workspace_id = p_workspace_id;
  if v_existing is not null then
    perform vault.update_secret(v_existing, p_api_key);
    update openrouter_conexion set updated_at = now(), connected_by = p_user_id where workspace_id = p_workspace_id;
  else
    insert into openrouter_conexion (workspace_id, api_key_secret_id, connected_by)
    values (p_workspace_id, vault.create_secret(p_api_key, 'openrouter-' || p_workspace_id::text), p_user_id);
  end if;
end;
$$;

-- Revocar ejecución a roles no privilegiados
revoke execute on function get_groq_key(uuid)         from public, anon, authenticated;
revoke execute on function get_openrouter_key(uuid)    from public, anon, authenticated;
revoke execute on function save_groq_key(uuid,text,uuid)      from public, anon, authenticated;
revoke execute on function save_openrouter_key(uuid,text,uuid) from public, anon, authenticated;

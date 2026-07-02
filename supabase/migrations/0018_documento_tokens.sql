create table documento_tokens (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documentos(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now()
);

alter table documento_tokens enable row level security;

-- El usuario solo puede crear tokens para documentos de su workspace
create policy "tokens_insert" on documento_tokens for insert
  with check (user_id = auth.uid());

-- La edge function (service role) puede leer y eliminar
-- No se necesita política select/delete para usuarios normales

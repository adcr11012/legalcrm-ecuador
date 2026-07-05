create table carpetas (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  nombre text not null,
  parent_id uuid references carpetas(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table carpetas enable row level security;

create policy "carpetas_workspace" on carpetas
  using (workspace_id = (select workspace_id from users where id = auth.uid()))
  with check (workspace_id = (select workspace_id from users where id = auth.uid()));

alter table documentos add column carpeta_id uuid references carpetas(id) on delete set null;

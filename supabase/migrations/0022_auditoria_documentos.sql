-- Auditoría de accesos a documentos (LOPDP)
create table if not exists auditoria_documentos (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  documento_id uuid references documentos(id) on delete set null,
  usuario_id   uuid references auth.users(id) on delete set null,
  accion       text not null, -- 'apertura' | 'lectura_ia' | 'descarga' | 'eliminacion' | 'renombrado' | 'subida'
  nombre_doc   text,          -- snapshot del nombre al momento del acceso
  caso_id      uuid references casos(id) on delete set null,
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

-- Solo administradores pueden ver el log completo
alter table auditoria_documentos enable row level security;

create policy "workspace members can insert own audits"
  on auditoria_documentos for insert
  with check (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.workspace_id = auditoria_documentos.workspace_id
    )
  );

create policy "admins can read audit log"
  on auditoria_documentos for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.workspace_id = auditoria_documentos.workspace_id
        and users.rol = 'administrador'
    )
  );

create index auditoria_documentos_workspace_idx on auditoria_documentos(workspace_id, created_at desc);
create index auditoria_documentos_documento_idx on auditoria_documentos(documento_id);

-- Auto-rellena usuario_id con el usuario autenticado
create or replace function set_auditoria_usuario()
returns trigger language plpgsql security definer as $$
begin
  if new.usuario_id is null then
    new.usuario_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger auditoria_documentos_usuario
  before insert on auditoria_documentos
  for each row execute function set_auditoria_usuario();

-- ════════════════════════════════════════════════════════════════════════
-- Tickets de soporte: cualquier usuario puede crear uno, con hilo de
-- mensajes (usuario y soporte pueden adjuntar captura de pantalla). Solo
-- el superadmin (soporte) cierra o reabre un ticket. Todo queda guardado
-- permanentemente, tanto para el usuario como para el panel de soporte.
-- ════════════════════════════════════════════════════════════════════════

create table tickets_soporte (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  creado_por uuid not null references users(id),
  categoria text not null check (categoria in ('bug', 'duda', 'sugerencia', 'facturacion', 'otro')),
  asunto text not null,
  estado text not null default 'abierto' check (estado in ('abierto', 'respondido', 'cerrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_soporte_workspace_id_idx on tickets_soporte(workspace_id);
create index tickets_soporte_creado_por_idx on tickets_soporte(creado_por);

create table ticket_mensajes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets_soporte(id) on delete cascade,
  autor_id uuid not null references users(id),
  autor_tipo text not null check (autor_tipo in ('usuario', 'soporte')),
  mensaje text not null,
  captura_url text,
  created_at timestamptz not null default now()
);
create index ticket_mensajes_ticket_id_idx on ticket_mensajes(ticket_id);

alter table tickets_soporte enable row level security;
alter table ticket_mensajes enable row level security;

-- Puede ver un ticket: quien pertenece al mismo workspace (cualquier rol),
-- o el superadmin (soporte, ve todos los workspaces).
create function can_view_ticket(p_ticket_id uuid) returns boolean as $$
  select exists (
    select 1 from tickets_soporte t
    where t.id = p_ticket_id
      and (t.workspace_id = current_workspace_id() or is_superadmin())
  )
$$ language sql stable security definer set search_path = public;

create policy tickets_soporte_select on tickets_soporte for select
  using (workspace_id = current_workspace_id() or is_superadmin());

create policy tickets_soporte_insert on tickets_soporte for insert
  with check (creado_por = auth.uid() and workspace_id = current_workspace_id());

-- Solo soporte cambia el estado (cerrar/reabrir/marcar respondido).
create policy tickets_soporte_update_soporte on tickets_soporte for update
  using (is_superadmin())
  with check (is_superadmin());

create policy ticket_mensajes_select on ticket_mensajes for select
  using (can_view_ticket(ticket_id));

-- El usuario solo puede escribir en tickets de su propio workspace y que
-- no estén cerrados; soporte puede escribir en cualquiera.
create policy ticket_mensajes_insert_usuario on ticket_mensajes for insert
  with check (
    autor_tipo = 'usuario'
    and autor_id = auth.uid()
    and exists (
      select 1 from tickets_soporte t
      where t.id = ticket_id and t.workspace_id = current_workspace_id() and t.estado <> 'cerrado'
    )
  );

create policy ticket_mensajes_insert_soporte on ticket_mensajes for insert
  with check (autor_tipo = 'soporte' and autor_id = auth.uid() and is_superadmin());

-- ════════════════════════════════════════════════════════════════════════
-- Storage: bucket privado para capturas de pantalla adjuntas a mensajes.
-- Ruta esperada: {workspace_id}/{ticket_id}/{archivo}
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('ticket-capturas', 'ticket-capturas', false)
on conflict (id) do nothing;

create policy ticket_capturas_insert on storage.objects for insert
  with check (
    bucket_id = 'ticket-capturas'
    and (is_superadmin() or (storage.foldername(name))[1] = current_workspace_id()::text)
  );

create policy ticket_capturas_select on storage.objects for select
  using (
    bucket_id = 'ticket-capturas'
    and (is_superadmin() or (storage.foldername(name))[1] = current_workspace_id()::text)
  );

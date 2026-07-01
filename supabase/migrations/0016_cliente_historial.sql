-- Historial de acciones sobre clientes (edición/eliminación de interacciones)
create table if not exists cliente_historial (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  accion text not null,
  detalle text,
  created_at timestamptz not null default now()
);

alter table cliente_historial enable row level security;

-- Solo usuarios del mismo workspace pueden ver el historial
create policy "historial_select" on cliente_historial for select
  using (
    exists (
      select 1 from clientes c
      join users u on u.workspace_id = c.workspace_id
      where c.id = cliente_historial.cliente_id
        and u.id = auth.uid()
    )
  );

-- Solo administradores pueden insertar
create policy "historial_insert" on cliente_historial for insert
  with check (
    exists (
      select 1 from users
      where id = auth.uid() and rol = 'administrador'
    )
  );

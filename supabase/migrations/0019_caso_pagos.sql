create table caso_anticipos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  fecha date not null,
  monto numeric(12,2) not null check (monto > 0),
  detalle text,
  created_at timestamptz not null default now()
);
create index caso_anticipos_caso_id_idx on caso_anticipos(caso_id);

create table caso_gastos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  fecha date not null,
  monto numeric(12,2) not null check (monto > 0),
  descripcion text not null,
  cobrable boolean not null default true,
  created_at timestamptz not null default now()
);
create index caso_gastos_caso_id_idx on caso_gastos(caso_id);

alter table caso_anticipos enable row level security;
alter table caso_gastos enable row level security;

create policy anticipos_select on caso_anticipos for select
  using (exists (select 1 from casos where casos.id = caso_anticipos.caso_id and casos.workspace_id = current_workspace_id()));
create policy anticipos_insert on caso_anticipos for insert
  with check (exists (select 1 from casos where casos.id = caso_anticipos.caso_id and casos.workspace_id = current_workspace_id()));
create policy anticipos_delete on caso_anticipos for delete
  using (exists (select 1 from casos where casos.id = caso_anticipos.caso_id and casos.workspace_id = current_workspace_id()));

create policy gastos_select on caso_gastos for select
  using (exists (select 1 from casos where casos.id = caso_gastos.caso_id and casos.workspace_id = current_workspace_id()));
create policy gastos_insert on caso_gastos for insert
  with check (exists (select 1 from casos where casos.id = caso_gastos.caso_id and casos.workspace_id = current_workspace_id()));
create policy gastos_delete on caso_gastos for delete
  using (exists (select 1 from casos where casos.id = caso_gastos.caso_id and casos.workspace_id = current_workspace_id()));

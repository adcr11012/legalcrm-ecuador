create table caso_horas (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  fecha date not null,
  descripcion text not null,
  horas numeric(8,2) not null check (horas > 0),
  valor_hora numeric(12,2) not null check (valor_hora > 0),
  created_at timestamptz not null default now()
);
create index caso_horas_caso_id_idx on caso_horas(caso_id);
alter table caso_horas enable row level security;

create policy horas_select on caso_horas for select
  using (exists (select 1 from casos where casos.id = caso_horas.caso_id and casos.workspace_id = current_workspace_id()));
create policy horas_insert on caso_horas for insert
  with check (exists (select 1 from casos where casos.id = caso_horas.caso_id and casos.workspace_id = current_workspace_id()));
create policy horas_delete on caso_horas for delete
  using (exists (select 1 from casos where casos.id = caso_horas.caso_id and casos.workspace_id = current_workspace_id()));

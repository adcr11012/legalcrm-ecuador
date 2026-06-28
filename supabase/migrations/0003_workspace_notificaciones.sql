-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Preferencias de notificación del workspace
-- ════════════════════════════════════════════════════════════════════════

alter table workspaces add column notif_email boolean not null default true;
alter table workspaces add column dias_anticipacion smallint not null default 3;

-- workspaces solo tenía policy de select; admin también debe poder actualizar.
create policy workspaces_update_admin on workspaces for update
  using (id = current_workspace_id() and is_admin());

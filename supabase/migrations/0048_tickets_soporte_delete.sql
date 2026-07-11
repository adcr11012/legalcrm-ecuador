-- ════════════════════════════════════════════════════════════════════════
-- Permite que el superadmin (soporte) elimine tickets. Los mensajes del
-- ticket se borran en cascada (ya definido en ticket_mensajes.ticket_id).
-- ════════════════════════════════════════════════════════════════════════

create policy tickets_soporte_delete_soporte on tickets_soporte for delete
  using (is_superadmin());

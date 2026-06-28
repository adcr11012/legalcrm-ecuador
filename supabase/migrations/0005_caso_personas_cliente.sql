-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Vínculo entre caso_personas y clientes (un cliente, N casos)
-- ════════════════════════════════════════════════════════════════════════

alter table caso_personas add column cliente_id uuid references clientes(id) on delete set null;
create index caso_personas_cliente_id_idx on caso_personas(cliente_id);

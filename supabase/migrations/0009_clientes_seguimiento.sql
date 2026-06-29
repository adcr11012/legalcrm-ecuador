-- ════════════════════════════════════════════════════════════════════════
-- Mini-CRM de clientes: origen y próximo seguimiento.
-- ════════════════════════════════════════════════════════════════════════

alter table clientes add column origen text;
alter table clientes add column proximo_seguimiento date;

create index clientes_proximo_seguimiento_idx on clientes(proximo_seguimiento) where proximo_seguimiento is not null;

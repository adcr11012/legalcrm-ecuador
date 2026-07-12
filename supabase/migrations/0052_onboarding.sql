-- ════════════════════════════════════════════════════════════════════════
-- Flag de bienvenida guiada (onboarding) por usuario. Se agrega con
-- default true para que los usuarios ya existentes no la vean, y luego
-- se cambia el default a false para que los usuarios nuevos sí la vean
-- al primer login.
-- ════════════════════════════════════════════════════════════════════════

alter table users add column onboarding_completado boolean not null default true;
alter table users alter column onboarding_completado set default false;

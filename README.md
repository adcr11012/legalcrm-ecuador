# LegalCRM Ecuador

SaaS de gestión de casos legales para el mercado ecuatoriano. Ver especificaciones completas en [_docs/legalcrm_specs_fase1.md](_docs/legalcrm_specs_fase1.md) y el mockup de referencia en [_docs/legalcrm_demo.html](_docs/legalcrm_demo.html).

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS)
- React Router
- Tabler Icons

## Setup

```bash
npm install
cp .env.example .env.local   # completar con credenciales de Supabase
npm run dev
```

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — typecheck + build de producción
- `npm run preview` — preview del build
- `npm run lint` — oxlint

## Estructura

```
src/
  lib/        clientes de servicios externos (supabase.ts)
  types/      tipos compartidos (database.ts: modelo de datos)
  routes/     páginas por ruta
  features/   lógica de dominio agrupada por feature (casos, clientes, agenda, ...)
  components/ componentes UI compartidos
```

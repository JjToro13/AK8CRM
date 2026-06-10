# AK8CRM

CRM operativo multi-tenant para equipos de llamadas, seguimiento comercial, campañas, agentes, agenda y gestión operativa por tenant/operación.

Estado actual del repo:
- desarrollo activo
- refactorización avanzada
- frontend modularizado por dominio
- endurecimiento final de backend/RLS todavía en progreso

Versión visible en footer:
- `2.0.31-FIX`

## Qué hay en este repo

Frontend:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Radix UI Select
- Framer Motion
- Lucide React
- XLSX
- Sileo

Backend / datos:
- Supabase
- PostgreSQL
- Supabase Auth
- RPCs SQL
- PL/pgSQL
- Row Level Security

Package manager:
- `npm`

## Estado funcional

Ya resuelto:
- selección de tenant/operación para roles altos
- branding por tenant desde `tenant_settings`
- dashboard operativo
- clientes con filtros, búsqueda, paginación y acciones rápidas
- campañas con importación, exportación y gestión
- agentes con asignaciones y vista operativa
- calendario comercial
- módulo DID
- historial de llamadas
- capa de resiliencia/degradación frontend

Pendiente o en hardening:
- cierre final de aislamiento backend en `clients`, `agents` y `campaigns`
- auditoría final de RLS y funciones sensibles
- validación completa de entorno productivo
- limpieza adicional de documentación y código legado residual

## Estructura principal

```text
src/
  config/
  hooks/
  integrations/
  lib/
  modules/
    admin/
    agents/
    assignments/
    auth/
    calendar/
    calls/
    campaigns/
    clients/
    comments/
    dashboard/
    did/
    emails/
  shared/
supabase/
  functions/
  migrations/
  _manual_sql/
scripts/
docs/
.ai/
AGENTS.md
```

Criterio actual:
- la lógica de dominio debe vivir en `modules/[domain]/services`, `hooks`, `types`
- el layout y piezas reutilizables viven en `src/shared`
- la integración de Supabase cliente vive en `src/integrations/supabase`

## Requisitos

- Node.js 20+ recomendado
- npm 10+ recomendado
- proyecto Supabase accesible

## Instalación

```bash
npm install
```

## Variables de entorno

Basarse en `env.example`.

Variables principales de frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ENABLE_CALLS=false
VITE_MAINT_BYPASS=false
VITE_ENCRYPTION_KEY=
```

Variables usadas fuera del frontend / Edge Functions:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DID_GLO_BAL_ACCESS_TOKEN=
DID_GLO_BAL_WEBHOOK_URL=
DID_GLO_BAL_API_URL=
DID_GLO_BAL_CALLS_URL=
DID_GLO_BAL_COMMON_URL=
```

Notas importantes:
- no colocar secretos reales en variables `VITE_*`
- `VITE_ENABLE_CALLS` permite apagar features de llamadas en UI
- `VITE_MAINT_BYPASS` se usa para bypass de maintenance en desarrollo
- `VITE_ENCRYPTION_KEY` no debe tratarse como secreto backend

## Cómo iniciar el proyecto

Desarrollo:

```bash
npm run dev
```

Build de producción:

```bash
npm run build
```

Preview local del build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Chequeo de tipos:

```bash
npm exec -- tsc --noEmit
```

Script operativo disponible:

```bash
npm run sync:auth-emails
```

## Flujo recomendado para levantarlo por primera vez

1. Crear `.env` local a partir de `env.example`.
2. Confirmar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Ejecutar `npm install`.
4. Ejecutar `npm run dev`.
5. Validar login y carga de módulos básicos.

## Supabase

Ubicaciones relevantes:
- `supabase/migrations/`
- `supabase/functions/`
- `supabase/_manual_sql/`

Comandos útiles si trabajas con Supabase local:

```bash
supabase start
supabase status
supabase stop
```

Cambios recientes relevantes del repo:
- base multi-tenant/operación ya aterrizada
- funciones y políticas endurecidas en varias rutas críticas
- importación y gestión de campañas ampliadas
- módulos de clientes/agentes/dashboard ya separados por dominio

Riesgo conocido:
- no asumir que todo el aislamiento ya está resuelto únicamente por backend; todavía hay hardening pendiente

## Módulos principales

`auth`
- login y bootstrap de sesión

`dashboard`
- selección de tenant/operación
- branding activo
- búsqueda rápida y llamadas recientes

`clients`
- tabla principal de cartera
- filtros, búsqueda, paginación
- comentarios, edición, asignación, email y agenda

`campaigns`
- gestión de campañas
- importación de bases
- reportes y operaciones masivas

`agents`
- administración operativa de agentes
- asignación de clientes

`calendar`
- agenda y seguimientos comerciales

`calls`
- historial de llamadas

`did`
- configuración de extensiones / centralita

`admin`
- operación visible, privacidad y controles administrativos

## Documentación útil

Documentos actuales en `docs/`:
- `docs/estado-proyecto-2026-05-08.md`
- `docs/backlog-operativo-cambios-crm-2026-04-16.md`
- `docs/gate-0-diagnostico-2026-04-16.md`
- `docs/optimization-implementation-summary-2026-04-15.md`
- `docs/paso-a-paso-cambios-crm-2026-04-16.md`
- `docs/performance-hardening-2026-04-14.md`
- `docs/production-optimization-roadmap-2026-04-14.md`

También revisar antes de tocar código:
- `AGENTS.md`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/TODO.md`

## Reglas operativas para desarrollo

- no modificar `.env`, `.env.local`, `.env.production` del equipo
- no tocar `dist/`
- no debilitar RLS para “resolver” problemas de frontend
- no asumir acceso cross-tenant ni cross-operation
- toda query operativa debe respetar `tenant_id` y/o `operation_id`
- después de cambios frontend correr `npm run build`
- después de cambios SQL explicar impacto en RLS, RPCs, índices y migraciones

## Troubleshooting rápido

Si la app levanta pero carga raro:
- verificar variables `VITE_*`
- verificar sesión y operación activa
- verificar que Supabase responde
- abrir consola y red del navegador

Si clientes/agentes/campañas “muestran menos de lo esperado”:
- confirmar operación activa
- confirmar rol del usuario
- confirmar RLS y datos del tenant correcto

Si el sistema se siente lento en un entorno y en otro no:
- medir latencia de red y requests a Supabase
- revisar región del host / oficina / VPN
- revisar DevTools Network antes de asumir problema del frontend

## Para un dev que entra hoy

Orden recomendado para entender el proyecto:
1. `AGENTS.md`
2. `.ai/PROJECT_CONTEXT.md`
3. `.ai/TODO.md`
4. `src/App.tsx`
5. `src/hooks/useAuth.ts`
6. `src/modules/dashboard/`
7. `src/modules/clients/`
8. `src/modules/campaigns/`
9. `supabase/migrations/`

## Estado de release

El repo está apto para desarrollo activo y corre en local, pero no debe asumirse “backend completamente cerrado” solo por el estado del frontend. Si vas a tocar producción o migraciones sensibles, separa frontend, SQL y documentación en cambios revisables.

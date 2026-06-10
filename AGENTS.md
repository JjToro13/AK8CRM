cat > AGENTS.md <<'EOF'
# AGENTS.md — AK8CRM

## Proyecto

AK8CRM es un CRM operativo especializado en gestión de equipos de llamadas, seguimiento comercial de clientes, campañas de contacto, agentes, asignaciones, calendario y aislamiento funcional por tenant/operación.

El proyecto está en fase de refactorización avanzada y es apto para desarrollo activo.

## Stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Radix UI
- Framer Motion
- Lucide React
- XLSX
- Sileo

Backend:
- Supabase
- PostgreSQL
- Supabase Auth
- RPCs SQL
- PL/pgSQL
- Row Level Security

Package manager:
- npm
- No migrar a pnpm/yarn sin aprobación.

## Reglas generales para agentes

- Leer este archivo antes de tocar código.
- Leer `.ai/PROJECT_CONTEXT.md` y `.ai/TODO.md` antes de proponer cambios.
- No modificar `.env`, `.env.local`, `.env.production` ni secretos reales.
- No colocar secretos en variables `VITE_*`.
- No debilitar RLS para resolver errores de frontend.
- No modificar migraciones críticas sin plan y confirmación.
- No tocar producción sin autorización explícita.
- No modificar `dist/`.
- Mantener cambios pequeños y revisables.
- Trabajar por ramas.
- Separar cambios de frontend, Supabase y documentación cuando sea posible.
- Después de cambios frontend correr `npm run build`.
- Después de cambios SQL/Supabase explicar impacto en RLS, RPCs, indexes y migraciones.
- No asumir acceso cross-tenant ni cross-operation.
- Toda query de datos operativos debe respetar `tenant_id` y/o `operation_id` según corresponda.
- Respetar flags como `VITE_ENABLE_CALLS` y `VITE_MAINT_BYPASS`.

## Prioridades de seguridad

1. Garantizar aislamiento real por tenant y operación.
2. Completar RLS/funciones seguras para `clients`, `agents` y `campaigns`.
3. Validar backend antes de confiar en filtros del frontend.
4. No crear accesos directos por email hardcodeado.
5. No exponer datos de operaciones no visibles para el usuario.

## Prioridades funcionales

1. B1-02: Anexar clientes a campaña existente.
2. Validar despliegue en producción.
3. Exponer movimiento entre campañas.
4. Filtros avanzados compartidos.
5. Mejoras de vista de clientes.
6. Alertas y notificaciones.
7. Reportes y analytics.

## Arquitectura esperada

src/
- config/
- hooks/
- integrations/supabase/
- lib/
- modules/
- shared/

Módulos principales:
- auth
- dashboard
- clients
- calls
- campaigns
- agents
- calendar
- comments
- assignments
- did
- emails

Cada módulo debe tender a:

modules/[module]/
- components/
- hooks/
- services/
- pages/
- types/

## Supabase

Ubicación:
- `supabase/migrations/`
- `supabase/functions/`
- `supabase/_manual_sql/`

Reglas:
- Las funciones sensibles deben validar rol, tenant y operación.
- Las RPCs deben usar `SECURITY DEFINER` solo cuando sea necesario y con `search_path` seguro.
- Validar permisos antes de operaciones destructivas.
- No agregar `select("*")` en rutas calientes sin justificación.
- Evitar queries pesadas sin paginación.

## Performance y resiliencia

El proyecto ya implementa:
- Debounce en búsquedas.
- Paginación.
- Pausa de lecturas pesadas bajo presión.
- Timeout de requests.
- Modo degradado ante errores consecutivos.
- Recuperación automática.

Los agentes deben preservar este modelo y no reintroducir polling agresivo ni cargas globales innecesarias.

## Comandos

Instalar:
`npm install`

Desarrollo:
`npm run dev`

Lint:
`npm run lint`

Tipos:
`npm exec -- tsc --noEmit`

Build:
`npm run build`

Preview:
`npm run preview`

Supabase:
`supabase start`
`supabase status`
`supabase stop`

Docker:
`docker compose build`
`docker compose up`
`docker compose down`

## Flujo obligatorio antes de cambios grandes

1. Inspeccionar archivos relevantes.
2. Identificar riesgos.
3. Proponer plan.
4. Esperar aprobación.
5. Aplicar cambios pequeños.
6. Ejecutar pruebas/build.
7. Resumir archivos modificados.
8. Indicar riesgos pendientes.
EOF
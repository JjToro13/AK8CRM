# Call Master CRM

CRM operativo para equipos de llamadas, seguimiento comercial y gestion de clientes sobre Supabase.

El proyecto esta en una fase de refactorizacion avanzada:
- frontend modularizado por dominio
- branding por tenant
- seleccion de tenant/operacion para `dev` y `super_admin`
- aislamiento funcional parcial por tenant/operacion en dashboard, campañas, agentes, clientes y llamadas
- endurecimiento final de base de datos pendiente como siguiente release

## Estado actual

Lo que ya esta resuelto:
- arquitectura modular por dominios (`auth`, `dashboard`, `clients`, `calls`, `campaigns`, `agents`, `did`)
- layout compartido (`PageHeader`, `AppFooter`, `ModalLayout`, primitives de formulario)
- branding real por tenant desde `tenant_settings`
- operaciones visibles por tenant via RPCs de Supabase
- sincronizacion de tenant -> operacion activa -> branding -> dashboard sin recargar
- gestion de campañas, agentes, clientes y llamadas ajustada al scope de la operacion activa

Lo que todavia no esta cerrado:
- endurecimiento final en Supabase para que el aislamiento no dependa solo del frontend
- RLS/funciones seguras para `clients`, `agents` y `campaigns`
- limpieza de codigo legado residual y docs tecnicas menores

## Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix Select
- Framer Motion
- React Router

### Backend
- Supabase
- PostgreSQL
- Supabase Auth
- RPCs y funciones SQL

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

Para validacion de tipos en Windows/PowerShell, usar:

```bash
cmd /c npm exec -- tsc --noEmit
```

## Variables de entorno

El frontend usa estas variables desde `src/config/env.ts`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

VITE_ENABLE_CALLS=false
VITE_MAINT_BYPASS=false

VITE_ENCRYPTION_KEY=
```

Notas:
- `VITE_MAINT_BYPASS` solo aplica en desarrollo.
- `VITE_ENABLE_CALLS` permite apagar features de llamadas a nivel de UI.
- No coloques secretos reales en variables `VITE_*`; Vite las expone al navegador.
- `VITE_ENCRYPTION_KEY`, si se usa, debe considerarse un valor publico del cliente y no una clave secreta de backend.

## Arquitectura

Estructura principal:

```text
src/
  components/                # wrappers legacy y modales compartidos
  hooks/                     # hooks globales como useAuth
  modules/
    auth/
    dashboard/
    clients/
    calls/
    campaigns/
    agents/
    did/
  shared/
    branding/
    components/layout/
    types/
```

Criterio actual:
- cada modulo mantiene `services`, `hooks`, `components` y `pages`
- los archivos legacy en `src/components` existen solo como wrappers de compatibilidad donde todavia hace falta
- la logica operativa debe vivir en hooks y services, no en componentes grandes

## Multi-tenant y branding

### Modelo actual

- `tenant`: empresa cliente
- `operation`: unidad operativa dentro de un tenant
- branding: configuracion visual del tenant

Tablas nuevas ya aplicadas en Supabase:
- `public.tenants`
- `public.tenant_settings`
- `public.operations.tenant_id`

Branding actual:
- se resuelve desde `tenant_settings`
- usa `brand_preset_id` + overrides de `product_name`, `platform_label` y `extra.defaultFooterNote`
- existe fallback local por slug de operacion en `src/shared/branding/tenant-branding.ts`

Presets disponibles:
- `call-master`
- `atlas-finance`
- `cobalt-ops`

### Comportamiento actual

- `agent` y `admin` trabajan dentro de su scope operativo
- `dev` y `super_admin` pueden cambiar tenant y operacion desde el dashboard
- al cambiar tenant:
  - se recalcula la operacion visible
  - se sincroniza `active_operation`
  - cambia el branding
  - dashboard, campañas, agentes y clientes se re-scopean sin recargar

### Limite conocido

El aislamiento funcional ya existe en frontend para los modulos principales, pero el endurecimiento definitivo de DB todavia no esta aplicado. Ese trabajo se dejara para un release separado por seguridad operativa.

## Supabase

### Migraciones relevantes ya aplicadas

Las bases de tenant y branding ya existen en produccion. Entre las migraciones importantes de esta fase estan:
- tenant foundation
- read policies de branding
- funciones de tenant scope:
  - `get_visible_tenants()`
  - `get_visible_operations(p_tenant_id uuid default null)`

### Modo mantenimiento

La app soporta maintenance mode via `public.app_settings` y `MaintenanceGate`.

Scripts manuales:
- `supabase/_manual_sql/enable_maintenance_mode.sql`
- `supabase/_manual_sql/disable_maintenance_mode.sql`

### Backups y rollout

Antes de tocar esquema en produccion, revisar:
- `documentacion/production-backup-and-maintenance-plan.md`
- `documentacion/supabase-tenant-branch-plan.md`

## Modulos principales

### Dashboard
- branding por tenant
- seleccion de tenant/operacion para roles altos
- busqueda de clientes por operacion activa
- llamadas recientes
- acciones rapidas

### Clients
- pagina modularizada
- tabla, filtros y paginacion desacoplados
- mutaciones sensibles ya scopiadas por `operation_id`

### Calls
- historial separado como modulo
- filtros y panel de detalle propios
- llamadas recientes e historial filtrados por la operacion activa en frontend

### Campaigns
- gestion de campañas por operacion activa
- importacion, exportacion, rename, lock/unlock y borrado ajustados al scope actual

### Agents
- vista y campañas disponibles limitadas al tenant operativo visible
- asignaciones y detalles modulados en componentes propios

### DID
- configuracion separada en modulo propio

## Documentacion interna

Documentos utiles en `documentacion/`:
- [saas-refactor-roadmap](./documentacion/saas-refactor-roadmap.md)
- [tenant-isolation-rollout-plan](./documentacion/tenant-isolation-rollout-plan.md)
- [tenant-branding-validation](./documentacion/tenant-branding-validation.md)
- [production-backup-and-maintenance-plan](./documentacion/production-backup-and-maintenance-plan.md)
- [register-cleanup-audit](./documentacion/register-cleanup-audit.md)
- [clients-module-next-steps](./documentacion/clients-module-next-steps.md)

## Flujo recomendado de trabajo

### Frontend
1. desarrollar en modulo correspondiente
2. validar `tsc --noEmit`
3. probar con roles reales (`agent`, `admin`, `super_admin`, `dev`)
4. no mezclar cambios de UX con endurecimiento de DB en el mismo release

### Base de datos
1. backup
2. maintenance mode si el cambio es estructural
3. aplicar migracion
4. smoke test con usuarios reales
5. reabrir operacion

## Despliegue parcial recomendado

El estado actual permite un release parcial del frontend sin meter aun el endurecimiento final de Supabase.

Checklist minimo antes de deploy:
- login por rol
- branding correcto por tenant
- cambio tenant/operacion sin recarga
- dashboard search
- campañas
- agentes
- clientes
- consola sin errores rojos

## Pendiente inmediato

Siguiente bloque tecnico recomendado:
1. endurecer `clients` en Supabase
2. endurecer `agents`
3. endurecer `campaigns`
4. despues aplicar RLS/funciones mas estrictas

La razon de ese orden es operativa: `clients` es el flujo mas sensible, y conviene aislarlo con cambios mas controlados antes de endurecer todo el sistema a la vez.

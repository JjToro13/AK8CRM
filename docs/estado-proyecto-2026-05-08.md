# Estado del Proyecto AK8CRM - Mayo 2026

**Fecha:** 8 de mayo de 2026  
**Versión:** 0.0.0  
**Estado:** En fase de refactorización avanzada, apto para desarrollo

---

## 📋 Tabla de contenidos

1. [Descripción general](#descripción-general)
2. [Estado actual](#estado-actual)
3. [Stack tecnológico](#stack-tecnológico)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Alcance funcional](#alcance-funcional)
6. [Capacidad técnica](#capacidad-técnica)
7. [Migraciones críticas](#migraciones-críticas)
8. [Hallazgos y decisiones](#hallazgos-y-decisiones)
9. [Optimizaciones implementadas](#optimizaciones-implementadas)
10. [Prioridades de desarrollo](#prioridades-de-desarrollo)
11. [Configuración](#configuración)
12. [Comandos y scripts](#comandos-y-scripts)

---

## Descripción general

**AK8CRM** es un CRM operativo especializado en:
- Gestion de equipos de llamadas
- Seguimiento comercial de clientes
- Administración de campañas de contacto
- Gestión de agentes y asignaciones
- Calendario y programación de llamadas
- Aislamiento funcional por tenant y operación

Construido sobre **Supabase** (PostgreSQL) con frontend moderno en **React + TypeScript + Vite**.

---

## Estado actual

### ✅ Ya resuelto

- **Arquitectura modular por dominios** (`auth`, `dashboard`, `clients`, `calls`, `campaigns`, `agents`, `did`)
- **Layout compartido** con componentes reutilizables (`PageHeader`, `AppFooter`, `ModalLayout`, primitivas de formulario)
- **Branding real por tenant** desde tabla `tenant_settings`
- **Visibilidad de operaciones** por tenant mediante RPCs de Supabase
- **Sincronización dinámica** tenant → operación activa → branding → dashboard (sin recargas)
- **Gestión de recursos** (campañas, agentes, clientes, llamadas) con scope de operación activa
- **Importación de clientes** con detección de duplicados (en archivo y en BD)
- **Historial de comentarios** en clientes con paginación
- **Agenda comercial** con tabla `scheduled_calls` y soporte de zonas horarias
- **Optimizaciones de base de datos** con índices en rutas calientes
- **Capa de resilencia** para degradación elegante ante saturación de BD

### 🔄 Parcialmente cubierto

- **Aislamiento funcional por tenant/operación** en dashboard, campañas, agentes, clientes y llamadas (frontend sí, backend parcialmente)
- **Funciones seguras** en RLS (algunos módulos completos, otros en progreso)

### ❌ Pendiente

- **Endurecimiento final de base de datos** para garantizar aislamiento sin depender del frontend
- **RLS/funciones seguras** completas para `clients`, `agents` y `campaigns`
- **Anexación de clientes** a campaña existente durante importación
- **Limpieza de código legado** residual y documentación técnica menor
- **Despliegue en producción** con validación de cambios

---

## Stack tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| React | 18.2.0 | Framework principal |
| TypeScript | 5.2.2 | Tipado estático |
| Vite | 4.5.0 | Bundler y dev server |
| Tailwind CSS | 3.3.5 | Estilos utilitarios |
| React Router | 6.20.1 | Enrutamiento |
| Radix UI Select | 2.2.6 | Componentes accesibles |
| Framer Motion | 12.35.0 | Animaciones |
| Lucide React | 0.294.0 | Iconografía |
| XLSX | 0.18.5 | Importación de Excel |
| Sileo | 0.1.5 | Sistema de notificaciones |

**Herramientas de desarrollo:**
- ESLint + TypeScript Plugin para linting
- Prettier para formato
- PostCSS + Autoprefixer para procesamiento CSS

### Backend

| Tecnología | Propósito |
|-----------|----------|
| Supabase | Plataforma completa (Auth, DB, APIs) |
| PostgreSQL | Base de datos relacional |
| Supabase Auth | Gestión de usuarios y sesiones |
| RPCs SQL | Lógica de negocio segura |
| Funciones PL/pgSQL | Triggers y automatización |
| RLS (Row Level Security) | Control de acceso a nivel de fila |

---

## Estructura del proyecto

```
src/
├── App.tsx                          # Componente raíz
├── main.tsx                         # Punto de entrada
├── index.css                        # Estilos globales
├── vite-env.d.ts                    # Tipos de Vite
│
├── config/
│   └── env.ts                       # Configuración de variables de entorno
│
├── hooks/
│   └── useAuth.ts                   # Hook global de autenticación
│
├── integrations/
│   └── supabase/
│       └── client.ts                # Cliente Supabase configurado
│
├── lib/
│   ├── encryption.ts                # Utilidades de cifrado
│   ├── maintenance.ts               # Lógica de modo mantenimiento
│   ├── supabase.ts                  # Helpers de BD
│   └── utils.ts                     # Utilidades generales
│
├── modules/                         # Módulos por dominio
│   ├── agents/                      # Gestión de agentes
│   ├── assignments/                 # Asignaciones
│   ├── auth/                        # Autenticación y login
│   ├── calendar/                    # Calendario y citas
│   ├── calls/                       # Historial y gestión de llamadas
│   ├── campaigns/                   # Campañas de contacto
│   ├── clients/                     # Gestión de clientes
│   ├── comments/                    # Comentarios y notas
│   ├── dashboard/                   # Inicio y vista general
│   ├── did/                         # Gestión de números DID
│   └── emails/                      # Gestión de emails
│
└── shared/                          # Código compartido
    ├── branding/                    # Componentes de branding por tenant
    ├── components/                  # Componentes genéricos
    │   ├── forms/                   # Primitivas de formulario
    │   └── layout/                  # Layouts compartidos
    ├── config/                      # Configuraciones compartidas
    ├── constants/                   # Constantes globales
    ├── lib/                         # Librerías compartidas
    ├── resilience/                  # Sistema de resilencia y degradación
    ├── services/                    # Servicios (búsqueda, sincronización)
    └── types/                       # Tipos TypeScript globales
```

**Archivos raíz:**
- `vite.config.ts` - Configuración de bundling con code splitting manual
- `tsconfig.json` - Configuración de TypeScript
- `tailwind.config.js` - Temas y extensiones de Tailwind
- `postcss.config.js` - Procesamiento de CSS
- `.env.example` - Plantilla de variables de entorno
- `package.json` - Dependencias y scripts

**Carpetas adicionales:**
- `docs/` - Documentación técnica
- `public/` - Activos estáticos
- `scripts/` - Scripts de utilidad (ej. sincronización de emails)
- `supabase/` - Migraciones, funciones y respaldos de BD

---

## Alcance funcional

### Módulos principales

#### 🔐 Auth (Autenticación)

- Login con email/contraseña
- Gestión de sesión con Supabase Auth
- Cambio de contraseña
- Reseteo seguro de contraseña
- Integración con `AuthProvider` centralizado

#### 📊 Dashboard

- Vista general de operación actual
- Resumen de métricas (campañas, agentes, clientes, llamadas)
- Sincronización dinámica sin recargar
- Selector de tenant/operación para `dev` y `super_admin`
- Visibilidad condicionada por rol

#### 👥 Clientes

- Búsqueda de clientes (desde 2+ caracteres con debounce)
- Importación de clientes desde Excel (con detección de duplicados)
- Edición de datos del cliente (nombre, email, teléfono, país)
- Campos adicionales: `status_code`, `user_balance`, `last_comment`, `last_comment_at`
- Asignación a campañas
- Historial de comentarios con paginación
- Detalle completo del cliente con contexto comercial

#### 📢 Campañas

- Creación y edición de campañas
- Movimiento de clientes entre campañas
- Cambio de estado masivo de clientes en campaña
- Visibilidad y control por operación
- Relación con agentes asignados

#### 📞 Agentes

- Listado de agentes activos
- Asignación de clientes
- Historial de llamadas por agente
- Cartera de clientes asignada
- Estadísticas por agente (llamadas, duración, conversiones)

#### 📅 Calendario

- Programación de llamadas (`scheduled_calls`)
- Soporte de zonas horarias
- Estados: planeado, completado, cancelado, pospuesto
- Contexto completo: cliente, campaña, agente, operación
- Reagendamiento
- Seguimiento de llamadas programadas

#### 📞 Historial de llamadas

- Registro de todas las llamadas realizadas
- Filtro por agente, cliente, operación
- Duración, fecha/hora, estado
- Integración con calendario

#### 💬 Comentarios

- Notas por cliente
- Historial completo con timestamps
- Paginación para no cargar todo en memoria
- Asociación a usuario y tenant

#### 📲 DID (Números telefónicos)

- Gestión de números DID
- Asociación a operaciones y agentes
- Control de capacidad

---

## Capacidad técnica

### Base de datos

**Tablas principales:**
- `users` - Usuarios del sistema
- `organizations` - Tenants/organizaciones
- `operations` - Operaciones dentro de una organización
- `tenant_settings` - Branding y configuración por tenant
- `clients` - Cartera de clientes (con `phone_number`, `email`, `country`, `user_balance`, `status_code`)
- `campaigns` - Campañas de contacto
- `agents` - Agentes del CRM
- `calls` - Historial de llamadas
- `client_comments` - Notas/comentarios por cliente
- `scheduled_calls` - Agenda de citas programadas
- `did` - Números telefónicos disponibles

**Capacidades de datos:**
- Soporte multilenguaje con columnas `locale`
- Timestamps automáticos (`created_at`, `updated_at`)
- Soft deletes mediante columnas `deleted_at`
- Auditoría a través de triggers
- Índices optimizados para búsquedas rápidas

### Funciones y RPCs

**Disponibles:**
- `public.import_clients_v1()` - Importar clientes con detección de duplicados
- `public.move_clients_to_campaign()` - Mover clientes entre campañas
- `public.move_campaign_clients_by_status()` - Cambiar estado masivo de clientes
- Funciones para sincronización de contexto en `scheduled_calls`
- Funciones de búsqueda y filtrado

**Pendientes:**
- RPC mejorada para importar hacia campaña existente
- Funciones de seguridad completas para validación en backend

### Seguridad

**Implementado:**
- RLS (Row Level Security) en tablas principales
- Validación de tenant en políticas
- Validación de operación en acceso a datos
- Restricción de ejecución de funciones sensibles

**Pendiente:**
- Hardening final para garantizar que el aislamiento no dependa solo del frontend
- Auditoría completa de permisos

---

## Migraciones críticas

**Aplicadas localmente (requiere validar en producción):**

| Archivo | Descripción |
|---------|------------|
| `20260223190846_remote_schema.sql` | Schema inicial remoto |
| `20260316160000_allow_cp_in_clients_status_code.sql` | Soporte para código de estado CP en clientes |
| `20260317123000_tenant_foundation.sql` | Fundación multitenancy |
| `20260318140000_tenant_branding_read_policies.sql` | Políticas de lectura de branding |
| `20260318153000_tenant_scope_functions.sql` | Funciones con scope de tenant |
| `20260322113000_clients_hardening_phase1.sql` | Endurecimiento RLS en clientes (Fase 1) |
| `20260322121500_revoke_public_execute_sensitive_functions.sql` | Revoke de funciones públicas sensibles |
| `20260322133000_operations_rls_and_function_search_path_hardening.sql` | RLS en operaciones y path búsqueda |
| `20260322143000_agents_hardening_phase1.sql` | Endurecimiento RLS en agentes (Fase 1) |
| `20260322150000_campaigns_hardening_phase1.sql` | Endurecimiento RLS en campañas (Fase 1) |
| `20260322173000_campaign_identity_phase1.sql` | Identidad de campaña (Fase 1) |
| `20260322181500_campaign_identity_phase2.sql` | Identidad de campaña (Fase 2) |
| `20260323110000_calendar_module_foundation.sql` | Fundación del módulo calendario |
| `20260324131500_scheduled_calls_timezone_support.sql` | Soporte de zonas horarias en citas |
| `20260327170000_role_model_owner_manager_loader.sql` | Modelo de roles (owner, manager, loader) |
| `20260328113000_delete_managed_agents.sql` | Eliminación segura de agentes gestionados |
| `20260328153000_replace_import_clients_edge_with_rpc.sql` | RPC de importación de clientes |
| `20260406123000_fix_campaigns_primary_key.sql` | Corrección de clave primaria en campañas |
| `20260406124500_fix_import_clients_serial_generation.sql` | Corrección de generación serial en importación |
| `20260406130000_scope_client_identity_uniqueness_by_operation.sql` | Unicidad de email/teléfono por operación |

**Observación:** Estas migraciones están en el repo pero deben validarse en el ambiente productivo.

---

## Hallazgos y decisiones

### Hallazgo 1: Importación incompleta

**Situación:** La RPC `public.import_clients_v1` funciona pero tiene limitación operativa.

**Capacidad actual:**
- ✅ Crea campaña nueva automáticamente
- ✅ Genera prefijo de cliente por operación
- ✅ Detecta duplicados en archivo
- ✅ Detecta duplicados existentes en operación
- ✅ Devuelve resumen de errores

**Limitación:**
- ❌ No permite importar hacia campaña **existente**

**Impacto:** Los usuarios deben crear campaña nueva cada vez o anexar manualmente después.

**Decisión:** Ajustar RPC o crear nueva para anexar a campaña existente (Prioridad: B1-02).

---

### Hallazgo 2: Movimiento de clientes ya existe

**Situación:** Backend ya tiene funciones para repartir clientes entre campañas.

**Disponible:**
- `public.move_clients_to_campaign` - Mover a una campaña específica
- `public.move_campaign_clients_by_status` - Cambiar estado masivo

**Impacto:** Frontend puede exponer estas funciones sin necesidad de cambio en backend.

**Decisión:** Priorizar exposición en UI antes de nueva RPC de importación.

---

### Hallazgo 3: Calendario ya soporta zonas horarias

**Situación:** Tabla `scheduled_calls` está completa.

**Capacidades:**
- Operación, tenant, cliente, campaña, agente
- Estados: planeado, completado, cancelado, pospuesto
- Soporte de zonas horarias (`timezone` column)
- Índices y triggers de sincronización
- RLS funcional

**Impacto:** No se necesita migración inicial para mejoras de calendario.

**Decisión:** Costo para mejoras es principalmente frontend.

---

### Hallazgo 4: Unicidad de cliente por operación

**Situación:** Migración `20260406130000` cambió modelo de unicidad.

**Cambio:**
- **Antes:** Email/teléfono único en toda la BD
- **Ahora:** Email/teléfono único por operación

**Impacto:** Permite múltiples operaciones sin conflictos de identidad.

**Decisión:** Crítico para importaciones correctas en multioperación.

---

## Optimizaciones implementadas

### 1. Reducción de carga desde frontend

**Eliminadas:**
- Polling continuo en vistas sensibles
- Duplicación de estado de sesión en `AuthProvider`
- Precarga global de comentarios
- Selects genéricos `select("*")`

**Implementadas:**
- Refresco por foco o visibilidad
- Búsqueda con debounce (desde 2+ caracteres)
- Paginación en comentarios y modales
- Selects de columnas específicas (mínimas)
- Heartbeat de presencia pausado en background

### 2. Índices agregados a base de datos

**Creados:**
- `idx_calls_agent_id` - Historial por agente
- `idx_calls_agent_start_time` - Llamadas ordenadas por agente y fecha
- `idx_calls_client_id` - Historial por cliente
- `idx_calls_operation_start_time` - Llamadas por operación y fecha
- `idx_clients_assigned_operation_created` - Clientes por operación y fecha
- `idx_clients_email_trgm` - Búsqueda texual en email
- `idx_clients_first_name_trgm` - Búsqueda texual en nombre
- `idx_clients_last_name_trgm` - Búsqueda texual en apellido
- `idx_clients_serial_trgm` - Búsqueda en ID de cliente
- `idx_clients_source_trgm` - Búsqueda en origen

**Beneficio:** Todas las queries calientes aceleradas significativamente.

### 3. Capa de resilencia y degradación

**Implementado:**
- Timeout configurable para requests
- Detección automática de errores (408, 429, 5xx)
- Modo degradado después de fallos consecutivos
- Recuperación automática al detectar respuestas sanas
- Pausa de lecturas pesadas en presión
- Banner informativo de estado
- Debugger de desarrollo para simular fallos

**Beneficio:** La app sigue usable en modo reducido, evita efecto cascada.

---

## Prioridades de desarrollo

### 🔥 Inmediato (Semana 1-2)

1. **B1-02: Anexar clientes a campaña existente**
   - Ajustar RPC `import_clients_v1` o crear `import_clients_v2`
   - Permitir seleccionar campaña destino en UI
   - Mantener opción de crear campaña nueva
   - Reutilizar reporte de duplicados

2. **Validar despliegue en producción**
   - Confirmar que todas las migraciones estén aplicadas
   - Validar índices SQL presentes
   - Smoke test: login, dashboard, clientes, agentes, llamadas

### 📊 Corto plazo (Semana 3-4)

3. **Exponer movimiento entre campañas**
   - UI para mover cliente/s entre campañas
   - Cambio de estado masivo (ya existe RPC)

4. **Filtros avanzados compartidos**
   - Búsqueda global mejorada
   - Filtros por status_code, país, balance
   - Exportación a Excel

5. **Mejoras de vista de clientes**
   - Detalles mejorados
   - Edición inline de campos
   - Historial visual

### 🔒 Mediano plazo (Mes 2)

6. **Endurecimiento final de seguridad**
   - RLS completa para `clients`, `agents`, `campaigns`
   - Validación de backend en funciones críticas
   - Auditoría de permisos

7. **Alertas y notificaciones globales**
   - Calendario con alertas próximas citas
   - Notificaciones de cambio de estado
   - Resumen diario por operación

8. **Reportes y analytics**
   - Métricas por agente
   - Performance de campañas
   - ROI por cliente/campaña

---

## Configuración

### Variables de entorno

**Archivo:** `.env` (crear desde `.env.example`)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Features
VITE_ENABLE_CALLS=false          # Activar/desactivar módulo de llamadas
VITE_MAINT_BYPASS=false          # Bypassear modo mantenimiento (dev only)

# Encriptación (opcional)
VITE_ENCRYPTION_KEY=your-client-key-here

# Resilencia (desarrollo)
VITE_ENABLE_RESILIENCE_DEBUGGER=false  # Debugger de resilencia
```

**Notas:**
- `VITE_*` está expuesto al navegador (cliente-side)
- `VITE_MAINT_BYPASS` solo funciona en desarrollo
- `VITE_ENCRYPTION_KEY` debe tratarse como valor público del cliente
- No colocar secretos reales en variables `VITE_*`

### Configuración de builds

**Vite** (`vite.config.ts`):
- Code splitting manual para reducir tamaño del bundle inicial
- Chunks separados: `xlsx`, `supabase`, `motion`, `router`, `icons`, `toasts`, `react-vendor`

**TypeScript** (`tsconfig.json`):
- Target: ES2020
- Strict mode activado

**Tailwind** (`tailwind.config.js`):
- Extensiones de tema
- Soporte de dark mode

---

## Comandos y scripts

### Desarrollo

```bash
# Instalar dependencias
npm install

# Dev server (http://localhost:5173)
npm run dev

# Linting
npm run lint

# Validar tipos (especialmente en PowerShell Windows)
npm exec -- tsc --noEmit
# o en Windows/PowerShell:
cmd /c npm exec -- tsc --noEmit

# Build production
npm run build

# Preview de build local
npm run preview
```

### Scripts específicos

```bash
# Sincronizar emails de auth con tabla de usuarios
npm run sync:auth-emails
```

### Tareas de base de datos

**Ubicación:** `supabase/`

- `migrations/` - Migraciones SQL aplicadas
- `_manual_sql/` - Scripts SQL de mantenimiento
- `functions/` - Funciones Supabase (edge functions y SQL)
- `_backup_migrations_*/` - Respaldos de migraciones anteriores

**Para aplicar migraciones en Supabase:**
1. Usar Supabase SQL Editor
2. Copiar contenido de migración
3. **Importante:** `CREATE INDEX CONCURRENTLY` no puede estar en bloque transaccional
4. Ejecutar con cuidado línea por línea si usa Editor

---

## Aspectos técnicos importantes

### Módulos y lazy loading

- Frontend no tiene lazy loading configurado actualmente
- Considera agregar React.lazy para reducir bundle inicial en futuro

### Estado global

- `AuthProvider` centralizado
- Contexto por módulo según necesidad
- No hay Redux/Zustand (está considerado)

### Performance

- Debounce en búsquedas: 300ms
- Paginación: por defecto 25 items
- Heartbeat de presencia: pausado en background
- Timeout de request: configurable, default 30s

### Resilencia

**Sistema de degradación:** Cuando Supabase responde con errores consecutivos:
1. Activar modo degradado
2. Pausar lecturas pesadas
3. Mostrar banner informativo
4. Mantener funcionalidad básica
5. Recuperar automáticamente al detectar respuestas sanas

---

## Próximos pasos recomendados

1. **Validar producción**
   - Confirmar migraciones aplicadas
   - Confirmar índices presentes
   - Smoke test completo

2. **Implementar B1-02** (Anexación a campaña existente)
   - RPC ajustada
   - UI actualizada
   - Documentación

3. **Exponer funcionalidad existente** (Movimiento entre campañas)
   - Frontend para `move_clients_to_campaign`
   - Frontend para `move_campaign_clients_by_status`

4. **Monitorear producción**
   - Métricas de Supabase
   - Errores y performance
   - Uso de modo degradado

---

## Referencias y archivos relacionados

**Documentación:**
- [Gate 0 - Diagnóstico técnico](gate-0-diagnostico-2026-04-16.md)
- [Optimización e implementación](optimization-implementation-summary-2026-04-15.md)
- [Cambios pendientes (backlog)](backlog-operativo-cambios-crm-2026-04-16.md)
- [Roadmap de optimización](production-optimization-roadmap-2026-04-14.md)
- [Hardening de performance](performance-hardening-2026-04-14.md)

**Configuración:**
- [package.json](../package.json)
- [tsconfig.json](../tsconfig.json)
- [vite.config.ts](../vite.config.ts)
- [tailwind.config.js](../tailwind.config.js)

---

**Última actualización:** 8 de mayo de 2026  
**Próxima revisión recomendada:** Después del despliegue en producción o cada 2 semanas de desarrollo

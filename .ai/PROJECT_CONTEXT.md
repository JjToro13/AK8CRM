cat > .ai/PROJECT_CONTEXT.md <<'EOF'
# PROJECT_CONTEXT — AK8CRM

## Estado

AK8CRM está en fase de refactorización avanzada, apto para desarrollo.

Ya existe:
- Arquitectura modular por dominios.
- Layout compartido.
- Branding real por tenant desde `tenant_settings`.
- Visibilidad de operaciones por tenant mediante RPCs.
- Sincronización dinámica tenant → operación activa → branding → dashboard.
- Gestión de recursos con scope de operación activa.
- Importación de clientes con detección de duplicados.
- Historial de comentarios con paginación.
- Agenda comercial con `scheduled_calls` y soporte de zonas horarias.
- Índices en rutas calientes.
- Capa de resiliencia y degradación.

Parcial:
- Aislamiento por tenant/operación está cubierto en frontend, pero backend aún requiere hardening final.
- RLS/funciones seguras están completas en algunos módulos y en progreso en otros.

Pendiente:
- Endurecimiento final de base de datos.
- RLS/funciones seguras completas para `clients`, `agents` y `campaigns`.
- Anexar clientes a campaña existente durante importación.
- Limpieza de código legado.
- Validación de despliegue en producción.

## Objetivo del producto

CRM operativo multi-tenant para:
- Equipos de llamadas.
- Seguimiento comercial.
- Campañas de contacto.
- Gestión de agentes.
- Asignaciones.
- Calendario.
- Aislamiento funcional por tenant y operación.

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
- RLS

## Entidades principales

- users
- organizations
- operations
- tenant_settings
- clients
- campaigns
- agents
- calls
- client_comments
- scheduled_calls
- did

## RPCs y funciones importantes

Disponibles:
- `public.import_clients_v1()`
- `public.move_clients_to_campaign()`
- `public.move_campaign_clients_by_status()`

Pendiente:
- RPC mejorada para importar hacia campaña existente.
- Funciones de seguridad completas para validación backend.

## Seguridad

Implementado:
- RLS en tablas principales.
- Validación de tenant en políticas.
- Validación de operación en acceso a datos.
- Restricción de ejecución de funciones sensibles.

Pendiente:
- Hardening final para no depender del frontend.
- Auditoría completa de permisos.

## Hallazgos clave

### Importación incompleta

`public.import_clients_v1()`:
- Crea campaña nueva automáticamente.
- Genera prefijo por operación.
- Detecta duplicados en archivo.
- Detecta duplicados existentes en operación.
- Devuelve resumen de errores.
- No permite importar hacia campaña existente.

Prioridad:
Crear `import_clients_v2` o ajustar `import_clients_v1`.

### Movimiento entre campañas

Ya existen:
- `public.move_clients_to_campaign`
- `public.move_campaign_clients_by_status`

Prioridad:
Exponer funcionalidad en UI antes de crear lógica nueva innecesaria.

### Calendario

`scheduled_calls` ya soporta:
- Tenant.
- Operación.
- Cliente.
- Campaña.
- Agente.
- Estados.
- Timezone.
- Índices.
- Triggers.
- RLS funcional.

### Unicidad de cliente

La unicidad de email/teléfono debe ser por operación, no global.

## Performance

Mantener:
- Debounce en búsquedas desde 2+ caracteres.
- Paginación por defecto 25.
- Heartbeat pausado en background.
- Timeout default 30s.
- Selects de columnas mínimas.
- Sin `select("*")` en rutas calientes.

## Resiliencia

Cuando Supabase falla:
1. Activar modo degradado.
2. Pausar lecturas pesadas.
3. Mostrar banner informativo.
4. Mantener funcionalidad básica.
5. Recuperar automáticamente al detectar respuestas sanas.

## Variables de entorno

Supabase:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Features:
- VITE_ENABLE_CALLS
- VITE_MAINT_BYPASS
- VITE_ENABLE_RESILIENCE_DEBUGGER

Otros:
- VITE_ENCRYPTION_KEY

Regla:
Todo `VITE_*` es público para el navegador. No poner secretos reales.

## Próximos pasos recomendados

1. Validar producción.
2. Implementar B1-02.
3. Exponer movimiento entre campañas.
4. Monitorear producción.
5. Hardening final de seguridad.
EOF
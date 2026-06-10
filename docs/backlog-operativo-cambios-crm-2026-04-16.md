# Backlog operativo de cambios CRM

Fecha: 2026-04-16

## Decisión de arranque

No empezar por rediseño de base de datos.

Sí hacer un preflight técnico de BD y RPC antes del primer cambio funcional.

## Regla de trabajo

Cada bloque se cierra solo cuando cumpla estas 4 condiciones:

- desarrollo terminado
- validación manual hecha
- impacto en permisos revisado
- riesgo de regresión documentado si quedó algo pendiente

## Gate 0. Preflight obligatorio

Estado esperado antes de tocar UI:

- [ ] Confirmar en el ambiente objetivo que existen `scheduled_calls`, `client_comments`, `clients.last_comment_at`, `clients.user_balance`, `clients.phone_number`, `clients.email`.
- [ ] Confirmar que están aplicadas las migraciones críticas de campañas, importación y calendario.
- [ ] Probar una importación real grande y documentar el resultado.
- [ ] Confirmar si `import_clients_v1` permite anexar a campaña existente o si siempre crea una nueva.
- [ ] Confirmar si en producción siguen existiendo conflictos por seriales o duplicados entre operaciones.

Migraciones a validar:

- `supabase/migrations/20260323110000_calendar_module_foundation.sql`
- `supabase/migrations/20260324131500_scheduled_calls_timezone_support.sql`
- `supabase/migrations/20260328153000_replace_import_clients_edge_with_rpc.sql`
- `supabase/migrations/20260406123000_fix_campaigns_primary_key.sql`
- `supabase/migrations/20260406124500_fix_import_clients_serial_generation.sql`
- `supabase/migrations/20260406130000_scope_client_identity_uniqueness_by_operation.sql`

Salida esperada de este gate:

- una respuesta clara a esta pregunta: `¿se puede empezar solo con frontend y servicios actuales o hay que tocar RPC antes?`

## Orden técnico recomendado

1. Gate 0. Preflight obligatorio
2. Campañas e importación
3. Filtros compartidos y vista usuario
4. Vista clientes
5. Edición de cliente y comentarios
6. Calendario y seguimiento
7. Notificaciones globales

## Bloque 1. Campañas e importación

### B1-01. Diagnóstico del bug de campañas incompletas

Objetivo:

dejar reproducido y entendido el fallo de cargas grandes

Archivos a revisar:

- `src/modules/campaigns/components/ImportClientsModal.tsx`
- `schema.sql`

Tareas:

- [ ] reproducir con una base grande
- [ ] validar si el problema ocurre en parsing, RPC o constraints
- [ ] documentar si falla por tamaño, duplicados, seriales o timeout lógico

BD:

sí, solo validación al inicio

Cierre:

- [ ] causa probable identificada
- [ ] decisión tomada: corregir frontend, RPC o ambos

### B1-02. Anexar clientes a una base existente

Objetivo:

permitir importar clientes a una campaña ya creada

Archivos objetivo:

- `src/modules/campaigns/components/ImportClientsModal.tsx`
- `src/modules/campaigns/hooks/useCampaignManagement.ts`
- `src/modules/campaigns/services/campaigns.service.ts`
- `schema.sql` o nueva migración si hace falta RPC

Tareas:

- [ ] definir UX: selector de campaña destino dentro del modal
- [ ] decidir si el flujo soporta campaña nueva y existente en el mismo modal
- [ ] ajustar `import_clients_v1` o crear RPC nueva si hoy no soporta anexar
- [ ] validar tenant, operación y campaign_id

BD:

probable ajuste de RPC

Cierre:

- [ ] importar a campaña existente funciona
- [ ] no rompe seriales ni conteos de campaña

### B1-03. Informe de duplicados al subir base

Objetivo:

mostrar al usuario qué registros fueron rechazados por repetidos

Archivos objetivo:

- `src/modules/campaigns/components/ImportClientsModal.tsx`
- RPC de importación en BD

Tareas:

- [ ] definir criterio de duplicado: email, teléfono o ambos
- [ ] mostrar resumen útil al terminar importación
- [ ] decidir si solo se informa en pantalla o si se guarda historial

BD:

opcional

Cierre:

- [ ] el usuario ve cuántos se importaron y cuántos se omitieron por repetidos

### B1-04. Repartir clientes correctamente desde campañas

Objetivo:

mejorar asignación desde la vista campañas

Archivos objetivo:

- `src/modules/agents/components/AssignmentModal.tsx`
- `src/modules/assignments/services/agent-assignments.service.ts`
- `schema.sql` para revisar `assign_leads_atomic_v2`

Tareas:

- [ ] agregar filtros útiles al modal
- [ ] validar asignación por campaña
- [ ] validar cantidades máximas y disponibilidad real

BD:

no debería requerir estructura nueva

Cierre:

- [ ] asignar desde campañas respeta campaña, operación y disponibilidad

### B1-05. Ver listado de clientes dentro de cada base

Objetivo:

abrir campaña y navegar sus clientes con filtros avanzados

Archivos objetivo:

- `src/modules/campaigns/components/CampaignsTable.tsx`
- `src/modules/campaigns/components/CampaignsTableRow.tsx`
- `src/modules/clients/services/clients.service.ts`

Tareas:

- [ ] definir interacción de doble clic o acción explícita
- [ ] abrir listado filtrado por `campaign_id`
- [ ] agregar filtros por país, saldo y estatus

BD:

no

Cierre:

- [ ] una campaña puede abrirse como cartera filtrada

## Bloque 2. Filtros compartidos y vista usuario

### B2-01. Extender servicio de clientes con filtros nuevos

Objetivo:

centralizar filtros antes de tocar varias pantallas

Archivos objetivo:

- `src/modules/clients/services/clients.service.ts`
- `src/modules/clients/hooks/useClientManagement.ts`

Tareas:

- [ ] agregar filtros por `country`
- [ ] agregar filtro por rango de saldo
- [ ] mantener filtro por `status_code`
- [ ] revisar ordenamiento por `updated_at` y `last_comment_at`

BD:

no al inicio

Cierre:

- [ ] un solo servicio soporta filtros reutilizables para clientes, usuario y campañas

### B2-02. Filtros del modal de asignación en usuario

Archivos objetivo:

- `src/modules/agents/components/AssignmentModal.tsx`

Tareas:

- [ ] añadir país
- [ ] añadir rango de saldo
- [ ] añadir estatus

Cierre:

- [ ] el modal de asignación ya no depende solo de campaña y cantidad

### B2-03. Filtros en detalle de asignados

Archivos objetivo:

- `src/modules/clients/hooks/useClientManagement.ts`
- `src/modules/clients/components/ClientsFiltersCard.tsx`

Tareas:

- [ ] extender filtros al detalle de asignados
- [ ] validar experiencia para admin y agente

Cierre:

- [ ] el usuario puede ubicar rápidamente clientes asignados usando filtros nuevos

### B2-04. Mostrar teléfono en asignados

Archivos objetivo:

- `src/modules/clients/components/ClientsTable.tsx`
- `src/modules/clients/components/ClientsTableRow.tsx`
- `src/modules/clients/components/clientsTableLayout.ts`

Tareas:

- [ ] exponer columna o detalle de teléfono
- [ ] validar permisos de visualización si aplica

Cierre:

- [ ] teléfono visible en la vista donde el usuario trabaja asignados

## Bloque 3. Vista clientes

### B3-01. Filtros avanzados de clientes

Archivos objetivo:

- `src/modules/clients/components/ClientsFiltersCard.tsx`
- `src/modules/clients/hooks/useClientManagement.ts`
- `src/modules/clients/services/clients.service.ts`

Tareas:

- [ ] agregar país
- [ ] agregar rango de saldo
- [ ] agregar estatus
- [ ] mantener paginación estable

Cierre:

- [ ] filtros nuevos funcionan sin romper búsqueda, paginación ni conteos

### B3-02. Elegir columnas visibles

Archivos objetivo:

- `src/modules/clients/components/ClientsTable.tsx`
- `src/modules/clients/components/clientsTableLayout.ts`
- `src/modules/clients/components/ClientsResultsHeader.tsx`

Tareas:

- [ ] definir columnas opcionales
- [ ] permitir mostrar/ocultar
- [ ] guardar preferencia local

Cierre:

- [ ] el usuario puede personalizar la tabla sin perder estabilidad visual

### B3-03. Filtros y búsqueda por columna

Archivos objetivo:

- `src/modules/clients/components/ClientsTable.tsx`
- `src/modules/clients/components/ClientsTableRow.tsx`
- `src/modules/clients/services/clients.service.ts`

Tareas:

- [ ] definir qué columnas tendrán filtro directo
- [ ] diseñar interacción sin volver pesada la tabla
- [ ] validar rendimiento con paginación

Cierre:

- [ ] existe filtrado por cabeceras o casillas de columna

### B3-04. Ordenar y gestionar por fecha de edición

Archivos objetivo:

- `src/modules/clients/services/clients.service.ts`
- `src/modules/clients/hooks/useClientManagement.ts`

Tareas:

- [ ] ordenar por `updated_at`
- [ ] ordenar o priorizar por `last_comment_at`
- [ ] crear criterio de urgente para clientes sin comentario del día

Cierre:

- [ ] existe una forma clara de identificar clientes que deben retomarse hoy

## Bloque 4. Edición de cliente y comentarios

### B4-01. Mostrar número y email en editar cliente

Archivos objetivo:

- `src/shared/components/client/EditClientModal.tsx`

Tareas:

- [ ] exponer `phone_number`
- [ ] exponer `email`

Cierre:

- [ ] editar cliente muestra contacto completo

### B4-02. Registrar valor depositado solo admin

Archivos objetivo:

- `src/shared/components/client/EditClientModal.tsx`
- `src/modules/clients/services/clients.service.ts`

Tareas:

- [ ] confirmar si el campo funcional es `user_balance`
- [ ] permitir edición solo para admin
- [ ] validar guardado y permisos

BD:

no para el campo actual

Cierre:

- [ ] admin puede actualizar el valor requerido sin exponerlo a otros roles

### B4-03. Mantener ventana abierta al guardar comentario

Archivos objetivo:

- `src/shared/components/client/EditClientModal.tsx`

Tareas:

- [ ] separar guardado de comentario y cierre de modal
- [ ] mostrar confirmación visual
- [ ] recargar historial sin cerrar

Cierre:

- [ ] el modal permanece abierto después de guardar comentario

### B4-04. Orden de comentarios y más antiguos / más nuevos

Archivos objetivo:

- `src/modules/comments/services/client-comments.service.ts`
- `src/shared/components/client/EditClientModal.tsx`

Tareas:

- [ ] añadir control de orden asc/desc
- [ ] revisar paginación de comentarios

Cierre:

- [ ] historial puede verse en ambos sentidos

### B4-05. Cambiar status a select compacto

Archivos objetivo:

- `src/shared/components/client/EditClientModal.tsx`

Tareas:

- [ ] reemplazar botones actuales por select o agrupación compacta
- [ ] mantener claridad de estados

Cierre:

- [ ] la edición ocupa menos espacio sin perder legibilidad

### B4-06. Navegación siguiente / atrás en editar cliente

Archivos objetivo:

- `src/modules/clients/hooks/useClientManagement.ts`
- `src/shared/components/client/EditClientModal.tsx`

Tareas:

- [ ] pasar contexto de lista al modal
- [ ] crear navegación al siguiente y anterior cliente
- [ ] conservar filtros y página actual

Cierre:

- [ ] el operador puede recorrer clientes desde el mismo modal

## Bloque 5. Calendario y seguimiento

### B5-01. Revisar flujo completo del calendario

Archivos objetivo:

- `src/modules/calendar/hooks/useCalendar.ts`
- `src/modules/calendar/services/calendar.service.ts`
- `src/modules/calendar/components/CalendarEventModal.tsx`
- `src/modules/calendar/components/CalendarFollowUpModal.tsx`
- `src/modules/calendar/pages/CalendarPage.tsx`

Tareas:

- [ ] validar crear cita
- [ ] validar editar cita
- [ ] validar reagendar
- [ ] validar marcar atendida, pospuesta o pérdida
- [ ] validar impacto sobre seguimiento comercial

Cierre:

- [ ] el seguimiento del calendario funciona de punta a punta

### B5-02. Notificaciones visibles desde cualquier vista

Archivos objetivo:

- `src/App.tsx`
- `src/modules/calendar/services/calendar.service.ts`
- `src/shared/lib/notify.ts`

Tareas:

- [ ] decidir si será alerta simple o centro de notificaciones
- [ ] si es alerta simple, construir un listener/global panel
- [ ] mostrar pendientes o vencidas desde cualquier vista

BD:

no al inicio si es alerta calculada

Cierre:

- [ ] el usuario puede ver alertas del calendario fuera del módulo calendario

## Bloque 6. QA y cierre por fases

### QA mínimo por cada entrega

- [ ] probar como admin
- [ ] probar como agente
- [ ] probar con operación activa
- [ ] probar con cambios de filtros y paginación
- [ ] probar comentarios
- [ ] probar campaña con clientes asignados y sin asignar
- [ ] probar seguimiento con cita vencida y reagendada

## Riesgos principales

- la importación puede requerir RPC adicional antes de seguir con UI
- filtros por columna pueden degradar rendimiento si se intentan resolver todos del lado cliente
- navegación siguiente / atrás puede romper selección si no se usa el contexto correcto de paginación
- notificaciones globales pueden crecer de alcance si el cliente pide historial, leído/no leído o persistencia

## Qué haría yo primero

Sprint técnico inicial:

- [ ] Gate 0 completo
- [ ] B1-01 diagnóstico de campañas grandes
- [ ] B1-02 anexar clientes a base existente
- [ ] B1-03 informe de duplicados

Sprint funcional siguiente:

- [ ] B2-01 extender servicio de filtros
- [ ] B2-02 filtros en asignación
- [ ] B3-01 filtros avanzados de clientes
- [ ] B4-01 mostrar teléfono y email en editar cliente
- [ ] B4-03 mantener modal abierto al guardar comentario

Sprint de operación:

- [ ] B4-04 orden de comentarios
- [ ] B4-06 siguiente / atrás en editar cliente
- [ ] B3-04 prioridad por última gestión
- [ ] B5-01 revisar flujo calendario
- [ ] B5-02 alertas globales

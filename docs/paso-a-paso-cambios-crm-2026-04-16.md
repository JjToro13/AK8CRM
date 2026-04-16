# Paso a paso de implementación de cambios CRM

Fecha: 2026-04-16

## Respuesta corta

No hace falta arrancar con una reestructuración grande de base de datos.

Pero sí conviene hacer primero una validación de BD antes de empezar desarrollo, porque varios cambios dependen de que producción ya tenga aplicadas las migraciones recientes de campañas, importación y calendario.

## Qué ya existe hoy en la BD

Según el esquema actual, ya existen estos datos y estructuras:

- `clients.phone_number`
- `clients.email`
- `clients.country`
- `clients.user_balance`
- `clients.status_code`
- `clients.last_comment`
- `clients.last_comment_at`
- `client_comments`
- `scheduled_calls`
- funciones para mover clientes entre campañas:
  - `move_clients_to_campaign`
  - `move_campaign_clients_by_status`

Conclusión: una parte importante de lo pedido es de interfaz, filtros, flujo y experiencia de uso, no de nuevas tablas.

## Qué validar en BD antes de arrancar

Antes de tocar frontend o flujos, validar que la base del ambiente donde se va a trabajar o desplegar tenga estas migraciones aplicadas:

- `supabase/migrations/20260323110000_calendar_module_foundation.sql`
- `supabase/migrations/20260324131500_scheduled_calls_timezone_support.sql`
- `supabase/migrations/20260328153000_replace_import_clients_edge_with_rpc.sql`
- `supabase/migrations/20260406123000_fix_campaigns_primary_key.sql`
- `supabase/migrations/20260406124500_fix_import_clients_serial_generation.sql`
- `supabase/migrations/20260406130000_scope_client_identity_uniqueness_by_operation.sql`

## Mi criterio sobre cambios en BD

### No requeridos al inicio

Estos cambios se pueden hacer sin cambiar estructura de tablas:

- ver teléfono y email en más pantallas
- filtros por país, saldo y estatus
- ordenar comentarios
- mantener modal abierto al guardar comentarios
- cambiar botones de estatus a select
- siguiente / atrás en editar cliente
- priorizar clientes sin comentario del día usando `last_comment_at`
- ver y gestionar seguimiento del calendario usando `scheduled_calls`

### Posibles cambios de BD o RPC

Estos puntos sí pueden requerir backend o SQL adicional:

- anexar clientes a una base existente al momento de importar
  - hoy el flujo de importación está orientado a crear campaña nueva
  - si se quiere importar directo a una campaña existente, probablemente toque ajustar `import_clients_v1` o crear una nueva RPC

- informe formal de duplicados al subir base
  - si basta con mostrar duplicados durante la carga, puede resolverse con la RPC actual o con lógica de importación
  - si quieren guardar historial de duplicados por archivo/importación, entonces sí haría falta nueva tabla de auditoría

- notificaciones del calendario visibles desde cualquier vista
  - si basta con mostrar alertas calculadas desde `scheduled_calls`, no hace falta tabla nueva
  - si quieren centro de notificaciones, leídos/no leídos o historial, sí haría falta nueva estructura

## Recomendación de arranque

No empezaría creando nuevas tablas.

Empezaría así:

1. Confirmar estado de migraciones en BD.
2. Separar lo que es solo UI/UX de lo que requiere RPC.
3. Resolver primero campañas e importación, porque ahí están los riesgos de datos.
4. Luego clientes y usuario.
5. Al final calendario y notificaciones globales.

## Orden de implementación sugerido

## Fase 0. Preparación técnica

Objetivo: asegurar que el proyecto está estable antes de tocar flujos.

Checklist:

- revisar que producción y desarrollo tengan las migraciones críticas aplicadas
- probar importación de campañas grandes con un archivo de volumen alto
- validar que `import_clients_v1` responde bien ante duplicados y errores
- revisar si el flujo actual de importación siempre crea campaña nueva
- revisar si los movimientos entre campañas ya están expuestos en frontend

Entregable:

- diagnóstico inicial de BD y backend
- lista final de puntos que sí requieren SQL o RPC nueva

## Fase 1. Campañas

Objetivo: estabilizar importación y administración de bases.

### 1.1 Corregir campañas incompletas al subir bases grandes

Pasos:

- reproducir el error con carga grande
- revisar límites de lote, validación y respuesta de `import_clients_v1`
- ajustar manejo de errores parciales
- validar conteo final de clientes importados

Impacto BD:

- posible
- depende de si el problema está en la RPC, índices, constraints o paginado de inserción

### 1.2 Anexar clientes a bases existentes

Pasos:

- definir si anexar significa importar directo a campaña existente
- agregar selector de campaña destino en importación
- ajustar RPC de importación o crear una nueva para insertar sobre `campaign_id` existente
- validar que no rompa seriales, operación ni tenant

Impacto BD:

- probable ajuste de RPC
- no necesariamente nueva tabla

### 1.3 Informe de repetidos al subir la base

Pasos:

- definir qué se considera repetido: email, teléfono o ambos
- exponer resultado claro al usuario al terminar la carga
- decidir si se muestra en pantalla o si se guarda historial de importación

Impacto BD:

- opcional
- solo si se quiere guardar auditoría histórica

### 1.4 Seleccionar y repartir clientes para asignar correctamente desde campañas

Pasos:

- revisar el flujo actual de asignación en campañas
- permitir selección por campaña y reparto controlado
- validar asignación con campañas bloqueadas / desbloqueadas

Impacto BD:

- no debería requerir nuevas tablas
- puede apoyarse en RPCs y estructura actual

### 1.5 Ver listado de clientes desde bases con filtros avanzados

Pasos:

- abrir detalle de campaña con doble clic
- agregar filtros por país, rango de saldo y estatus
- dejar navegación consistente con la vista clientes

Impacto BD:

- no

## Fase 2. Vista Usuario

Objetivo: mejorar asignación y consulta operativa para quien trabaja campañas.

### 2.1 Filtros al asignar en campañas

- agregar filtros dentro del modal de asignación
- reutilizar criterios ya existentes de clientes
- validar rendimiento

Impacto BD:

- no

### 2.2 Filtros más diversos en usuario

- agregar país, rango de saldo y estatus
- validar persistencia de filtros y experiencia de uso

Impacto BD:

- no

### 2.3 Filtrar en detalles de asignados

- extender búsqueda y filtros al detalle de clientes asignados

Impacto BD:

- no

### 2.4 Ver número de teléfono en detalles de asignados

- exponer el campo ya existente en UI

Impacto BD:

- no

## Fase 3. Clientes

Objetivo: convertir la vista clientes en la principal herramienta operativa.

### 3.1 Filtros avanzados en detalles

- agregar filtros por país, saldo y estatus
- completar la paginación faltante donde aplique

Impacto BD:

- no

### 3.2 Elegir columnas visibles

- permitir mostrar/ocultar columnas
- guardar preferencia local del usuario

Impacto BD:

- no

### 3.3 Ordenar comentarios por fecha

- permitir ascendente y descendente
- revisar si al editar comentarios también debe actualizar vista

Impacto BD:

- no

### 3.4 Filtrar y buscar desde cabeceras de columnas

- agregar filtros por columna
- definir cuáles columnas soportan texto, número o fecha

Impacto BD:

- no

### 3.5 Asignar valor depositado solo admin

- revisar permisos por rol
- permitir edición de `user_balance` o del campo que se confirme funcionalmente
- auditar si hace falta trazabilidad funcional

Impacto BD:

- no para el campo
- posible si luego quieren historial de cambios monetarios

### 3.6 Ver número y email en actualizar cliente

- exponer datos ya existentes

Impacto BD:

- no

### 3.7 Priorizar clientes sin comentario del día

- usar `last_comment_at`
- agregar filtro o vista de urgentes
- ordenar por fecha de última gestión

Impacto BD:

- no al inicio
- si luego el cálculo resulta pesado, se revisa optimización

### 3.8 Mantener ventana abierta al guardar comentarios

- guardar comentario
- mostrar confirmación
- refrescar bloque de comentarios sin cerrar modal

Impacto BD:

- no

### 3.9 Cambiar botones de estatus por select compacto

- cambio visual

Impacto BD:

- no

### 3.10 Botones siguiente y atrás en editar cliente

- navegar usando el contexto de la lista actual
- conservar filtros y posición

Impacto BD:

- no

## Fase 4. Calendario

Objetivo: asegurar seguimiento real y reagendamiento útil.

### 4.1 Revisar proceso del calendario y seguimiento

Pasos:

- validar creación de eventos
- validar actualización de estado
- validar follow-up y reagendamiento
- revisar casos de citas abiertas, pospuestas y vencidas

Impacto BD:

- no debería requerir nuevas tablas

### 4.2 Notificaciones del calendario visibles desde cualquier vista

Pasos:

- decidir si será una alerta global simple o un centro de notificaciones
- si es alerta simple, resolver desde frontend leyendo `scheduled_calls`
- si es centro de notificaciones, diseñar estructura aparte

Impacto BD:

- depende del alcance final

## Criterio para decidir si un cambio toca BD

Toca BD si pasa una de estas cosas:

- hace falta guardar un dato nuevo que hoy no existe
- hace falta historial o auditoría persistente
- hace falta una nueva regla de negocio que convenga centralizar en SQL/RPC
- el rendimiento con los filtros nuevos no aguanta y exige índice o vista adicional

Si no se cumple nada de eso, el cambio debe resolverse primero en frontend y servicios existentes.

## Recomendación final

Sí hay que revisar base de datos antes de empezar, pero no para rediseñarla completa.

Mi recomendación es:

- primero validar migraciones y RPCs críticas
- después ejecutar campañas/importación
- luego clientes y usuario
- y al final calendario global y notificaciones

Eso reduce el riesgo de empezar por UI y luego tener que rehacer flujos por problemas de importación, campaña o permisos.

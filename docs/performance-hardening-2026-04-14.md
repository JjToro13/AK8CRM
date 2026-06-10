# Performance Hardening - 2026-04-14

## Context

Se detecto una degradacion severa en Supabase que termino afectando `Database`, `PostgREST` y `Auth`. La causa no quedo reducida a un solo query, pero si aparecio un patron claro de carga sostenida desde el frontend:

- polling frecuente en varias vistas
- consultas duplicadas o innecesarias
- carga anticipada de comentarios
- modales que traian colecciones completas
- heartbeats y chequeos globales demasiado agresivos para un proyecto pequeno

Este documento resume lo que ya se corrigio y lo que todavia conviene atacar.

## Cambios Aplicados

### 1. Estado de autenticacion unificado

Archivos:

- `src/hooks/useAuth.ts`
- `src/main.tsx`

Cambios:

- `useAuth` dejo de crear instancias separadas por consumidor.
- Se agrego `AuthProvider` y el estado de sesion ahora se comparte entre toda la app.
- Se redujo el heartbeat de presencia de `30s` a `90s`.
- El heartbeat ya se pausa cuando la pestana no esta visible.

Impacto esperado:

- menos suscripciones duplicadas
- menos llamadas paralelas a auth/profile/presence
- menos riesgo de ciclos de carga infinitos

### 2. Comentarios bajo demanda y paginados

Archivos:

- `src/modules/comments/services/client-comments.service.ts`
- `src/shared/components/client/ClientCommentsCell.tsx`
- `src/shared/components/client/ClientCommentsDropdown.tsx`
- `src/shared/components/client/EditClientModal.tsx`

Cambios:

- Se elimino la precarga de comentarios al renderizar filas o vistas.
- Los comentarios ahora se cargan solo al abrir el historial.
- Se implemento paginacion por bloques de `10`.
- Se agrego `hasMore` y accion de `Cargar mas`.

Impacto esperado:

- menos lecturas sobre `client_comments`
- menos payload en tabla y modales
- menor probabilidad de picos por usuarios con historiales largos

### 3. Busquedas con debounce y menos queries duplicadas

Archivos:

- `src/modules/clients/hooks/useClientManagement.ts`
- `src/modules/dashboard/hooks/useDashboard.ts`

Cambios:

- Se agrego debounce de `400ms` a la busqueda de clientes.
- Se elimino el doble disparo de busqueda en dashboard.
- En clientes se quito la consulta paralela redundante que se hacia para calcular el baseline en cada carga.

Impacto esperado:

- menos requests por pulsacion
- menos `count exact` innecesarios
- menor presion sobre `clients` en horas pico

### 4. Polling reducido y refresco por foco/visibilidad

Archivos:

- `src/modules/clients/hooks/useClientManagement.ts`
- `src/modules/agents/hooks/useAgentManagement.ts`
- `src/shared/components/guards/MaintenanceGate.tsx`

Cambios:

- Se elimino el polling periodico continuo de clientes y agentes.
- Ahora las vistas refrescan al recuperar foco o visibilidad, y solo si la data ya esta vieja.
- `MaintenanceGate` paso de `15s` a `60s` y no consulta cuando la pestana esta oculta.

Impacto esperado:

- menos trafico constante
- mejor comportamiento con multiples pestanas abiertas
- menos drenaje sostenido de IO y conexiones

### 5. Consultas de clientes asignados mas finas

Archivos:

- `src/modules/clients/services/clients.service.ts`
- `src/modules/assignments/services/agent-assignments.service.ts`

Cambios:

- Se formalizo un `CLIENT_LIST_SELECT` reutilizable para no depender de `select("*")`.
- Se agregaron `name` y `trading_company` al select compartido para no romper la UI.
- `agentAssignments.getAssignedClients` ahora usa el select liviano en vez de `clients.*`.

Impacto esperado:

- menos lectura de columnas no usadas
- menor payload al cargar clientes asignados

### 6. Modal de detalle de agente paginado

Archivo:

- `src/modules/agents/components/AgentDetailsModal.tsx`

Cambios:

- Clientes asignados: ahora cargan en paginas de `12`.
- Historial de llamadas: ahora carga en paginas de `25`.
- Se cambiaron `select("*")` por columnas minimas necesarias.
- Se agregaron botones `Cargar mas clientes` y `Cargar mas llamadas`.

Impacto esperado:

- evita traer lotes completos en agentes con mucho volumen
- reduce payload y tiempo de respuesta del modal

### 7. Consulta de llamadas recientes corregida

Archivo:

- `src/modules/calls/services/calls.service.ts`

Cambio:

- Se dejo de filtrar por `client.operation_id` y ahora se filtra por `calls.operation_id`.

Impacto esperado:

- menos joins costosos
- mejor base para futuros indices sobre llamadas

## Verificacion Realizada

- `npm run build` ejecutado con exito despues de los cambios.

## Pendientes Recomendados

### Prioridad alta

- Crear indices para consultas calientes, especialmente:
  - `calls(operation_id, created_at desc)`
  - busquedas de clientes con `pg_trgm` o estrategia equivalente
- Revisar queries con `ILIKE %texto%` en `clients.search`.
- Añadir alertas operativas basicas en Supabase para detectar degradacion antes de que afecte login.

### Prioridad media

- Revisar `CampaignReportExporter` para mover exportaciones pesadas a flujo asincrono o por chunks.
- Revisar `import_clients_v1` con foco en picos de escritura y validaciones sobre lotes grandes.
- Auditar otras rutas con `select("*")` y recortar columnas no usadas.

### Prioridad media-baja

- Evaluar si el plan/size actual del proyecto sigue siendo suficiente para el volumen real.
- Definir budgets operativos por pantalla:
  - maximo de queries al abrir vista
  - refresco permitido por tiempo
  - comportamiento esperado con multiples pestanas

## Flujo de Prueba Recomendado

1. Login y permanencia en reposo 2-3 minutos.
2. Busqueda rapida en dashboard y clientes.
3. Filtros y paginacion en clientes.
4. Apertura de comentarios y uso de `Cargar mas`.
5. Apertura de detalle de agente con volumen alto.
6. Cambio de fecha y paginacion de llamadas en el modal de agente.
7. Cambio de pestana y regreso a la app para validar refresh por foco.
8. Revision en Network/Observability para confirmar menor trafico sostenido.

## Nota Operativa

Lo ya aplicado reduce carga recurrente y payload innecesario desde la app. Lo que falta ya pertenece mas al frente de base de datos y capacidad operativa que al frontend.

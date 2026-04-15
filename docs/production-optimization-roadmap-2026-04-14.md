# Production Optimization Roadmap - 2026-04-14

## Objetivo

Cerrar la optimizacion pendiente para llevarla a produccion sin repetir el patron que saturo IO en Supabase y degrado `Database`, `PostgREST` y `Auth`.

## Meta Operativa

- reducir queries recurrentes desde frontend
- reducir payload innecesario por vista/modal
- evitar `count exact` donde no sea imprescindible
- evitar carga completa de colecciones cuando la UI solo muestra una pagina
- dejar lista la siguiente fase de indices y ajustes SQL para produccion

## Estado Base Confirmado

Aplicado actualmente en frontend:

- `AuthProvider` unificado
- heartbeat de presencia a `90s` y pausa por visibilidad
- dashboard con debounce
- busqueda principal de clientes activada desde `2` caracteres
- polling continuo removido en clientes/agentes
- comentarios paginados en celda/dropdown
- selects mas finos en clientes asignados
- detalle de agente paginado

Pendientes detectados antes de seguir a backend:

- fase frontend cerrada en codigo y build verde

## Fase 1 - Frontend

### Prioridad alta

1. Hacer que el historial de comentarios del modal de cliente cargue solo cuando el usuario lo abra.
2. Cambiar paginaciones de comentarios a estrategia `page_size + 1` para derivar `hasMore` sin `count exact`.
3. Ajustar `AgentDetailsModal` para paginar sin `count exact` y mantener payload minimo.
4. Cambiar la carga de clientes para agentes no-admin a consulta paginada/filtrada desde Supabase, sin traer toda la cartera.
5. Recortar consultas auxiliares redundantes al cargar filtros o badges.

### Criterio de salida de Fase 1

- abrir clientes/agentes no dispara lecturas completas evitables
- comentarios no se cargan hasta que el usuario lo pide
- modales grandes no dependen de `count exact` por cada pagina
- build de frontend en verde

## Fase 2 - Backend / DB

### Prioridad alta

1. Crear indice para llamadas por operacion y fecha:
   - `calls(operation_id, start_time desc)`
2. Revisar indice adicional para detalle de agente si aplica:
   - `calls(agent_id, start_time desc)`
3. Agregar indice para paginacion fuerte de cartera asignada:
   - `clients(assigned_to, operation_id, created_at desc)`
4. Atacar busquedas de clientes con estrategia `pg_trgm`.
5. Confirmar configuracion real del proyecto productivo y si sigue en `Nano`.

### Preparado el 2026-04-14

- migracion repo: `supabase/migrations/20260414223000_query_optimization_phase2.sql`
- script concurrente para prod: `supabase/_manual_sql/2026-04-14_query_optimization_phase2_concurrent.sql`
- ajuste de app: llamadas recientes ordenadas por `start_time`
- ajuste de app: busqueda de clientes del listado principal solo desde `2` caracteres

### Validaciones al pasar a produccion

- comparar requests y tiempos antes/despues
- revisar Query Performance / Logs / Advisor
- validar login en reposo, dashboard, clientes, comentarios, agentes, exportes e importacion

## Registro de Cambios

### 2026-04-14

- Se inicia cierre formal de optimizacion pendiente.
- Se separa trabajo en frontend primero y backend despues.
- Se cierra fase frontend con carga diferida de comentarios, paginacion sin `count exact` en modales pesados y cartera paginada para agentes.
- Se prepara fase backend con indices para `calls`, cartera asignada y `pg_trgm` para busquedas.

# Optimization Implementation Summary - 2026-04-15

## Objetivo

Documentar de forma clara que se realizo para bajar la presion sobre Supabase, por que esos cambios ayudan a reducir IO y cual es el estado actual antes de produccion.

## Problema que se estaba atacando

El patron observado era consistente con saturacion por:

- demasiadas lecturas repetidas desde frontend
- polling y refrescos innecesarios
- modales y tablas que cargaban mas datos de los que la UI realmente mostraba
- busquedas y consultas pesadas sin suficiente apoyo de indices
- ausencia de una estrategia de contingencia cuando la base empezaba a responder lento

El efecto operativo era severo: degradacion de `Database`, `PostgREST` y `Auth`, hasta dejar la app lenta o inaccesible.

## Lo que ya se realizo bien

### 1. Se redujo carga innecesaria desde frontend

Ya quedo aplicada la parte de frontend que recorta requests y payload:

- `AuthProvider` unificado para no duplicar estado y lecturas de sesion.
- heartbeat de presencia menos agresivo y pausado cuando la pestana no esta visible.
- eliminacion de polling continuo en vistas sensibles.
- refresco por foco o visibilidad en lugar de recarga permanente.
- busquedas con debounce.
- busqueda principal de clientes activa desde `2` caracteres.
- comentarios cargados bajo demanda en vez de precarga global.
- paginacion en comentarios y modales pesados.
- selects de columnas minimas en lugar de depender de `select("*")`.
- detalle de agente dividido en cargas mas pequenas para clientes y llamadas.

### 2. Se reforzo la base con indices orientados a queries calientes

Se preparo la fase SQL y, segun la validacion manual reportada, quedaron presentes estos indices:

- `idx_calls_agent_id`
- `idx_calls_agent_start_time`
- `idx_calls_client_id`
- `idx_calls_operation_start_time`
- `idx_clients_assigned_operation_created`
- `idx_clients_email_trgm`
- `idx_clients_first_name_trgm`
- `idx_clients_last_name_trgm`
- `idx_clients_serial_trgm`
- `idx_clients_source_trgm`

Estos indices ayudan sobre todo en:

- historial de llamadas por agente
- llamadas recientes por operacion
- cartera asignada por agente y operacion
- busquedas textuales sobre clientes sin castigar tanto a la tabla completa

### 3. Se agrego una capa de contingencia para no colgar la app

Ademas de optimizar consultas, ya quedo implementado un comportamiento defensivo en frontend:

- timeout configurable para requests a Supabase
- deteccion de errores de red, timeout y estados `408`, `429`, `500`, `502`, `503`, `504`
- activacion automatica de modo degradado despues de fallos consecutivos
- recuperacion automatica despues de respuestas sanas
- pausa de lecturas pesadas cuando la base entra en presion
- banner visible para informar que el CRM sigue accesible en modo reducido
- debugger de desarrollo activable por flag para simular fallos y validar la contingencia

Esto no reduce por si solo el costo normal de una query, pero si evita el efecto cascada donde la app sigue golpeando la base aun cuando ya esta degradada.

## Por que esto si reduce impacto en base de datos

La optimizacion no depende de una sola mejora. El efecto viene de varias capas trabajando juntas:

1. Menos frecuencia de consulta.
   - Se eliminaron recargas agresivas y consultas duplicadas.

2. Menor volumen por consulta.
   - Se trajeron menos columnas y se paginaron vistas pesadas.

3. Mejor soporte del motor para filtros y ordenamientos.
   - Los indices agregados atacan las rutas de lectura mas frecuentes.

4. Menor castigo en escenarios malos.
   - El modo degradado evita seguir saturando la base cuando ya esta respondiendo mal.

## Nota importante sobre el SQL concurrente

El script `CREATE INDEX CONCURRENTLY` no puede ejecutarse dentro de un bloque transaccional.

Por eso, cuando se corre desde Supabase SQL Editor:

- no debe envolverse en `BEGIN` / `COMMIT`
- si el editor lo trata como un bloque unico con transaccion, hay que ejecutar las sentencias concurrentes una por una

Ese comportamiento es normal de PostgreSQL y no significa que el indice este mal.

## Estado actual confirmado

### Confirmado en codigo

- Se integraron los cambios de resiliencia y reduccion de carga en dashboard, clientes, agentes y llamadas.
- Se agrego modal de cambios para comunicar ajustes al usuario final.
- Se agrego debugger dev con flag manual:
  - `VITE_ENABLE_RESILIENCE_DEBUGGER=true`

### Confirmado en build

- `npm run build` paso correctamente despues de los cambios.

### Confirmado por validacion manual

- Se detecto y corrigio la carga de clientes en local.
- La vista de agentes quedo operativa.
- Los indices principales esperados fueron reportados como presentes.

## Que falta antes de llevarlo a produccion

Lo importante es separar claramente lo ya hecho de lo que todavia toca validar en entorno real.

### Pendiente operacional

- desplegar el frontend con estos cambios
- confirmar que produccion tenga aplicados los mismos indices SQL necesarios
- ejecutar smoke test sobre login, dashboard, clientes, agentes y llamadas
- observar metricas de Supabase despues del despliegue

### Lo que deberia medirse despues del deploy

- menos `Database Requests` sostenidos en ventanas de reposo
- menos errores `429` o `5xx`
- menor degradacion en horas pico
- mejor tiempo de respuesta en clientes, dashboard y modales de agente
- ausencia de bloqueos totales de la app ante picos de IO

## Flujo recomendado para pasar a produccion

1. Desplegar primero el frontend optimizado.
2. Aplicar en produccion los indices que falten, respetando la ejecucion correcta de `CONCURRENTLY`.
3. Validar login y navegacion basica.
4. Validar busqueda de clientes, filtros, comentarios, detalle de agente e historial de llamadas.
5. Revisar metricas de Supabase durante al menos unas horas de uso real.
6. Si la base vuelve a mostrar presion, usar el nuevo comportamiento degradado como contencion mientras se revisa el query exacto que siga caliente.

## Conclusión

La optimizacion ya no esta solo en "mejoras cosmeticas" de frontend. Quedo cubierta en tres frentes:

- reduccion real de consultas y payload
- soporte de indices para rutas calientes
- resiliencia del CRM cuando la base entra en presion

Con esto, la app queda mucho mejor preparada para produccion y con menor riesgo de repetir el escenario donde el IO se agotaba y el sistema completo se paralizaba.

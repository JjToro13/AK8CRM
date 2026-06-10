# Gate 0 - Diagnóstico técnico inicial

Fecha: 2026-04-16

## Resultado ejecutivo

Estado: `Apto para empezar desarrollo`, con una advertencia importante.

No hace falta arrancar con una migración grande de base de datos.

Pero sí hay un punto funcional que hoy no está cubierto por el backend actual:

- `anexar clientes a una base existente al importar`

Ese punto no se resuelve solo con frontend. Requiere ajustar la RPC de importación o crear una nueva.

## Qué sí está cubierto en el esquema actual

El repositorio ya contiene soporte para:

- clientes con `phone_number`
- clientes con `email`
- clientes con `country`
- clientes con `user_balance`
- clientes con `status_code`
- clientes con `last_comment`
- clientes con `last_comment_at`
- historial de comentarios en `client_comments`
- agenda comercial en `scheduled_calls`

## Migraciones críticas presentes en el repo

Encontradas localmente:

- `20260323110000_calendar_module_foundation.sql`
- `20260324131500_scheduled_calls_timezone_support.sql`
- `20260328153000_replace_import_clients_edge_with_rpc.sql`
- `20260406123000_fix_campaigns_primary_key.sql`
- `20260406124500_fix_import_clients_serial_generation.sql`
- `20260406130000_scope_client_identity_uniqueness_by_operation.sql`

## Hallazgos clave

### 1. Importación actual

La RPC `public.import_clients_v1`:

- crea una campaña nueva automáticamente
- genera un prefijo nuevo por operación
- detecta duplicados en el archivo
- detecta duplicados ya existentes dentro de la operación
- devuelve un resumen de errores

Conclusión:

- `sí` soporta informe de duplicados básico
- `no` soporta importar directo a una campaña existente

### 2. Campañas

En BD ya existen funciones para mover clientes entre campañas:

- `public.move_clients_to_campaign`
- `public.move_campaign_clients_by_status`

Conclusión:

- el backend ya tiene una base útil para “repartir” o mover clientes
- pero hoy eso no está conectado en frontend

### 3. Calendario

La tabla `scheduled_calls` y su contexto ya existen con:

- operación
- tenant
- cliente
- campaña
- agente
- estado
- fecha agendada
- zona horaria

Además:

- hay índices útiles
- hay trigger de sincronización de contexto
- hay políticas RLS
- el frontend ya usa el flujo de crear, editar, reagendar y seguimiento

Conclusión:

- no se necesita migración inicial para trabajar mejoras del calendario

### 4. Unicidad de clientes

La migración `20260406130000_scope_client_identity_uniqueness_by_operation.sql` cambia la unicidad de email y teléfono para que sea por operación.

Conclusión:

- este punto es importante para importaciones correctas en ambientes con varias operaciones

## Qué no pude confirmar desde local

No pude confirmar si esas migraciones ya están aplicadas en el ambiente productivo o en el ambiente donde se desplegará, porque esta revisión fue solo sobre el código local.

Entonces hay dos verdades distintas:

- `en el repo`: sí existe la base técnica para empezar
- `en producción`: falta confirmar que esté desplegada

## Decisión técnica

Se puede empezar ya mismo con desarrollo.

Pero el primer bloque correcto no es filtros ni calendario.

El primer bloque correcto es:

1. resolver importación hacia campaña existente
2. aprovechar o exponer movimiento entre campañas
3. luego seguir con filtros y mejoras operativas

## Prioridad recomendada inmediata

### Empezar ahora

- ajustar flujo de importación para anexar clientes a campaña existente
- mantener opción de crear campaña nueva
- reutilizar el reporte de duplicados ya existente

### Después

- filtros avanzados compartidos
- mejoras en vista clientes
- ajustes de comentarios
- alertas globales de calendario

## Próximo desarrollo sugerido

Primer cambio a implementar:

`B1-02. Anexar clientes a una base existente`

Razón:

- hoy es el principal hueco entre lo solicitado y lo que realmente soporta el sistema
- depende de backend/RPC, así que conviene resolverlo antes de construir más UI encima

## Archivos que seguramente entran en el primer cambio

- `src/modules/campaigns/components/ImportClientsModal.tsx`
- `src/modules/campaigns/hooks/useCampaignManagement.ts`
- `src/modules/campaigns/services/campaigns.service.ts`
- nueva migración SQL o ajuste de función en `supabase/migrations`

## Conclusión final

No hace falta una reforma general de BD para empezar.

Sí hace falta tocar backend de importación para soportar anexar clientes a bases existentes.

Todo lo demás puede seguir después sobre la estructura actual.

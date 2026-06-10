cat > .ai/CODEX_PROMPTS.md <<'EOF'
# CODEX_PROMPTS — AK8CRM

## Prompt inicial

Lee AGENTS.md, .ai/PROJECT_CONTEXT.md y .ai/TODO.md.

Inspecciona el proyecto AK8CRM.
No modifiques archivos todavía.

Entrega:
1. Stack detectado.
2. Comandos reales disponibles.
3. Variables de entorno requeridas.
4. Módulos activos.
5. Riesgos de Supabase/RLS.
6. Primeras 3 tareas recomendadas.
7. Archivos que deberíamos revisar primero.

## Revisión antes de commit

Revisa los cambios actuales.
No modifiques archivos.

Entrega:
1. Archivos modificados.
2. Qué hace cada cambio.
3. Riesgos.
4. Pruebas recomendadas.
5. Mensaje de commit sugerido.

## Docker dev

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Configura Docker para desarrollo local.
No toques lógica de negocio.
No modifiques `.env` reales.
Usa npm.

Crea o ajusta solamente:
- .dockerignore
- Dockerfile.dev
- docker-compose.yml

Al final intenta:
- docker compose build
- docker compose run --rm web npm run build

Resume archivos modificados y errores si existen.

## Auditar producción

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Necesito preparar validación de producción.
No modifiques archivos.

Entrega checklist para:
1. Migraciones.
2. Índices.
3. Login.
4. Dashboard.
5. Clientes.
6. Agentes.
7. Campañas.
8. Llamadas.
9. RLS.
10. Logs y errores.

## B1-02: Anexar clientes a campaña existente

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Audita `public.import_clients_v1()` y el flujo de importación de clientes.
No modifiques archivos todavía.

Entrega:
1. Archivos SQL relacionados.
2. Componentes frontend relacionados.
3. Cómo funciona actualmente.
4. Riesgos de cambiar la RPC.
5. Recomendación: extender v1 o crear v2.
6. Plan incremental.
7. Pruebas necesarias.

## Implementar B1-02

Aplica el plan aprobado para B1-02.

Reglas:
- Validar operation_id.
- Validar permisos admin+.
- No permitir anexar a campaña de otra operación.
- Mantener creación de campaña nueva.
- Mantener reporte de duplicados.
- No debilitar RLS.
- Ejecutar npm run build.
- Explicar migraciones/RPCs tocadas.

## Movimiento entre campañas

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Audita las RPCs existentes:
- public.move_clients_to_campaign
- public.move_campaign_clients_by_status

No modifiques archivos todavía.

Entrega:
1. Dónde se definen.
2. Qué permisos validan.
3. Qué UI falta.
4. Plan para exponerlo en frontend.
5. Riesgos de operaciones masivas.

## Hardening RLS

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Audita RLS y funciones seguras para:
- clients
- agents
- campaigns

No modifiques archivos todavía.

Entrega:
1. Policies actuales.
2. Funciones SECURITY DEFINER.
3. Permisos EXECUTE.
4. Riesgos cross-tenant.
5. Riesgos cross-operation.
6. Pruebas SQL recomendadas.
7. Plan incremental.

## Refactor Clients

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Refactoriza módulo clients de forma incremental.
No mezcles cambios de Supabase salvo necesidad.

Objetivo:
- Separar tabla.
- Separar filtros.
- Separar detalle.
- Mantener comportamiento.
- Mantener paginación y debounce.
- Ejecutar npm run build.

## Filtros avanzados

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Implementa filtros avanzados compartidos para clientes.
Primero entrega plan.
No modifiques archivos hasta aprobación.

Filtros deseados:
- status_code
- país
- balance
- búsqueda global
- exportación Excel

## Calendar alerts

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Audita `scheduled_calls`.
No crear migraciones todavía.

Entrega:
1. Estado actual.
2. Campos disponibles.
3. UI existente.
4. Plan para alertas de próximas citas.
5. Riesgos de zona horaria.

## Performance audit

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.

Audita performance frontend/Supabase.
No modifiques archivos.

Busca:
- select("*")
- polling agresivo
- queries sin paginación
- comentarios precargados
- llamadas pesadas en mount
- renders innecesarios

Entrega plan incremental.
EOF
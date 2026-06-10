cat > .ai/DECISIONS.md <<'EOF'
# DECISIONS — AK8CRM

## 2026-05-08 — Contexto para agentes

Se crean archivos de contexto para Codex/agentes:
- AGENTS.md
- .ai/PROJECT_CONTEXT.md
- .ai/TODO.md
- .ai/DECISIONS.md
- .ai/CODEX_PROMPTS.md
- .ai/agents/*

Objetivo:
Evitar cambios inseguros en un proyecto multi-tenant con Supabase, RLS y módulos operativos.

## 2026-05-08 — Package manager

Se mantiene npm.

Motivo:
El proyecto usa scripts npm y package.json como fuente principal de comandos.

No migrar a pnpm/yarn sin aprobación.

## 2026-05-08 — Seguridad

Decisión:
El frontend no debe ser fuente de verdad para permisos, tenant ni operación.

La fuente de verdad debe ser:
- Supabase Auth.
- RPCs.
- RLS.
- Funciones SQL/Edge seguras.

## 2026-05-08 — RLS

Decisión:
No debilitar RLS ni policies para arreglar errores rápidos de UI.

Cualquier cambio de RLS debe incluir:
- Tabla afectada.
- Rol afectado.
- Riesgo.
- Prueba positiva.
- Prueba negativa.
- Impacto multi-tenant.

## 2026-05-08 — Importación de clientes

Decisión:
La prioridad funcional inmediata es B1-02: permitir anexar clientes a campaña existente.

Debe conservar:
- Opción crear campaña nueva.
- Detección de duplicados en archivo.
- Detección de duplicados existentes en operación.
- Reporte de errores.

## 2026-05-08 — Movimiento entre campañas

Decisión:
Antes de crear nueva lógica, exponer en frontend las RPCs existentes:
- public.move_clients_to_campaign
- public.move_campaign_clients_by_status

## 2026-05-08 — Calendario

Decisión:
No crear migración inicial de calendario sin revisar primero `scheduled_calls`, porque ya existe soporte de zonas horarias, estados, contexto, índices, triggers y RLS.

## 2026-05-08 — Performance

Decisión:
No reintroducir polling agresivo ni `select("*")` en rutas calientes.

Mantener:
- Debounce.
- Paginación.
- Selects mínimos.
- Modo degradado.
EOF
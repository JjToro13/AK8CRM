cat > .ai/agents/calendar-calls-agent.md <<'EOF'
# Calendar / Calls Agent — AK8CRM

## Rol

Agente especializado en calendario, llamadas, scheduled_calls, timezone y seguimiento comercial.

## Objetivo

Mejorar agenda y alertas sin crear migraciones innecesarias ni romper zonas horarias.

## Debe revisar

- scheduled_calls
- calls
- modules/calendar
- modules/calls
- modules/dashboard
- alertas/notificaciones si existen

## Reglas

- No crear migración inicial si scheduled_calls ya cubre el caso.
- Respetar timezone.
- Respetar estado: planeado, completado, cancelado, pospuesto.
- Mantener contexto cliente/campaña/agente/operación.
- Respetar VITE_ENABLE_CALLS.

## Prompt recomendado

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.
Actúa como Calendar / Calls Agent.

Audita mejora de calendario/llamadas:
1. Campos disponibles.
2. UI existente.
3. Riesgos de timezone.
4. Riesgos de operación/tenant.
5. Plan incremental.
6. Pruebas necesarias.

No modifiques archivos hasta aprobación.
EOF
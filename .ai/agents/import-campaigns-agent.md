cat > .ai/agents/import-campaigns-agent.md <<'EOF'
# Import / Campaigns Agent — AK8CRM

## Rol

Agente especializado en importación de clientes, campañas y movimiento masivo.

## Objetivo

Implementar B1-02 y exponer movimiento entre campañas sin romper duplicados, seriales, operación activa ni RLS.

## Debe revisar

- RPC public.import_clients_v1()
- public.move_clients_to_campaign()
- public.move_campaign_clients_by_status()
- Módulo clients
- Módulo campaigns
- UI de importación
- Migraciones de campaign identity y client uniqueness

## Reglas

- No permitir campaña destino de otra operación.
- Validar admin+.
- Mantener detección de duplicados.
- Mantener reporte de errores.
- Mantener creación de campaña nueva.
- No romper prefijos/seriales existentes.
- Cualquier importación debe respetar operation_id.

## Prompt recomendado

Lee AGENTS.md y .ai/PROJECT_CONTEXT.md.
Actúa como Import / Campaigns Agent.

Audita B1-02:
1. Cómo se importa hoy.
2. Dónde se crea campaña.
3. Cómo se detectan duplicados.
4. Cómo se valida operación.
5. Cómo anexar a campaña existente.
6. Si conviene v2 o extender v1.
7. Pruebas necesarias.

No modifiques archivos hasta aprobación.
EOF
cat > .ai/TODO.md <<'EOF'
# TODO — AK8CRM

## Prioridad 0 — Entorno

- [ ] Confirmar que `npm install` funciona.
- [ ] Confirmar que `npm run dev` levanta.
- [ ] Confirmar que `npm run build` pasa.
- [ ] Confirmar que Supabase local levanta con `supabase start`.
- [ ] Confirmar Docker dev si aplica.
- [ ] Documentar variables `.env`.

## Prioridad 1 — Validar producción

- [ ] Confirmar migraciones aplicadas en producción.
- [ ] Confirmar índices SQL presentes.
- [ ] Smoke test: login.
- [ ] Smoke test: dashboard.
- [ ] Smoke test: clientes.
- [ ] Smoke test: agentes.
- [ ] Smoke test: llamadas.
- [ ] Smoke test: campañas.
- [ ] Verificar logs Supabase.
- [ ] Verificar uso de modo degradado.

## Prioridad 2 — B1-02: Anexar clientes a campaña existente

- [ ] Auditar `public.import_clients_v1()`.
- [ ] Decidir si crear `import_clients_v2` o extender `import_clients_v1`.
- [ ] Permitir campaña destino opcional.
- [ ] Mantener opción de crear campaña nueva.
- [ ] Reutilizar reporte de duplicados.
- [ ] Validar operation_id.
- [ ] Validar permisos admin+.
- [ ] Probar duplicados en archivo.
- [ ] Probar duplicados existentes en operación.
- [ ] Probar operación cruzada no permitida.
- [ ] Actualizar UI de importación.
- [ ] Actualizar documentación.

## Prioridad 3 — Movimiento entre campañas

- [ ] Localizar uso actual de campañas en frontend.
- [ ] Exponer UI para `move_clients_to_campaign`.
- [ ] Exponer UI para `move_campaign_clients_by_status`.
- [ ] Agregar confirmación antes de movimiento masivo.
- [ ] Validar permisos por operación.
- [ ] Mantener reporte de resultado.

## Prioridad 4 — Hardening de seguridad

- [ ] Auditar RLS de `clients`.
- [ ] Auditar RLS de `agents`.
- [ ] Auditar RLS de `campaigns`.
- [ ] Auditar transacciones críticas.
- [ ] Auditar funciones `SECURITY DEFINER`.
- [ ] Verificar `search_path`.
- [ ] Revocar execute público en funciones sensibles si falta.
- [ ] Probar acceso agent/admin/super_admin/dev.
- [ ] Probar intentos cross-tenant.
- [ ] Probar intentos cross-operation.

## Prioridad 5 — Clientes

- [ ] Revisar búsqueda con debounce.
- [ ] Revisar paginación.
- [ ] Revisar importación Excel.
- [ ] Mejorar detalles de cliente.
- [ ] Implementar edición inline si aplica.
- [ ] Mejorar historial visual.

## Prioridad 6 — Filtros avanzados

- [ ] Filtros por status_code.
- [ ] Filtros por país.
- [ ] Filtros por balance.
- [ ] Exportación a Excel.
- [ ] Búsqueda global compartida.

## Prioridad 7 — Calendario y alertas

- [ ] Revisar `scheduled_calls`.
- [ ] Notificaciones de próximas citas.
- [ ] Notificaciones de cambio de estado.
- [ ] Resumen diario por operación.

## Prioridad 8 — Reportes

- [ ] Métricas por agente.
- [ ] Performance de campañas.
- [ ] ROI por cliente/campaña.
- [ ] Reportes exportables.

## Prioridad 9 — Limpieza técnica

- [ ] Eliminar código legado residual.
- [ ] Documentar patrones de módulos.
- [ ] Revisar lazy loading.
- [ ] Revisar code splitting.
- [ ] Evitar imports duplicados.
EOF
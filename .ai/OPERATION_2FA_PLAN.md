# Plan — 2FA por operación con Google Authenticator

## Objetivo

Agregar una capa de verificación en dos pasos configurable por operación desde el panel de administrador.

El owner debe poder:
- Entrar a `/admin`.
- Seleccionar tenant.
- Seleccionar operación.
- Entrar al apartado de seguridad.
- Activar/desactivar verificación por autenticador.
- Generar un QR/secret compatible con Google Authenticator.
- Compartir el código solo con quien él autorice.

La regla funcional deseada es:
- Si una operación tiene 2FA activo, todas las cuentas asociadas a esa operación deben ingresar un código TOTP válido después del login normal.
- El código/secret pertenece a la operación, no a cada usuario individual.

## Aclaración importante

Supabase Auth MFA oficial está diseñado para factores por usuario. Usa TOTP, enrollment, challenge, verify y Authenticator Assurance Level (`aal1` / `aal2`) por sesión de usuario.

La necesidad descrita aquí no es MFA individual nativo de Supabase, sino un segundo factor compartido por operación. Lo podemos implementar con Google Authenticator usando TOTP estándar, pero debemos tratarlo como una capa propia de autorización operativa.

## Riesgos de seguridad

1. Secret compartido
   - Si el secret/código de la operación se filtra, sirve para todas las cuentas de esa operación.
   - No permite saber qué persona concreta tenía el autenticador, solo qué usuario ingresó un código válido.

2. No basta con bloquear solo frontend
   - Si el usuario ya tiene sesión Supabase, un bloqueo visual en React no protege por sí solo queries directas, RPCs o datos expuestos por RLS.
   - La implementación debe planear una fase backend para reforzar el acceso real a datos operativos.

3. Recovery y rotación
   - El owner debe poder regenerar el secret si se filtra.
   - Regenerar debe invalidar verificaciones activas.

4. Auditoría
   - Hay que registrar intentos exitosos y fallidos.
   - Debe haber rate limiting para evitar fuerza bruta de códigos de 6 dígitos.

## Decisión propuesta

Implementar “Operation 2FA” como módulo propio, no como Supabase MFA individual.

Motivo:
- El requerimiento es por operación y con un secret común.
- Supabase MFA oficial obliga a enrollar factores por usuario, lo que no calza con “un autenticador controlado por el owner para toda la operación”.
- Podemos seguir usando Google Authenticator porque TOTP/otpauth es estándar y compatible.

## Modelo de datos propuesto

### `operation_security_settings`

Tabla por operación.

Campos:
- `operation_id uuid primary key references operations(id)`
- `totp_enabled boolean not null default false`
- `totp_secret_encrypted text null`
- `totp_issuer text not null default 'AK8 CRM'`
- `totp_label text null`
- `totp_rotated_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notas:
- No guardar el secret en claro.
- No exponer el secret al frontend salvo durante el enrollment inicial o rotación.
- Usar Edge Function o una función backend segura para generar/validar.

### `operation_2fa_verifications`

Registra verificaciones recientes.

Campos:
- `id uuid primary key default gen_random_uuid()`
- `operation_id uuid not null`
- `agent_id uuid not null`
- `session_id text null`
- `verified_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `secret_version timestamptz null`
- `ip_hash text null`
- `user_agent_hash text null`

Uso:
- Determinar si el usuario ya verificó el código para esa operación.
- Idealmente por sesión, no solo por usuario.
- Validar si Supabase JWT expone un identificador de sesión estable para usarlo en RLS/RPC.

### `operation_2fa_attempts`

Auditoría y rate limiting.

Campos:
- `id uuid primary key default gen_random_uuid()`
- `operation_id uuid not null`
- `agent_id uuid null`
- `attempted_at timestamptz not null default now()`
- `success boolean not null`
- `reason text null`
- `ip_hash text null`
- `user_agent_hash text null`

## Backend / funciones propuestas

### `get_operation_security_settings(p_operation_id uuid)`

Devuelve al panel admin:
- Si 2FA está activo.
- Fecha de rotación.
- Estado de configuración.

No devuelve el secret.

Validación:
- `dev` puede ver todas.
- `owner` solo puede ver operaciones de su tenant.

### `start_operation_totp_enrollment(p_operation_id uuid)`

Solo owner/dev.

Hace:
- Genera secret TOTP.
- Guarda temporalmente o devuelve QR/otpauth para confirmar.
- Devuelve:
  - `otpauth_uri`
  - `qr_svg` o payload para renderizar QR
  - `setup_id`

### `confirm_operation_totp_enrollment(p_operation_id uuid, setup_id uuid, code text)`

Solo owner/dev.

Hace:
- Verifica el primer código del owner.
- Si es válido:
  - Activa `totp_enabled`.
  - Guarda `totp_secret_encrypted`.
  - Setea `totp_rotated_at = now()`.
  - Invalida verificaciones anteriores.

### `disable_operation_totp(p_operation_id uuid)`

Solo owner/dev.

Hace:
- Desactiva TOTP para la operación.
- Puede conservar o borrar secret según política definida.
- Recomiendo borrar secret para reducir riesgo.

### `verify_operation_totp(p_operation_id uuid, code text)`

Usuarios de la operación.

Hace:
- Valida que el usuario pueda acceder a la operación.
- Valida rate limiting.
- Verifica código TOTP contra el secret de la operación.
- Registra intento.
- Si es válido, crea verificación con expiración.

Expiración sugerida:
- 8 a 12 horas para jornada laboral.
- Re-verificar al cambiar de operación si la nueva operación tiene 2FA activo.

## Frontend propuesto

### Panel Admin

Agregar sección “Seguridad” dentro de la operación seleccionada.

Controles:
- Toggle “Autenticador en dos pasos”.
- Estado:
  - No configurado.
  - Pendiente de confirmar.
  - Activo.
  - Desactivado.
- Botón “Configurar autenticador”.
- Botón “Regenerar autenticador”.
- Botón “Desactivar”.

Flujo de activación:
1. Owner presiona “Configurar”.
2. Se muestra QR compatible con Google Authenticator.
3. Owner escanea QR.
4. Owner ingresa código de 6 dígitos.
5. Backend confirma y activa.

### Login / Gate de acceso

Después del login normal y de cargar `my_agent`:
1. Resolver operación activa.
2. Consultar si la operación requiere 2FA.
3. Si requiere y no hay verificación vigente:
   - Mostrar pantalla modal/fullscreen “Verificación de operación”.
   - Pedir código de 6 dígitos.
   - Verificar con backend.
4. Si verifica:
   - Permitir entrar al CRM.

Para `dev`:
- Puede requerirse 2FA si entra a una operación que lo tenga activo.
- Alternativa: permitir bypass solo si se define explícitamente. Recomendación: sin bypass por defecto.

Para `owner`:
- Si su operación activa requiere 2FA, también debe verificar salvo que estemos en flujo de configuración inicial.

## Integración con operación activa

Casos:
- Usuario normal con una sola operación:
  - Se verifica esa operación.
- Owner/dev con selector de operación:
  - Al cambiar de operación, revisar si la nueva operación requiere 2FA.
  - Si requiere y no hay verificación vigente, bloquear hasta verificar.

## Enforcement por fases

### Fase 1 — UI gate operativo

Implementar:
- Panel admin de seguridad.
- QR/confirmación.
- Challenge post-login.
- Verificación con expiración.
- Auditoría de intentos.

Riesgo:
- Protege la experiencia normal, pero no endurece todas las rutas de datos.

### Fase 2 — Backend enforcement

Objetivo:
- Que datos operativos sensibles no salgan si la operación requiere 2FA y no hay verificación vigente.

Opciones:
1. Migrar lecturas críticas a RPCs seguras que validen `operation_2fa_verifications`.
2. Añadir checks en RPCs existentes de clientes/campañas/agentes.
3. Evaluar si se puede usar un `session_id` confiable desde JWT para RLS.

Prioridad de enforcement:
1. `clients`
2. `client_comments`
3. `campaigns`
4. `agents`
5. `calls`
6. `scheduled_calls`

## Preguntas abiertas

1. ¿La verificación debe durar toda la jornada o pedirse en cada login?
2. ¿Owner puede desactivar 2FA sin código actual, o debe validarlo primero?
3. ¿Developer tiene bypass para soporte o también debe ingresar código?
4. ¿Se permitirá recuperar acceso si el owner pierde el autenticador?
5. ¿Cuántos intentos fallidos antes de bloqueo temporal?

## Recomendación inicial

Implementar primero una versión segura pero acotada:

1. Crear tablas `operation_security_settings`, `operation_2fa_verifications`, `operation_2fa_attempts`.
2. Crear Edge Function para generar/verificar TOTP sin exponer secrets.
3. Agregar sección “Seguridad” en `/admin`.
4. Agregar gate post-login y post-cambio de operación.
5. Registrar auditoría y rate limiting básico.
6. Luego endurecer RPCs/lecturas de `clients` y módulos operativos.

## Avance de implementación

### Implementado

- Footer actualizado a `Version (LIVE-BETA) 2.0.22`.
- Aviso visible en `/admin`: cambios en proceso y posibles resultados no deseados.
- Migración inicial:
  - `supabase/migrations/20260511130000_operation_2fa_foundation.sql`
  - Crea `operation_security_settings`.
  - Crea `operation_2fa_verifications`.
  - Crea `operation_2fa_attempts`.
  - Agrega RPCs:
    - `can_access_operation_by_id`
    - `get_operation_security_settings`
    - `get_operation_2fa_status`
- Edge Function:
  - `supabase/functions/operation-2fa/index.ts`
  - Acciones:
    - `get_settings`
    - `start_enrollment`
    - `confirm_enrollment`
    - `disable`
    - `verify`
  - Genera secrets TOTP compatibles con Google Authenticator.
  - Cifra secrets con `OPERATION_2FA_SECRET_KEY`.
  - Registra intentos y verificaciones.
  - Aplica rate limit basico por usuario/operación.
- Panel admin:
  - Sección “Seguridad de operacion”.
  - Configurar/regenerar autenticador.
  - Confirmar con código de 6 dígitos.
  - Desactivar autenticador.
  - QR visual local para `otpauth_uri` usando `qrcode`; no se envia el secret a servicios externos.
- Gate operativo global:
  - `src/shared/security/Operation2faGate.tsx`
  - Consulta `get_operation_2fa_status`.
  - Bloquea la UI si la operación activa requiere 2FA y el usuario no verificó.
  - Verifica códigos contra la Edge Function `operation-2fa`.

### Pendiente inmediato

- Configurar variable segura de Supabase Function:
  - `OPERATION_2FA_SECRET_KEY`
  - No debe ser `VITE_*`.
  - Debe vivir como secret de Supabase Functions.
- Endurecer RPCs/lecturas sensibles para enforcement backend real.

## Fuentes oficiales revisadas

- Supabase Auth MFA overview: https://supabase.com/docs/guides/auth/auth-mfa
- Supabase Auth TOTP MFA: https://supabase.com/docs/guides/auth/auth-mfa/totp
- Supabase JavaScript AAL reference: https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel

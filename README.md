# 📞 Máscara Llamadas - Sistema de Gestión de Inversiones

Sistema completo de gestión de clientes e inversiones con funcionalidades de llamadas enmascaradas, envío de emails y gestión de agentes.

## 🚀 Características Principales

### 🔐 Sistema de Autenticación y Roles
- **Autenticación segura** con Supabase Auth
- **Sistema de roles**: Administradores y Agentes
- **Contraseña de administrador** configurable
- **Protección de datos** con Row-Level Security (RLS)

### 👥 Gestión de Clientes
- **Importación masiva** de clientes desde Excel con detección automática de columnas
- **Sistema de campañas** con numeración única (A0001, B0001, C0001...)
- **Búsqueda avanzada** por nombre o número de serie
- **Estados de cliente** con colores indicativos
- **Historial de comentarios** con autor y fecha por cada comentario
- **Sistema de seguimiento** completo de interacciones
- **Datos sensibles protegidos** (teléfonos y emails solo para admins)
- **Scroll horizontal sticky** para tablas con muchas columnas

### 📞 Sistema de Llamadas
- **Llamadas enmascaradas** con Did-glo-bal
- **Privacidad total**: El número del cliente NO aparece en el softphone (solo serial)
- **Integración con MicroSIP/Zoiper** vía API commoncrm
- **Webhooks automáticos** para finalización de llamadas
- **Grabación automática** de llamadas
- **Historial completo** con filtros
- **Estados de llamada** (en progreso, completada, fallida, sin respuesta)
- **Actualización automática** de estado de clientes

### 📧 Sistema de Emails (Multi-Cuenta)
- **Múltiples cuentas de email** configurables (Soporte, Ventas, Dirección, etc.)
- **Selección de cuenta** por usuario con dropdown intuitivo
- **Preferencias personalizadas** guardadas por usuario
- **Auto-detección** de cuentas configuradas
- **Envío directo** con Nodemailer y SMTP
- **Plantillas profesionales** HTML
- **Restricciones de seguridad** (agentes no ven emails)
- **Escalable**: Añade hasta 10 cuentas de email sin modificar código

### 👨‍💼 Gestión de Agentes
- **Asignación de clientes** por rangos de serie (formato de campaña)
- **Credenciales de Did-glo-bal** por agente (cada agente usa su cuenta)
- **Dashboard específico** para agentes
- **Restricciones de acceso** basadas en roles
- **Gestión centralizada** por administradores
- **Gestión de campañas** para administradores

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **Vite** para desarrollo y build
- **Tailwind CSS** para estilos
- **Lucide React** para iconos
- **React Router** para navegación

### Backend
- **Supabase** como Backend-as-a-Service
- **PostgreSQL** con RLS
- **Edge Functions** para lógica de negocio
- **Storage** para archivos de audio

### Integraciones
- **Did-glo-bal** para llamadas enmascaradas
- **Nodemailer** para envío de emails
- **SMTP** para comunicación directa

## 📋 Requisitos del Sistema

- **Node.js** 18+ 
- **npm** 9+
- **Cuenta de Supabase**
- **Cuenta de Did-glo-bal** (opcional)
- **Proveedor SMTP** (Gmail, Outlook, etc.)

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/mascara-llamadas.git
cd mascara-llamadas
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `env.example` a `.env.local` y configura tus credenciales:

```env
# Configuración de Supabase
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Configuración de Did-glo-bal (para Edge Functions)
DID_GLO_BAL_ACCESS_TOKEN=tu_access_token
DID_GLO_BAL_WEBHOOK_URL=https://tu-proyecto.supabase.co/functions/v1
DID_GLO_BAL_API_URL=https://b.didpbx.com
DID_GLO_BAL_CALLS_URL=https://b.didpbx.com/amocrm/11827/tu_token
DID_GLO_BAL_COMMON_URL=https://b.didpbx.com/commoncrm/11827

# Configuración de Supabase (para Edge Functions)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Configuración de Seguridad
VITE_ADMIN_CREATION_PASSWORD=ADMIN_MASCARA_2024

# Configuración de Encriptación
VITE_ENCRYPTION_KEY=tu_clave_secreta_segura_minimo_32_caracteres

# Configuración de Email
VITE_COMPANY_EMAIL=noreply@callmask.com
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=tu_email@gmail.com
VITE_SMTP_PASS=tu_app_password
```

### 4. Configurar Base de Datos
Ejecuta el script SQL completo en tu proyecto de Supabase:

```bash
supabase/migrations/complete_database_structure.sql
```

La base de datos incluye:
- **Tabla `agents`**: Gestión de usuarios y roles
- **Tabla `clients`**: Datos de clientes e inversiones (con sistema de campañas)
- **Tabla `calls`**: Historial de llamadas
- **Tabla `agent_assignments`**: Asignaciones de clientes
- **Tabla `email_logs`**: Registro completo de emails enviados (incluye cuenta usada y email origen)
- **Tabla `agent_did_credentials`**: Credenciales encriptadas de Did-glo-bal
- **Tabla `client_comments`**: Historial de comentarios con autor y fecha

**Nota**: El archivo SQL está completamente actualizado y replicará exactamente la estructura actual de la base de datos.

### 5. Configurar Edge Functions
Las siguientes Edge Functions están incluidas:

- **`start-call`**: Inicia llamadas con Did-glo-bal (con parámetro CID para privacidad)
- **`call-ended-v2`**: Procesa webhooks de finalización (verify_jwt: false)
- **`register-user`**: Registro de usuarios con validación de código de invitación
- **`import-clients`**: Importación masiva de clientes con sistema de campañas
- **`send-email`**: Envío de emails con Nodemailer (multi-cuenta)
- **`get-email-accounts`**: Auto-detección de cuentas de email configuradas

### 6. Ejecutar la Aplicación
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🔧 Configuración Detallada

### Configuración de Did-glo-bal

**Configuración en Panel de Did-Glo-bal:**

1. **Integrations → Webhooks:**
   - WebHook URL: `https://tu-proyecto.supabase.co/functions/v1/call-ended-v2`
   - ✅ Send call start event: `yes`
   - ✅ Send call stop event: `yes`
   - ✅ Data format: `html-form`

2. **Variables de Entorno Críticas:**
   ```env
   DID_GLO_BAL_ACCESS_TOKEN=oedNbOjtfsI_Wq9GdkxTWRQ-1752768458
   DID_GLO_BAL_ACCESS_CODE=11827
   DID_GLO_BAL_WEBHOOK_URL=https://tu-proyecto.supabase.co/functions/v1/call-ended-v2
   ```
   
   ⚠️ **IMPORTANTE**: El token debe tener la 'I' mayúscula en posición 11, NO 'l' minúscula.

3. **Softphone (MicroSIP/Zoiper):**
   - Usuario/Login: `11827.107` (access_code.extension)
   - Servidor: `b.didpbx.com`
   - Transporte: UDP
   - Puerto: 5060

**Privacidad:** El sistema usa el parámetro `cid` para mostrar solo el serial del cliente (ej: A0001) en lugar del número completo en el softphone.

**Ver documentación completa**: `CHANGELOG_DID_GLOBAL_FIXES.md`

### Configuración de Email (Multi-Cuenta)

El sistema soporta múltiples cuentas de email que los usuarios pueden seleccionar al enviar emails a clientes.

#### Configuración de Cuentas

Para añadir una cuenta de email, añade las siguientes variables en Supabase Secrets (Settings → Edge Functions → Secrets):

```env
# Cuenta 1: Soporte
SMTP_NAME_1=Soporte
SMTP_HOST_1=mail.privateemail.com
SMTP_PORT_1=587
SMTP_USER_1=soporte@tuempresa.com
SMTP_PASS_1=tu_password
SMTP_FROM_1=soporte@tuempresa.com

# Cuenta 2: Departamento de Ventas
SMTP_NAME_2=Departamento de Ventas
SMTP_HOST_2=mail.privateemail.com
SMTP_PORT_2=587
SMTP_USER_2=ventas@tuempresa.com
SMTP_PASS_2=tu_password_ventas
SMTP_FROM_2=ventas@tuempresa.com

# Cuenta 3: Dirección
SMTP_NAME_3=Dirección
SMTP_HOST_3=mail.privateemail.com
SMTP_PORT_3=587
SMTP_USER_3=direccion@tuempresa.com
SMTP_PASS_3=tu_password_direccion
SMTP_FROM_3=direccion@tuempresa.com
```

**Características**:
- ✅ Auto-detección: El sistema detecta automáticamente las cuentas configuradas
- ✅ Preferencias por usuario: Cada agente/admin puede elegir su cuenta preferida
- ✅ Escalable: Soporta hasta 10 cuentas (solo añade más variables)
- ✅ Dropdown intuitivo: Selección fácil desde el modal de email

#### Proveedores SMTP Soportados

##### Gmail
1. Habilitar autenticación de 2 factores
2. Generar contraseña de aplicación
3. Host: `smtp.gmail.com`, Port: `587`

##### Outlook
- Host: `smtp-mail.outlook.com`, Port: `587`

##### Yahoo
- Host: `smtp.mail.yahoo.com`, Port: `587`

##### PrivateEmail (Namecheap)
- Host: `mail.privateemail.com`, Port: `587`

## 📊 Estructura de Datos

### Columnas de Importación Excel
La base de datos acepta las siguientes columnas para importación desde archivos Excel. El sistema detecta automáticamente los nombres de columnas (en español o inglés):

| Campo en BD | Nombres Aceptados | Descripción |
|-------------|-------------------|-------------|
| `first_name` | `nombre`, `primer nombre`, `firstname`, `first name` | Nombre del cliente |
| `last_name` | `apellido`, `segundo nombre`, `lastname`, `last name`, `surname` | Apellido del cliente |
| `email` | `correo`, `email`, `e-mail` | Dirección de correo electrónico |
| `phone_number` | `teléfono`, `telefono`, `phone`, `phone number` | Número de teléfono |
| `country` | `país`, `pais`, `country` | País del cliente |
| `source` | `empresa`, `source`, `fuente` | Fuente o empresa |
| `funnel` | `funnel`, `embudo` | Embudo de conversión |
| `deposit_amount` | `deposit_amount`, `monto depositado`, `monto`, `deposito`, `deposit amount` | Monto depositado |
| `net_deposit` | `net_deposit`, `deposito neto`, `net deposit` | Depósito neto |
| `user_balance` | `user_balance`, `balance usuario`, `balance`, `user balance` | Balance del usuario |
| `investment_date` | `fecha inversión`, `fecha_inversion`, `investment_date`, `investment date` | Fecha de inversión (YYYY-MM-DD) |

**Notas importantes:**
- Las columnas pueden estar en **cualquier orden** en el archivo Excel
- Si falta alguna columna, se dejará **vacía** (no se mezclarán datos)
- Las columnas `comentarios`, `color` y `serie` **NO se deben incluir** (se generan automáticamente)
- El sistema es **case-insensitive** (no distingue mayúsculas/minúsculas)
- **Soporte para listas grandes**: El sistema procesa listas de hasta 10,000+ clientes sin problemas

### Sistema de Campañas
Cada lista importada se asigna automáticamente a una campaña única:
- **Primera lista**: Prefijo `A` (A0001, A0002, A0003...)
- **Segunda lista**: Prefijo `B` (B0001, B0002, B0003...)
- **Tercera lista**: Prefijo `C` (C0001, C0002, C0003...)
- Y así sucesivamente hasta la Z, luego AA, AB, etc.

**Gestión de campañas** (solo administradores):
- Ver todas las campañas activas
- Eliminar campañas completas
- Estadísticas de cada campaña

### Estados de Cliente

#### Asignación Automática (Solo desde estado GRIS)
- **🔘 Gris**: Sin contactar (estado inicial, ≤5 intentos sin respuesta)
- **🟢 Verde**: Contacto exitoso (solo si estaba en gris y respondió)
- **🔴 Rojo**: Múltiples intentos (solo si estaba en gris y >5 intentos sin respuesta)

#### Asignación Manual (Admins y Agentes)
- **🟡 Amarillo**: No desea ser contactado (solo manual)
- **🔵 Azul**: En proceso de venta (solo manual)

#### Regla Importante
⚠️ **Los colores asignados manualmente NUNCA se cambian automáticamente**. Una vez que un cliente tiene un color manual (azul, amarillo, verde manual, rojo manual), el sistema solo actualiza el contador de intentos pero NO cambia el color aunque se hagan más llamadas.

### Estados de Llamada
- **En progreso**: Llamada activa
- **Completada**: Llamada exitosa
- **Fallida**: Error en la llamada
- **Sin respuesta**: Cliente no respondió

## 🔒 Seguridad

### Row-Level Security (RLS)
- **Agentes**: Solo ven datos limitados (sin teléfonos/emails)
- **Administradores**: Acceso completo a todos los datos
- **Políticas optimizadas** para rendimiento

### Protección de Datos
- **Emails ocultos** para agentes (no visibles en CRM)
- **Teléfonos ocultos** para agentes (no visibles en CRM)
- **Números ocultos en softphone** (muestra solo serial del cliente - ej: A0001)
- **Parámetro CID** de Did-Glo-bal para privacidad total
- **Validación de permisos** en frontend y backend
- **Logs de auditoría completos**:
  - Registro de todas las llamadas realizadas
  - Registro de todos los emails enviados (incluye cuenta usada y email origen)
  - Trazabilidad completa de acciones por agente

## 📱 Uso de la Aplicación

### Para Administradores
1. **Crear cuenta** con contraseña de administrador
2. **Gestionar agentes** y asignaciones
3. **Configurar credenciales de Did-glo-bal** por agente
4. **Importar clientes** masivamente
5. **Ver todos los datos** y estadísticas
6. **Enviar emails** a cualquier cliente

### Para Agentes
1. **Registrarse** directamente
2. **Ver clientes asignados** únicamente
3. **Realizar llamadas** enmascaradas
4. **Enviar emails** (sin ver dirección)
5. **Añadir comentarios** y seguimiento

## 🚀 Despliegue

### Variables de Entorno de Producción
```env
# Configuración de producción
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_produccion
VITE_ADMIN_CREATION_PASSWORD=contraseña_segura_produccion
VITE_COMPANY_EMAIL=contacto@tuempresa.com
```

### Build para Producción
```bash
npm run build
```

### Despliegue en Vercel/Netlify
1. Conectar repositorio
2. Configurar variables de entorno
3. Desplegar automáticamente

## 📈 Monitoreo y Logs

### Logs de Supabase
- **Edge Functions**: Logs de llamadas y emails
- **Database**: Logs de consultas y errores
- **Auth**: Logs de autenticación

### Métricas Importantes
- **Llamadas realizadas** por agente
- **Emails enviados** por agente
- **Clientes contactados** exitosamente
- **Tiempo promedio** de llamadas

## 🐛 Solución de Problemas

### Error: "Faltan variables de entorno"
- Verificar archivo `.env.local`
- Reiniciar servidor de desarrollo

### Error: "Agente no encontrado"
- Usuario debe estar en tabla `agents`
- Verificar ID de usuario

### Error de permisos
- Verificar rol del usuario
- Revisar políticas RLS

### Llamadas no funcionan
- Verificar token de Did-Glo-bal (debe tener 'I' mayúscula, no 'l' minúscula)
- Revisar webhook configurado en panel de Did-Glo-bal
- Verificar que `verify_jwt: false` en Edge Function `call-ended-v2`
- Comprobar que softphone está conectado (verde)
- Ver `CHANGELOG_DID_GLOBAL_FIXES.md` para troubleshooting completo

### Emails no se envían
- Verificar que la cuenta seleccionada esté configurada en Supabase Secrets
- Comprobar que todas las variables SMTP_{N} estén presentes (NAME, HOST, PORT, USER, PASS, FROM)
- Verificar contraseña de aplicación del proveedor SMTP
- Revisar logs de Edge Function `send-email`
- Probar con función `get-email-accounts` para ver qué cuentas detecta el sistema

## 📚 Documentación Adicional

- **Configuración de Email**: `documentacion/CONFIGURACION_EMAIL.md`
- **Configuración de Did-glo-bal**: `documentacion/CONFIGURACION_DID_GLO_BAL.md`

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama de feature
3. Commit de cambios
4. Push a la rama
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- **Email**: soporte@callmask.com
- **Documentación**: Ver carpeta `documentacion/`
- **Issues**: GitHub Issues

## 🎉 ¡Aplicación Lista y 100% Funcional!

La aplicación está completamente funcional, probada y lista para producción:

- ✅ Base de datos optimizada con RLS
- ✅ Sistema de autenticación robusto
- ✅ Interfaz moderna y responsive
- ✅ **Llamadas funcionando perfectamente** con Did-Glo-bal
- ✅ **Privacidad total**: Números ocultos en softphone (parámetro CID)
- ✅ **Webhooks operativos**: Actualización automática de estados
- ✅ **Sistema de emails multi-cuenta** con selección y preferencias por usuario
- ✅ Gestión de agentes avanzada
- ✅ Sistema de campañas con numeración única
- ✅ Importación masiva de Excel con detección automática
- ✅ Scroll horizontal sticky para tablas
- ✅ Gestión de campañas para administradores
- ✅ **Documentación completa** de troubleshooting

### 🔧 Configuración Mínima Requerida

1. Variables de entorno en `.env.local`
2. Webhook configurado en Did-Glo-bal
3. Softphone conectado (MicroSIP/Zoiper)
4. Token correcto de Did-Glo-bal (con 'I' mayúscula)

### 📖 Documentación Técnica

- **Configuración completa**: `CHANGELOG_DID_GLOBAL_FIXES.md`
- **Troubleshooting**: Ver CHANGELOG para soluciones a problemas comunes
- **Estado del sistema**: Versión 35 (con privacidad CID)

¡Sistema probado y 100% operativo para producción! 🚀
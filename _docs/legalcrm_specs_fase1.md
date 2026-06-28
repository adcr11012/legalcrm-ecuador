# LegalCRM Ecuador — Especificaciones Técnicas Fase 1

## Contexto del producto

Software de gestión de casos legales (SaaS) para el mercado ecuatoriano. Dirigido a abogados independientes, estudios jurídicos, departamentos legales de empresas y personas naturales con casos activos.

El caso es el eje central del sistema. Clientes y abogados son roles opcionales asignables a cada caso. Una misma persona puede tener múltiples roles simultáneos.

---

## Stack tecnológico

- **Frontend:** React + TypeScript + Vite
- **Estilos:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS)
- **Iconos:** Tabler Icons
- **Deploy:** Vercel
- **Email:** Resend (notificaciones básicas)

---

## Modelo de datos

### workspaces
```
id uuid PK
nombre text
plan text DEFAULT 'free'
created_at timestamptz
```

### users (extendido de auth.users)
```
id uuid PK (= auth.users.id)
workspace_id uuid FK → workspaces
nombre text
email text
es_admin boolean DEFAULT false
created_at timestamptz
```

### casos
```
id uuid PK
workspace_id uuid FK → workspaces
titulo text NOT NULL
materia text (civil|laboral|familia|penal|mercantil|otro)
estado text DEFAULT 'nuevo' (nuevo|activo|en_espera|audiencia_proxima|resuelto|archivado)
numero_causa text
juzgado text
fecha_inicio date
nota_interna text
created_by uuid FK → users
created_at timestamptz
updated_at timestamptz
```

### caso_personas
```
id uuid PK
caso_id uuid FK → casos
user_id uuid FK → users (nullable)
nombre_externo text (si la persona no tiene cuenta)
email_externo text
rol text (abogado|cliente|otro)
created_at timestamptz
```

### documentos
```
id uuid PK
caso_id uuid FK → casos
nombre text
drive_file_id text
drive_url text
visibilidad text DEFAULT 'privado' (privado|compartido)
subido_por uuid FK → users
created_at timestamptz
```

### plazos
```
id uuid PK
caso_id uuid FK → casos
titulo text
descripcion text
fecha date NOT NULL
tipo text (audiencia|plazo|otro)
alertado boolean DEFAULT false
created_at timestamptz
```

### historial
```
id uuid PK
caso_id uuid FK → casos
user_id uuid FK → users
accion text
detalle text
created_at timestamptz
```

### clientes
```
id uuid PK
workspace_id uuid FK → workspaces
nombre text NOT NULL
tipo text (persona_natural|empresa)
email text
telefono text
estado text DEFAULT 'activo' (activo|inactivo|potencial)
etiquetas text[]
notas text
created_at timestamptz
updated_at timestamptz
```

### cliente_notas
```
id uuid PK
cliente_id uuid FK → clientes
user_id uuid FK → users
contenido text
created_at timestamptz
```

---

## Row Level Security (RLS)

Todas las tablas tienen RLS activado. Las políticas base:

- Un usuario solo puede ver datos de su workspace
- Los casos tienen visibilidad según rol:
  - Admin: ve todos los casos del workspace
  - Abogado: ve solo los casos donde está en caso_personas con rol='abogado'
  - Cliente: ve solo los casos donde está en caso_personas con rol='cliente'
- Los documentos con visibilidad='privado' solo los ven admin y abogados del caso
- Los documentos con visibilidad='compartido' los ve también el cliente del caso

---

## Estructura de rutas

```
/login               → Inicio de sesión
/register            → Registro + creación de workspace
/invite/:token       → Aceptar invitación al workspace

/dashboard           → Dashboard principal
/casos               → Lista de casos (vista lista por defecto)
/casos/:id           → Detalle del caso
/clientes            → Lista de clientes
/clientes/:id        → Detalle del cliente
/agenda              → Calendario y eventos
/usuarios            → Gestión de usuarios del workspace
/configuracion       → Configuración del workspace
```

---

## Funcionalidades por pantalla

### /login y /register
- Login con email + contraseña via Supabase Auth
- Register crea usuario + workspace en una transacción
- Redirect automático si ya hay sesión activa
- Manejo de errores con mensajes claros

### /dashboard
- 4 métricas: casos activos, audiencias próximas (≤7 días), clientes activos, documentos
- Feed de actividad reciente (últimas 10 entradas del historial)
- Tabla de carga por abogado (casos asignados por persona)
- Distribución de casos por estado (conteos simples)

### /casos — Vista lista
- Sidebar izquierdo: lista de casos con búsqueda y filtro por estado/materia
- Panel derecho: detalle del caso seleccionado
- El caso seleccionado persiste al cambiar filtros
- 5 pestañas en el detalle: Información, Documentos, Plazos, Historial, Notas

### /casos — Vista kanban
- 6 columnas: Nuevo, Activo, En espera, Audiencia próxima, Resuelto, Archivado
- Cada tarjeta muestra: título, materia, abogado asignado, estado, alerta si hay novedad
- Clic en tarjeta abre modal con las mismas 5 pestañas del detalle
- Drag & drop para mover entre columnas (actualiza estado en DB)

### Detalle del caso — pestaña Información
- Campos: número de causa, fecha inicio, juzgado, última novedad, estado
- Sección personas: chips con avatar, nombre y rol
- Botón añadir persona: busca usuarios del workspace o ingresa externo por email
- Cambiar estado del caso desde un selector

### Detalle del caso — pestaña Documentos
- Lista de documentos con nombre, fecha, quién subió, visibilidad
- Botón subir: abre Google Drive Picker (Fase 2) — por ahora solo registra metadata manual
- Toggle privado/compartido por documento
- Botones ver (abre URL) y descargar

### Detalle del caso — pestaña Plazos
- Lista de plazos ordenada por fecha
- Indicador visual de urgencia: rojo ≤2 días, naranja ≤7 días, gris el resto
- Botón añadir plazo: modal con título, descripción, fecha, tipo
- Botón de alarma por plazo individual

### Detalle del caso — pestaña Historial
- Timeline cronológico descendente
- Cada entrada: dot de color, acción, quién, cuándo
- Entradas automáticas en: crear caso, cambiar estado, subir doc, agregar plazo, asignar persona
- No editable

### Detalle del caso — pestaña Notas
- Textarea libre para nota interna
- Botón guardar — guarda en campo nota_interna del caso
- Solo visible para admin y abogados (no para cliente)

### /clientes
- Grid de tarjetas de clientes
- Cada tarjeta: avatar con iniciales, nombre, tipo, casos activos, etiquetas, estado, última interacción
- Filtro por estado (activo/inactivo/potencial)
- Botón nuevo cliente

### /clientes/:id
- Ficha completa: datos de contacto, estado, etiquetas
- Lista de casos vinculados
- Bitácora de interacciones (cliente_notas) con fecha y contenido
- Botón agregar nota a la bitácora

### /agenda
- Panel izquierdo: calendario mensual con días marcados si tienen eventos
- Panel derecho: lista de eventos próximos agrupados por fecha
- Fuente de datos: tabla plazos
- Indicador de urgencia igual que en el detalle del caso

### /usuarios
- Tabla de usuarios del workspace con nombre, email, rol, casos asignados, último acceso
- Botón invitar usuario: envía email con link de invitación
- Cambiar rol de usuario (admin/abogado/cliente)
- Eliminar usuario (con confirmación)
- Nota visible: el rol Admin puede otorgarse a cualquier usuario

### /configuracion
- Nombre del workspace (editable)
- Plan actual
- Estado de conexión Google Drive (Fase 2)
- Configuración de notificaciones: email on/off, días de anticipación para alertas

---

## Componentes compartidos

### Layout principal
- Nav lateral fijo 220px con logo, menú, usuario
- Topbar con título de sección, toggle lista/kanban (solo en casos), botón de acción
- Área de contenido que ocupa el resto de la pantalla sin scroll en el contenedor principal

### Sistema de notificaciones
- Toast para confirmaciones y errores (esquina inferior derecha)
- Badge en nav para audiencias próximas

### Modal genérico
- Overlay oscuro, modal centrado
- Header con título, badges y botones de acción
- Cierre con ESC o clic fuera

---

## Lógica de permisos en UI

```
Admin
├── Ve todos los casos
├── Ve todos los clientes
├── Gestiona usuarios
├── Puede crear/editar/archivar cualquier cosa
└── Ve notas internas

Abogado
├── Ve solo sus casos asignados
├── Ve clientes de sus casos
├── Puede editar sus casos asignados
├── Ve notas internas
└── NO gestiona usuarios ni workspace

Cliente
├── Ve solo sus propios casos
├── Solo ve documentos compartidos
├── NO ve notas internas
├── NO puede editar nada
└── Solo puede subir documentos propios
```

---

## Historial automático — triggers

Registrar automáticamente en tabla historial:
- Caso creado
- Estado cambiado (de X a Y)
- Persona asignada (nombre + rol)
- Documento subido (nombre)
- Plazo agregado (título + fecha)
- Nota guardada

---

## Alertas de plazos

Job que corre diariamente (Supabase Edge Function o cron):
- Busca plazos con fecha en los próximos 3 días donde alertado = false
- Envía email via Resend al abogado asignado y al admin
- Marca alertado = true

---

## Diseño visual

Replicar exactamente el diseño del archivo legalcrm_demo.html adjunto:
- Colores base: fondo #f8f7f4, superficies #ffffff, acento #1a4a8a
- Tipografía: system-ui / -apple-system
- Bordes: rgba(0,0,0,0.09) — sutiles
- Border radius: 10px para cards, 6px para elementos pequeños
- Sin sombras decorativas — solo sombra funcional en modales

---

## Orden de construcción sugerido

1. Setup proyecto (Vite + React + TypeScript + Tailwind + Supabase)
2. Auth (login, register, sesión)
3. Layout principal y navegación
4. Modelo de datos en Supabase + RLS
5. CRUD de casos + historial automático
6. Vista lista de casos + detalle con 5 pestañas
7. Vista kanban con drag & drop
8. CRUD de plazos + indicadores de urgencia
9. CRUD de clientes + bitácora
10. Dashboard con métricas reales
11. Gestión de usuarios e invitaciones
12. Agenda (consumiendo tabla plazos)
13. Job de alertas por email
14. Configuración del workspace
15. Pulido visual + responsive mobile

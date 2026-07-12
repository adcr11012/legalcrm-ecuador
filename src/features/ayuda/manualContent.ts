export type SeccionManual = {
  id: string
  titulo: string
  icono: string
  contenido: string[]
}

// Fuente única del manual de TSADOQ. Se usa tanto en la página /ayuda
// (visible para el usuario) como en el system prompt de Temis (workspace-ia),
// para que la IA pueda responder preguntas de uso con la misma información.
export const MANUAL: SeccionManual[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    icono: 'ti-layout-dashboard',
    contenido: [
      'Es la pantalla de inicio. Muestra un resumen de tus casos activos, los plazos y audiencias más próximos, y accesos rápidos a lo que necesitas revisar primero.',
      'Si eres administrador o master, también ves un panorama general del workspace (todos los casos, no solo los tuyos).',
    ],
  },
  {
    id: 'casos',
    titulo: 'Casos',
    icono: 'ti-briefcase',
    contenido: [
      'El corazón de la aplicación. Cada caso agrupa personas (usuarios y clientes), documentos, plazos, tareas, comentarios y — si aplica — corte de cuentas.',
      'Vista Lista o Kanban: se cambia con el botón junto al título "Casos" en la parte superior. Kanban organiza los casos por etapa (columnas), Lista permite filtrar y ordenar.',
      'Filtros disponibles en la lista: urgencia (según el plazo más próximo), materia (civil, laboral, familia, penal, mercantil, otro), etapa y orden.',
      'Dentro de un caso hay pestañas: Info (datos generales, personas asignadas), Documentos (con Google Drive), Plazos/Agenda, Tareas, Comentarios, Historial y Pagos (corte de cuentas: anticipos, gastos, horas facturables).',
      'Solo usuarios con rol Administrador o Master pueden crear o eliminar casos. Un usuario Limitado solo ve y trabaja en los casos donde fue asignado explícitamente.',
      'Etiquetas: se pueden agregar etiquetas libres a un caso para clasificarlo más allá de la materia/etapa.',
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    icono: 'ti-users',
    contenido: [
      'Registro de las personas o empresas que son clientes del despacho, independiente de si tienen una cuenta de usuario en el sistema (normalmente no la tienen).',
      'Cada cliente puede estar vinculado a uno o varios casos. Desde la ficha del cliente se ve el historial de casos asociados y notas internas.',
    ],
  },
  {
    id: 'agenda',
    titulo: 'Agenda',
    icono: 'ti-calendar',
    contenido: [
      'Vista consolidada de plazos y tareas de todos tus casos, organizados por fecha.',
      'Un plazo puede sincronizarse con Google Calendar (si está conectado en Configuración): se crea el evento, se invita a las personas del caso o a invitados externos, y se pueden activar recordatorios escalonados por correo (30 días, 8 días y 48 horas antes).',
      'Las tareas son pendientes internos sin necesariamente una fecha límite en el calendario judicial (ej. "revisar expediente", "llamar al cliente").',
      'Un plazo vencido sin marcarse como completado queda visible como alerta.',
    ],
  },
  {
    id: 'buscar-reportes',
    titulo: 'Buscar / Reportes',
    icono: 'ti-search',
    contenido: [
      'Buscar: búsqueda global multi-palabra sobre casos, clientes, usuarios, documentos y agenda (plazos/tareas) al mismo tiempo. Escribe varias palabras y el sistema busca coincidencias con todas ellas (no basta con una).',
      'Reportes: se activa con el botón "Reportes" junto a la barra de búsqueda. Permite filtrar casos por fecha, materia, etapa, usuario asignado, cliente y estado (abierto/cerrado), con totales de horas facturadas, montos, anticipos, gastos y plazos/tareas pendientes.',
      'El botón "Exportar a Excel (CSV)" descarga los resultados filtrados en un archivo que Excel abre directamente.',
      'Un usuario con rol Limitado puede usar tanto Buscar como Reportes, pero los resultados solo incluyen sus propios casos asignados — nunca ve información de casos ajenos.',
    ],
  },
  {
    id: 'documentos-drive',
    titulo: 'Documentos y Google Drive',
    icono: 'ti-brand-google-drive',
    contenido: [
      'Los documentos de cada caso se guardan en una carpeta de Google Drive del propio despacho (no en los servidores de TSADOQ), organizada automáticamente por caso.',
      'Para usar esta función, un Administrador debe conectar la cuenta de Google Drive del despacho en Configuración > Drive.',
      'TSADOQ puede leer el contenido de texto de los documentos subidos para que la IA (Temis) los use como contexto al responder preguntas sobre ese caso específico.',
      'Si un PDF se descarga en vez de abrirse en el visor al hacer clic, normalmente es una configuración del propio navegador Chrome del usuario ("Descargar siempre los PDFs"), no un problema de la aplicación.',
    ],
  },
  {
    id: 'satje',
    titulo: 'SATJE (consulta judicial automática)',
    icono: 'ti-gavel',
    contenido: [
      'SATJE es el sistema de consulta de causas del Consejo de la Judicatura de Ecuador. TSADOQ puede detectar automáticamente novedades (nuevos movimientos) en los casos que tengan número de causa registrado.',
      'Este proceso es centralizado: lo administra el dueño/superadministrador del sistema, no cada despacho por separado. Basta con activar la sincronización SATJE en Configuración de tu workspace para empezar a recibir avisos de novedades en la campanita y en el historial de cada caso.',
      'No se guarda el expediente completo ni los documentos judiciales, solo un registro descriptivo de cada movimiento detectado.',
    ],
  },
  {
    id: 'calculadora-laboral',
    titulo: 'Calculadora Laboral',
    icono: 'ti-calculator',
    contenido: [
      'Calcula la liquidación/finiquito de un trabajador según el Código del Trabajo de Ecuador: décimo tercero, décimo cuarto, vacaciones no gozadas, fondos de reserva, bonificación por desahucio e indemnización por despido intempestivo.',
      'Incluye protecciones especiales cuando aplican: embarazo/lactancia, dirigente sindical, discapacidad (propia o de un dependiente a cargo).',
      'Permite marcar si el décimo tercero, décimo cuarto o los fondos de reserva ya se pagan mensualizados junto con el sueldo, para no calcularlos dos veces.',
      'No aplica para empleados del sector público (se rigen por LOSEP) ni para relaciones de servicios profesionales/honorarios.',
      'Disponible para todos los roles, en el menú lateral.',
    ],
  },
  {
    id: 'soporte',
    titulo: 'Soporte',
    icono: 'ti-lifebuoy',
    contenido: [
      'Para reportar un problema o hacer una consulta al equipo de TSADOQ. Se puede adjuntar una captura de pantalla y elegir una categoría.',
      'Cada ticket tiene un cronómetro de 24 horas y se puede reabrir si el problema persiste después de que se marque como resuelto.',
    ],
  },
  {
    id: 'anuncios',
    titulo: 'Anuncios',
    icono: 'ti-speakerphone',
    contenido: [
      'Solo para Administradores. Permite enviar comunicados internos a todo el workspace, a un grupo específico o a usuarios puntuales.',
      'Un anuncio puede expirar automáticamente por fecha o cuando todos los destinatarios lo hayan leído.',
    ],
  },
  {
    id: 'usuarios-roles',
    titulo: 'Usuarios y roles',
    icono: 'ti-user-shield',
    contenido: [
      'Solo para Administradores. Permite invitar nuevos usuarios al workspace (por correo) y asignarles un rol.',
      'Roles: Administrador (control total del workspace, incluida la configuración), Master (ve y gestiona todos los casos pero no la configuración del workspace ni la gestión de usuarios), Limitado (solo ve y trabaja en los casos donde fue asignado explícitamente).',
      'Los usuarios se agrupan opcionalmente en Grupos, útil para asignar varios usuarios a un caso de una sola vez o para dirigir anuncios a un equipo específico.',
    ],
  },
  {
    id: 'configuracion',
    titulo: 'Configuración',
    icono: 'ti-settings',
    contenido: [
      'Solo para Administradores. Desde aquí se conecta Google Drive (documentos), se activa la sincronización SATJE, se configuran las etapas del flujo de casos (Kanban), y se gestionan otras integraciones del workspace (IA, visión de documentos).',
      'También incluye la reconexión/reconciliación de Drive si se cambia de cuenta de Google, sin perder la organización de carpetas existente.',
    ],
  },
  {
    id: 'temis-ia',
    titulo: 'Temis (Asistente de IA)',
    icono: 'ti-brain',
    contenido: [
      'Temis es la asistente de inteligencia artificial integrada en TSADOQ. Puede responder preguntas sobre tus casos, clientes y plazos próximos, explicar conceptos de liquidación laboral (sin calcular montos finales — eso lo hace siempre la Calculadora Laboral), y ayudarte a usar la aplicación.',
      'Dentro de un caso específico, Temis puede leer el contenido de los documentos subidos a Drive para responder preguntas puntuales sobre ese expediente.',
      'Para usarla, un Administrador debe conectar la IA (Groq) en Configuración.',
    ],
  },
]

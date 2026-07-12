export type SeccionManual = {
  id: string
  titulo: string
  icono: string
  contenido: string[]
}

// Fuente única del manual de TSADOQ. Se usa en la página /ayuda (visible
// para el usuario) y como base del conocimiento de uso que tiene Temis
// (workspace-ia) para poder ayudar a las personas que le pregunten.
export const MANUAL: SeccionManual[] = [
  {
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    icono: 'ti-rocket',
    contenido: [
      'TSADOQ es un gestor de casos legales pensado para despachos de abogados: organiza casos, clientes, documentos, plazos judiciales y comunicación interna en un solo lugar, con un asistente de inteligencia artificial (Temis) integrado en toda la aplicación.',
      'Cada despacho tiene su propio "workspace" (espacio de trabajo) completamente independiente y privado — nadie de otro despacho puede ver tus casos, clientes ni documentos.',
      'Roles dentro de un workspace: Administrador (control total: usuarios, configuración, anuncios, y todos los casos), Master (ve y gestiona todos los casos del workspace, pero no accede a Usuarios, Anuncios ni Configuración), y Limitado (solo ve y trabaja en los casos donde fue asignado explícitamente por un Administrador o Master).',
      'Si eres Administrador y es la primera vez que usas el sistema, el orden recomendado es: 1) Conectar Google Drive en Configuración (para poder subir documentos), 2) Revisar/ajustar las etapas del Kanban de casos, 3) Invitar a tu equipo desde Usuarios y roles, 4) Crear tu primer caso.',
      'El botón de Ayuda (ícono de interrogación "?" en la barra superior, junto a la campana de notificaciones y el ícono de Temis) te trae de vuelta a este manual desde cualquier pantalla. También puedes simplemente preguntarle a Temis "¿cómo hago tal cosa?" y te va a explicar usando esta misma información.',
    ],
  },
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    icono: 'ti-layout-dashboard',
    contenido: [
      'Es la pantalla de inicio, la primera que ves al entrar. Da un panorama rápido de tu situación actual sin tener que ir caso por caso.',
      'Muestra: número de casos activos, plazos y audiencias más próximos (ordenados por fecha, para que veas primero lo más urgente), y accesos directos a las secciones que más se usan.',
      'Si eres Administrador o Master, el resumen incluye todos los casos del workspace. Si eres Limitado, solo ves lo relacionado a los casos donde estás asignado.',
      'No requiere configuración — funciona automáticamente con los datos que ya existen en tus casos y agenda.',
    ],
  },
  {
    id: 'casos',
    titulo: 'Casos',
    icono: 'ti-briefcase',
    contenido: [
      'Es el módulo central de la aplicación. Cada caso es un expediente digital que agrupa toda la información relacionada: personas involucradas, documentos, plazos, tareas, comentarios internos, historial de cambios y (si aplica) el corte de cuentas del caso.',
      '— Crear un caso: solo Administrador o Master pueden hacerlo, con el botón "+" arriba a la derecha en la pantalla de Casos. Se pide título, materia (civil, laboral, familia, penal, mercantil u otro), etapa inicial y, opcionalmente, número de causa (para vincularlo con SATJE).',
      '— Vista Lista vs Kanban: se cambia con el botón junto al título "Casos" en la barra superior. Lista muestra los casos en formato de tabla/filas, con filtros y ordenamiento. Kanban los organiza visualmente por columnas según su etapa actual, ideal para ver de un vistazo en qué fase está cada caso y mover casos de etapa arrastrándolos.',
      '— Filtros de la vista Lista: urgencia (calculada automáticamente según qué tan cerca está el plazo más próximo del caso — rojo si es inminente, amarillo si se acerca, verde si hay margen), materia, etapa y varias opciones de orden (más reciente, alfabético, por urgencia).',
      '— Etiquetas: además de materia/etapa, puedes agregar etiquetas libres a un caso (por ejemplo "urgente", "cliente VIP", "pro bono") para clasificarlo a tu manera. Se gestionan desde la ficha del caso.',
      '— Pestaña Info: datos generales del caso (título, materia, número de causa, fechas) y la lista de personas asignadas (usuarios del despacho y clientes). Desde aquí se agregan o quitan personas del caso.',
      '— Pestaña Documentos: todos los archivos del caso, organizados en carpetas dentro de Google Drive (ver sección "Documentos y Google Drive" más abajo).',
      '— Pestaña Agenda/Plazos: los plazos judiciales y audiencias específicos de este caso, con la opción de sincronizarlos a Google Calendar.',
      '— Pestaña Tareas: pendientes internos del equipo sobre este caso, sin necesariamente ser un plazo judicial formal (ej. "revisar expediente", "llamar al cliente para actualizarlo").',
      '— Pestaña Comentarios: un espacio tipo blog interno para dejar notas y avisos sobre el avance del caso, visible para todo el equipo asignado. Cada quien puede borrar sus propios comentarios; un Administrador puede borrar cualquiera.',
      '— Pestaña Historial: registro cronológico de los cambios importantes del caso (cambios de etapa, documentos agregados, novedades de SATJE detectadas, etc.).',
      '— Pestaña Pagos (corte de cuentas): registro de anticipos recibidos del cliente, gastos del caso (cobrables o no al cliente) y horas facturables si el honorario es por hora. Desde aquí se puede exportar un PDF de "Estado de cuenta" con el resumen para el cliente.',
      '— Un usuario con rol Limitado solo puede ver y trabajar en los casos donde fue asignado explícitamente en la pestaña Info; no ve el resto de casos del workspace en ninguna pantalla (ni en Buscar, ni en Reportes, ni en el Dashboard).',
      '— Cerrar un caso: se marca la fecha de finalización desde la ficha del caso. Un caso cerrado sigue siendo consultable pero se marca como "Cerrado" en listados y reportes.',
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    icono: 'ti-users',
    contenido: [
      'Registro de las personas naturales o empresas que son clientes del despacho. Es independiente de las cuentas de usuario del sistema — un cliente normalmente NO tiene una cuenta para entrar a TSADOQ, es solo un registro interno del despacho.',
      '— Crear un cliente: botón "+" en la pantalla de Clientes. Se piden datos básicos (nombre, contacto) y opcionalmente notas internas.',
      '— Cada cliente puede estar vinculado a uno o varios casos. Desde la ficha del cliente ves de un vistazo todo su historial de casos, tanto los activos como los cerrados.',
      '— Notas del cliente: un espacio para dejar información interna que no pertenece a ningún caso específico (por ejemplo, preferencias de contacto, historial de pagos, referencias).',
      '— Para vincular un cliente a un caso, se hace desde la pestaña Info del caso (agregar persona, rol "cliente") o desde la ficha del cliente mismo.',
    ],
  },
  {
    id: 'agenda',
    titulo: 'Agenda',
    icono: 'ti-calendar',
    contenido: [
      'Vista consolidada de todos los plazos judiciales y tareas de tus casos, ordenados cronológicamente, para no tener que revisar caso por caso.',
      '— Plazo vs Tarea: un plazo es una fecha judicial formal (audiencia, vencimiento de término procesal, presentación de un escrito). Una tarea es un pendiente interno del equipo sin necesariamente tener consecuencias procesales si se atrasa un día (ej. "preparar borrador de contestación").',
      '— Crear un plazo o tarea: desde la Agenda general o desde la pestaña correspondiente dentro de un caso específico. Se asigna a una persona del equipo, con fecha y una nota opcional.',
      '— Sincronización con Google Calendar: si el despacho tiene Google Drive/Calendar conectado en Configuración, cada plazo puede generar automáticamente un evento de calendario, invitando tanto a las personas del caso (usuarios internos) como a invitados externos (ej. la contraparte, un perito).',
      '— Recordatorios escalonados: al crear el plazo puedes activar avisos automáticos por correo 30 días, 8 días y 48 horas antes de la fecha — útil para no perder de vista términos procesales largos.',
      '— Un plazo que pasó su fecha sin marcarse como completado queda visible como vencido/atrasado, tanto en la Agenda como en el semáforo de urgencia de la lista de Casos.',
      '— Estados de un plazo o tarea: pendiente, en progreso, completada (y para plazos, además "vencida" si se pasó la fecha sin completarse).',
    ],
  },
  {
    id: 'buscar-reportes',
    titulo: 'Buscar / Reportes',
    icono: 'ti-search',
    contenido: [
      'Un mismo botón en el menú lateral ("Buscar / Reportes") da acceso a dos modos, que se alternan con el selector en la parte superior de la pantalla.',
      '— Modo Buscar: búsqueda global que revisa al mismo tiempo casos, clientes, usuarios, documentos y agenda (plazos/tareas). Es multi-palabra en modo "Y": si escribes "García laboral", solo aparecen resultados que contengan ambas palabras, no cualquiera de las dos. Sirve para encontrar rápidamente algo cuando no recuerdas en qué caso estaba.',
      '— Modo Reportes: permite filtrar el conjunto de casos por rango de fecha, materia, etapa, usuario asignado, cliente y estado (abierto/cerrado). Muestra tarjetas de resumen con totales: número de casos, promedio de días para cierre, horas facturadas, monto de horas, anticipos recibidos, plazos pendientes y tareas pendientes.',
      '— La tabla de resultados de Reportes es clickeable: al hacer clic en una fila vas directo a ese caso.',
      '— Exportar a Excel: el botón "Exportar a Excel (CSV)" descarga un archivo .csv con los resultados filtrados en pantalla (respeta los filtros activos). Excel lo abre directamente sin necesidad de convertirlo.',
      '— Un usuario con rol Limitado puede usar tanto Buscar como Reportes con total normalidad, pero los resultados siempre están acotados a sus propios casos asignados — nunca puede ver ni exportar información de casos ajenos, aunque escriba el nombre exacto de otro caso.',
    ],
  },
  {
    id: 'documentos-drive',
    titulo: 'Documentos y Google Drive',
    icono: 'ti-brand-google-drive',
    contenido: [
      'Los documentos de cada caso NO se guardan en los servidores de TSADOQ, sino en la propia cuenta de Google Drive del despacho — esto le da al despacho control total y propiedad sobre sus archivos.',
      '— Conectar Drive: solo un Administrador puede hacerlo, desde Configuración > Drive, autorizando el acceso con la cuenta de Google del despacho (no la personal de cada abogado). Una vez conectado, TSADOQ crea automáticamente una carpeta raíz y una subcarpeta por cada caso.',
      '— Subir documentos: desde la pestaña Documentos de un caso, arrastrando el archivo o con el botón de carga. Se puede organizar en subcarpetas dentro del caso.',
      '— Lectura automática por IA: cuando subes un PDF o Word, el sistema puede extraer su contenido de texto en segundo plano (proceso automático, tarda unos minutos) para que Temis pueda usarlo como contexto al responder preguntas sobre ese caso específico — por ejemplo "¿qué dice el contrato que subimos?".',
      '— Reconexión de Drive: si el despacho cambia de cuenta de Google, un Administrador puede reconectar desde Configuración sin perder la organización de carpetas existente — el sistema reconcilia automáticamente qué carpeta corresponde a cada caso.',
      '— Documentos eliminados directamente en Drive (fuera de TSADOQ): el sistema puede detectarlo y avisar, para mantener consistencia entre lo que se ve en la app y lo que realmente existe en Drive.',
      '— Problema común: "el PDF se descarga en vez de abrirse en el visor". Esto casi siempre es una configuración del propio navegador Chrome del usuario ("Descargar siempre los archivos PDF" en chrome://settings/content/pdfDocuments), no un error de la aplicación. Se soluciona desactivando esa opción en Chrome.',
    ],
  },
  {
    id: 'satje',
    titulo: 'SATJE (consulta judicial automática)',
    icono: 'ti-gavel',
    contenido: [
      'SATJE es el sistema de consulta de causas judiciales del Consejo de la Judicatura de Ecuador (satje.funcionjudicial.gob.ec). TSADOQ puede revisar automáticamente si hay novedades (nuevos movimientos procesales) en los casos que tengan un número de causa registrado.',
      '— Activar la sincronización: desde Configuración de tu workspace, con un simple interruptor. Solo se consultan los casos que tengan número de causa cargado en su ficha.',
      '— Proceso centralizado: a diferencia de otras funciones, esta consulta NO la hace cada despacho por separado. La administra el dueño/superadministrador del sistema, quien corre periódicamente el proceso de consulta para todos los workspaces que activaron la sincronización. Como usuario de un despacho, tú no tienes que hacer nada más que activar el interruptor — nunca necesitas resolver un captcha ni interactuar con el sitio de SATJE.',
      '— Novedades detectadas: cuando hay un movimiento nuevo en un caso, aparece un aviso en la campanita de notificaciones y queda registrado en la pestaña Historial de ese caso, con fecha, tipo de movimiento y una descripción breve.',
      '— Qué NO guarda: no se descarga ni almacena el expediente completo ni los documentos judiciales del proceso, solo un registro descriptivo corto de cada movimiento detectado (para no comprometer información sensible innecesariamente).',
      '— Si un número de causa no coincide con ningún caso activo al momento de la consulta, simplemente no genera novedad — vale la pena revisar que el número de causa esté bien escrito en la ficha del caso.',
    ],
  },
  {
    id: 'calculadora-laboral',
    titulo: 'Calculadora Laboral',
    icono: 'ti-calculator',
    contenido: [
      'Herramienta para calcular la liquidación o finiquito de un trabajador, basada en el Código del Trabajo de Ecuador. Disponible para todos los roles en el menú lateral, ruta /calculadora-laboral.',
      '— Datos que pide: fecha de ingreso, fecha de salida, tipo de contrato, sueldo, tipo de terminación (renuncia, despido intempestivo, visto bueno, mutuo acuerdo, fin de plazo pactado), y si aplica alguna protección especial.',
      '— Rubros que calcula: décimo tercero (bono navideño, proporcional sobre 360 días desde el último pago), décimo cuarto (bono escolar, sobre el Salario Básico Unificado), vacaciones no gozadas (15 días por año, proporcional), fondos de reserva (a partir del mes 13 de trabajo continuo), bonificación por desahucio (25% del último sueldo por año completo, Art. 185) e indemnización por despido intempestivo (Art. 188: 3 remuneraciones hasta 3 años de servicio, o 1 remuneración por año completo con tope de 25 remuneraciones si supera los 3 años, calculada sobre el mejor sueldo histórico del trabajador según la Resolución 02-2025 de la Corte Nacional de Justicia).',
      '— Casillas de "mensualizado": si el décimo tercero, décimo cuarto o los fondos de reserva ya se le pagan al trabajador junto con el sueldo mensual (una práctica permitida por ley), se marcan esas casillas para que la calculadora no los cuente doble en la liquidación final.',
      '— Protecciones especiales con indemnización adicional (solo aplican si la terminación fue por causa del empleador): embarazo o lactancia (+12 remuneraciones, "despido ineficaz"), dirigente sindical o fuero sindical (+12 remuneraciones), discapacidad propia o de un dependiente a cargo (+18 remuneraciones, Ley Orgánica de Discapacidades).',
      '— Visto bueno: si lo tramita el empleador (con causa imputable al trabajador) y es concedido, no genera indemnización. Si lo tramita el trabajador (por causa del empleador, ej. falta de pago de sueldos) y es concedido, sí genera indemnización equivalente a un despido intempestivo.',
      '— Contratos con plazo pactado (eventual, ocasional, de temporada, por obra o servicio determinado): si la relación termina exactamente al cumplirse el plazo pactado, no corresponde indemnización ni desahucio, solo la liquidación de haberes pendientes.',
      '— Casos que NO cubre: empleados del sector público (se rigen por la LOSEP, no por el Código del Trabajo) y relaciones de servicios profesionales u honorarios (son de naturaleza civil, no laboral).',
      '— Lo que la calculadora NO incluye en el monto: aportes al IESS pendientes (solo advierte que pueden existir), descuentos legales como préstamos, anticipos o pensiones alimenticias, impuesto a la renta, ni beneficios adicionales de un eventual contrato colectivo (si existe uno más favorable que la ley, ese prevalece).',
      '— Importante: los montos siempre salen de fórmulas fijas programadas, nunca de una estimación de la IA — si le preguntas a Temis "¿cuánto le corresponde a fulano?", ella va a explicarte los conceptos aplicables pero siempre te va a remitir a esta calculadora para el monto final exacto.',
    ],
  },
  {
    id: 'soporte',
    titulo: 'Soporte',
    icono: 'ti-lifebuoy',
    contenido: [
      'Canal directo para reportar un problema técnico o hacer una consulta al equipo de TSADOQ.',
      '— Crear un ticket: elige una categoría (ej. error técnico, duda de uso, sugerencia), describe el problema y opcionalmente adjunta una captura de pantalla.',
      '— Cada ticket tiene un cronómetro visible de 24 horas como referencia de tiempo de respuesta.',
      '— Si un ticket se marca como resuelto pero el problema sigue, se puede reabrir desde el mismo ticket en vez de crear uno nuevo — así se mantiene el historial de la conversación.',
    ],
  },
  {
    id: 'anuncios',
    titulo: 'Anuncios',
    icono: 'ti-speakerphone',
    contenido: [
      'Solo para Administradores. Permite comunicar avisos internos a todo el equipo sin necesidad de un canal externo (correo, WhatsApp).',
      '— Destinatarios: se puede enviar a todo el workspace, a un grupo específico de usuarios, o a personas puntuales.',
      '— Expiración: un anuncio puede configurarse para desaparecer automáticamente después de cierta cantidad de días, o cuando todos los destinatarios ya lo hayan leído (lo que ocurra primero).',
      '— Los anuncios aparecen como notificación en la campanita de cada destinatario.',
    ],
  },
  {
    id: 'usuarios-roles',
    titulo: 'Usuarios y roles',
    icono: 'ti-user-shield',
    contenido: [
      'Solo para Administradores. Es el centro de gestión de las personas que tienen acceso al sistema (distinto de "Clientes", que son personas sin acceso).',
      '— Invitar un usuario: botón "+ Invitar", se ingresa el correo y se le asigna un rol inicial. La persona recibe un enlace de invitación para crear su contraseña y activar la cuenta.',
      '— Roles disponibles: Administrador (acceso total, incluida esta misma pantalla, Anuncios y Configuración), Master (ve y gestiona todos los casos del workspace, pero no puede invitar usuarios, ver Anuncios ni tocar Configuración), Limitado (solo ve y trabaja en los casos donde fue asignado explícitamente).',
      '— Cambiar el rol de un usuario existente: se hace desde la misma lista, en cualquier momento.',
      '— Eliminar un usuario: quita su acceso al sistema; los casos y datos que generó quedan intactos en el workspace.',
      '— Grupos: se pueden crear grupos de usuarios (ej. "Equipo Laboral") para asignar varios usuarios a un caso de una sola vez, o para dirigir un Anuncio a ese equipo específico sin tener que elegir persona por persona.',
    ],
  },
  {
    id: 'configuracion',
    titulo: 'Configuración',
    icono: 'ti-settings',
    contenido: [
      'Solo para Administradores. Es el panel de control del workspace completo.',
      '— Google Drive: conectar/reconectar la cuenta de Google del despacho para el almacenamiento de documentos (ver sección "Documentos y Google Drive").',
      '— SATJE: activar o desactivar la sincronización automática de novedades judiciales para los casos con número de causa.',
      '— Etapas del Kanban: definir o reordenar las columnas/etapas por las que pasa un caso (ej. "Nuevo", "En trámite", "Audiencia programada", "Resuelto"), personalizables según el flujo de trabajo del despacho.',
      '— Inteligencia artificial: conectar la clave de Groq para habilitar a Temis en el workspace, y opcionalmente OpenRouter para capacidades de visión (lectura de documentos escaneados como imagen).',
      '— Otras integraciones y ajustes generales del workspace se agregan aquí a medida que el sistema crece.',
    ],
  },
  {
    id: 'temis-ia',
    titulo: 'Temis (Asistente de IA)',
    icono: 'ti-brain',
    contenido: [
      'Temis es la asistente de inteligencia artificial integrada en TSADOQ, accesible desde el ícono junto a la campana de notificaciones en la parte superior.',
      '— Qué puede responder: preguntas sobre tus casos, clientes y plazos próximos (usa los datos reales de tu workspace, no inventa información), explicaciones de conceptos de liquidación laboral (sin calcular montos finales — eso siempre lo hace la Calculadora Laboral), y ayuda de uso del sistema (este mismo manual).',
      '— Dentro de un caso específico: si el caso tiene documentos subidos a Drive y ya fueron leídos por el sistema, Temis puede responder preguntas puntuales sobre el contenido de esos documentos (ej. "¿qué cláusula de terminación tiene el contrato?").',
      '— Requiere conexión previa: un Administrador debe conectar la clave de Groq en Configuración para que Temis funcione en el workspace. Si no está conectada, el asistente lo indica claramente en vez de fallar silenciosamente.',
      '— Temis no reemplaza criterio legal profesional — es una herramienta de apoyo y organización, no un asesor legal.',
    ],
  },
]

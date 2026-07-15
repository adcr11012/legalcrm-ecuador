export type Materia =
  | 'civil'
  | 'mercantil'
  | 'laboral'
  | 'familia'
  | 'penal'
  | 'transito'
  | 'inquilinato'
  | 'contencioso_administrativo'
  | 'contencioso_tributario'
  | 'constitucional'
  | 'asesoria'
  | 'otro'
export type EtapaColor = 'neutral' | 'accent' | 'warn' | 'danger' | 'success' | 'purple'
export type RolPersona = 'abogado' | 'cliente' | 'otro'
export type Visibilidad = 'privado' | 'compartido'
export type TipoPlazo = 'audiencia' | 'plazo' | 'tarea' | 'otro'
export type EstadoAgenda = 'pendiente' | 'en_progreso' | 'completada' | 'vencida'
export type EstadoCliente = 'activo' | 'inactivo' | 'potencial'
export type TipoCliente = 'persona_natural' | 'empresa'
export type RolUsuario = 'administrador' | 'master' | 'limitado'
export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada'

export type Workspace = {
  id: string
  nombre: string
  plan: string
  notif_email: boolean
  dias_anticipacion: number
  alertas_inactividad_activas: boolean
  dias_inactividad_usuario: number
  dias_inactividad_caso: number
  alertas_inactividad_ultimo_envio: string | null
  satje_sincronizacion_activa: boolean
  codigo_referido_canjeado: boolean
  created_at: string
}

export type AvisoAdmin = {
  id: string
  workspace_id: string
  tipo: 'usuario_inactivo' | 'caso_inactivo' | 'satje_causa_invalida' | 'satje_novedad'
  titulo: string
  subtitulo: string
  ref_id: string
  to_path: string
  leido: boolean
  created_at: string
}

export type Grupo = {
  id: string
  workspace_id: string
  nombre: string
  created_at: string
}

export type Usuario = {
  id: string
  workspace_id: string
  nombre: string
  email: string
  rol: RolUsuario
  es_propietario: boolean
  last_seen_at: string | null
  onboarding_completado: boolean
  created_at: string
}

export type CasoAnticipo = {
  id: string
  caso_id: string
  fecha: string
  monto: number
  detalle: string | null
  created_at: string
}

export type CasoHora = {
  id: string
  caso_id: string
  fecha: string
  descripcion: string
  horas: number
  valor_hora: number
  created_at: string
}

export type CasoGasto = {
  id: string
  caso_id: string
  fecha: string
  monto: number
  descripcion: string
  cobrable: boolean
  created_at: string
}

export type AuditoriaDocumento = {
  id: string
  workspace_id: string
  documento_id: string | null
  usuario_id: string | null
  accion: string
  nombre_doc: string | null
  caso_id: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

export type HonorariosTipo = 'fijo' | 'por_hora' | 'por_exito' | 'mixto'
export type HonorariosFormaPago = 'inicio' | 'cuotas' | 'al_finalizar'

export type Etapa = {
  id: string
  workspace_id: string
  nombre: string
  color: EtapaColor
  es_terminal: boolean
  posicion: number
  created_at: string
}

export type Caso = {
  id: string
  workspace_id: string
  titulo: string
  materia: Materia | null
  tipo_accion: string | null
  cliente_id: string | null
  etapa_id: string | null
  numero_causa: string | null
  juzgado: string | null
  fecha_inicio: string | null
  nota_interna: string | null
  drive_folder_id: string | null
  es_contencioso: boolean
  rol_cliente: string | null
  contraparte_nombre: string | null
  contraparte_cedula: string | null
  contraparte_abogado: string | null
  demanda_presentada: boolean
  fecha_citacion: string | null
  cuantia: number | null
  instancia_actual: string
  honorarios_tipo: HonorariosTipo | null
  honorarios_monto: number | null
  honorarios_forma_pago: HonorariosFormaPago | null
  honorarios_notas: string | null
  etiquetas: string[]
  fecha_finalizado: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type CasoPersona = {
  id: string
  caso_id: string
  user_id: string | null
  cliente_id: string | null
  nombre_externo: string | null
  email_externo: string | null
  rol: RolPersona
  created_at: string
}

export type EstadoLectura = 'no_aplica' | 'pendiente' | 'procesando' | 'listo' | 'error'

export type Documento = {
  id: string
  caso_id: string
  nombre: string
  drive_file_id: string | null
  drive_url: string | null
  visibilidad: Visibilidad
  subido_por: string
  created_at: string
  mime_type: string | null
  estado_lectura: EstadoLectura
  contenido_texto: string | null
  error_lectura: string | null
  carpeta_id: string | null
}

export type Carpeta = {
  id: string
  caso_id: string
  workspace_id: string
  nombre: string
  parent_id: string | null
  orden: number
  created_at: string
}

export type Plazo = {
  id: string
  caso_id: string
  workspace_id: string
  titulo: string
  descripcion: string | null
  fecha: string
  tipo: TipoPlazo
  estado: EstadoAgenda
  asignado_a: string | null
  nota: string | null
  alertado: boolean
  google_event_id: string | null
  notificar_a: string[]
  notificar_externos: string[]
  recordatorios_activos: boolean
  aviso_30_enviado: boolean
  aviso_8_enviado: boolean
  aviso_48h_enviado: boolean
  created_at: string
}

export type Tarea = {
  id: string
  workspace_id: string
  caso_id: string
  titulo: string
  descripcion: string | null
  asignado_a: string | null
  fecha_limite: string | null
  estado: EstadoTarea
  created_by: string | null
  created_at: string
}

export type HistorialEntry = {
  id: string
  caso_id: string
  user_id: string
  accion: string
  detalle: string | null
  created_at: string
}

export type SatjeMovimiento = {
  id: string
  caso_id: string
  workspace_id: string
  numero_causa: string
  fecha_movimiento: string
  tipo: string
  descripcion: string | null
  jurisdiccion: string | null
  ciudad: string | null
  codigo: string | null
  orden: number | null
  importado_por: string
  created_at: string
}

export type SatjeDatosGenerales = {
  caso_id: string
  jurisdiccion: string
  workspace_id: string
  numero_proceso: string | null
  materia: string | null
  tipo_accion: string | null
  delito_asunto: string | null
  judicatura_actual: string | null
  actor: string | null
  demandado: string | null
  importado_por: string
  updated_at: string
}

export type CasoComentario = {
  id: string
  caso_id: string
  user_id: string
  contenido: string
  created_at: string
}

export type DestinatarioTipo = 'todos' | 'grupo' | 'usuarios'

export type ExpiraTipo = 'leido' | 'dias'

export type Anuncio = {
  id: string
  workspace_id: string
  autor_id: string
  titulo: string
  contenido: string
  destinatario_tipo: DestinatarioTipo
  destinatario_ids: string[]
  expira_tipo: ExpiraTipo
  expira_dias: number | null
  created_at: string
}

export type CategoriaTicket = 'bug' | 'duda' | 'sugerencia' | 'facturacion' | 'otro'
export type EstadoTicket = 'abierto' | 'respondido' | 'cerrado'

export type TicketSoporte = {
  id: string
  workspace_id: string
  creado_por: string
  categoria: CategoriaTicket
  asunto: string
  estado: EstadoTicket
  created_at: string
  updated_at: string
}

export type TicketMensaje = {
  id: string
  ticket_id: string
  autor_id: string
  autor_tipo: 'usuario' | 'soporte'
  mensaje: string
  captura_url: string | null
  created_at: string
}

export type ConfiguracionLaboral = {
  id: true
  sbu: number
  actualizado_en: string
  actualizado_por: string | null
}

export type Cliente = {
  id: string
  workspace_id: string
  nombre: string
  tipo: TipoCliente
  email: string | null
  telefono: string | null
  estado: EstadoCliente
  etiquetas: string[]
  notas: string | null
  origen: string | null
  proximo_seguimiento: string | null
  created_at: string
  updated_at: string
}

export type ClienteNota = {
  id: string
  cliente_id: string
  user_id: string
  contenido: string
  created_at: string
}

export type Invitacion = {
  id: string
  workspace_id: string
  email: string
  rol: RolUsuario
  token: string
  usado: boolean
  created_at: string
  expires_at: string
}

export type CodigoReferido = {
  id: string
  codigo: string
  semillas: number
  creado_por_workspace_id: string | null
  usado: boolean
  usado_por_workspace_id: string | null
  usado_at: string | null
  expira_at: string | null
  created_at: string
}

export type FeriadoEcuador = {
  id: string
  fecha: string
  nombre: string
  verificado: boolean
  provincia: string | null // null = feriado nacional, afecta a todas
  actualizado_en: string
  actualizado_por: string | null
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      workspaces: Table<Workspace>
      users: Table<Usuario>
      casos: Table<Caso>
      caso_personas: Table<CasoPersona>
      documentos: Table<Documento>
      plazos: Table<Plazo>
      historial: Table<HistorialEntry>
      clientes: Table<Cliente>
      cliente_notas: Table<ClienteNota>
      cliente_historial: Table<{ id: string; cliente_id: string; user_id: string; accion: string; detalle: string | null; created_at: string }>
      invitaciones: Table<Invitacion>
      etapas: Table<Etapa>
      tareas: Table<Tarea>
      documento_tokens: Table<{ id: string; documento_id: string; user_id: string; expires_at: string; created_at: string }>
      carpetas: Table<Carpeta>
      caso_anticipos: Table<CasoAnticipo>
      caso_gastos: Table<CasoGasto>
      caso_horas: Table<CasoHora>
      auditoria_documentos: Table<AuditoriaDocumento>
      grupos: Table<Grupo>
      grupo_usuarios: Table<{ grupo_id: string; user_id: string }>
      avisos_admin: Table<AvisoAdmin>
      caso_comentarios: Table<CasoComentario>
      satje_movimientos: Table<SatjeMovimiento>
      satje_datos_generales: Table<SatjeDatosGenerales>
      anuncios: Table<Anuncio>
      anuncio_lecturas: Table<{ anuncio_id: string; user_id: string; leido_at: string }>
      tickets_soporte: Table<TicketSoporte>
      ticket_mensajes: Table<TicketMensaje>
      configuracion_laboral: Table<ConfiguracionLaboral>
      codigos_referido: Table<CodigoReferido>
      feriados_ecuador: Table<FeriadoEcuador>
    }
    Views: { [_ in never]: never }
    Functions: {
      registrar_workspace: {
        Args: { p_nombre_workspace: string; p_nombre_usuario: string; p_codigo_referido?: string | null }
        Returns: {
          workspace_id: string
          plan: string
          codigo_valido: boolean
          semillas_heredadas: number
          codigos_generados: string[]
        }
      }
      admin_crear_codigos_referido: {
        Args: { p_cantidad: number; p_semillas?: number }
        Returns: string[]
      }
      canjear_codigo_referido: {
        Args: { p_codigo: string }
        Returns: { plan: string; semillas_heredadas: number; codigos_generados: string[] }
      }
      admin_upsert_feriado: {
        Args: { p_fecha: string; p_nombre: string; p_verificado: boolean; p_provincia?: string | null }
        Returns: void
      }
      admin_eliminar_feriado: {
        Args: { p_id: string }
        Returns: void
      }
      admin_listar_codigos_raiz: {
        Args: Record<string, never>
        Returns: CodigoReferido[]
      }
      obtener_invitacion: {
        Args: { p_token: string }
        Returns: {
          workspace_id: string
          workspace_nombre: string
          email: string
          rol: string
          usado: boolean
          expires_at: string
        }[]
      }
      aceptar_invitacion: {
        Args: { p_token: string; p_nombre: string }
        Returns: string
      }
      drive_estado: {
        Args: Record<string, never>
        Returns: { conectado: boolean; email: string | null }[]
      }
      drive_desconectar: {
        Args: Record<string, never>
        Returns: undefined
      }
      groq_estado: {
        Args: Record<string, never>
        Returns: { conectado: boolean }[]
      }
      groq_desconectar: {
        Args: Record<string, never>
        Returns: undefined
      }
      openrouter_estado: {
        Args: Record<string, never>
        Returns: { conectado: boolean }[]
      }
      openrouter_desconectar: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
  }
}

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
export type TipoPlazo = 'audiencia' | 'plazo' | 'otro'
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
}

export type Plazo = {
  id: string
  caso_id: string
  titulo: string
  descripcion: string | null
  fecha: string
  tipo: TipoPlazo
  alertado: boolean
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
    }
    Views: { [_ in never]: never }
    Functions: {
      registrar_workspace: {
        Args: { p_nombre_workspace: string; p_nombre_usuario: string }
        Returns: string
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

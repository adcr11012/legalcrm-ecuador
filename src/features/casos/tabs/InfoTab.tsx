import { useEffect, useState } from 'react'
import type { Caso, CasoPersona, Etapa, Usuario } from '@/types/database'
import { nombrePersona } from '@/features/casos/personaDisplay'
import { calcularCompletitud } from '@/features/casos/completitud'
import { InstanciaStepper } from '@/features/casos/InstanciaStepper'
import { DatosJudicialesModal } from '@/features/casos/DatosJudicialesModal'
import { PartesDelProcesoModal } from '@/features/casos/PartesDelProcesoModal'
import { HonorariosModal } from '@/features/casos/HonorariosModal'

const ROL_LABEL: Record<string, string> = { abogado: 'Usuario', cliente: 'Cliente', otro: 'Otro' }

const fieldInputClass =
  'mt-1 w-full rounded-[6px] border border-border bg-bg px-1.5 py-1 text-[13px] font-medium text-ink outline-none focus:border-accent'

export function InfoTab({
  caso,
  personas,
  usersById,
  etapas,
  puedeEditar,
  onChangeEtapa,
  onUpdateCampo,
  onOpenAddPersona,
  onRemovePersona,
  tienePlazos,
  tieneDocumentos,
  onOpenAddPlazo,
  onOpenAddDoc,
}: {
  caso: Caso
  personas: CasoPersona[]
  usersById: Map<string, Usuario>
  etapas: Etapa[]
  puedeEditar: boolean
  onChangeEtapa: (etapaId: string) => void
  onUpdateCampo: (patch: Partial<Caso>) => void
  onOpenAddPersona: () => void
  onRemovePersona: (id: string) => void
  tienePlazos: boolean
  tieneDocumentos: boolean
  onOpenAddPlazo: () => void
  onOpenAddDoc: () => void
}) {
  const [numeroCausa, setNumeroCausa] = useState(caso.numero_causa ?? '')
  const [fechaInicio, setFechaInicio] = useState(caso.fecha_inicio ?? '')
  const [datosJudicialesOpen, setDatosJudicialesOpen] = useState(false)
  const [partesOpen, setPartesOpen] = useState(false)
  const [honorariosOpen, setHonorariosOpen] = useState(false)

  // Solo resincroniza cuando cambia el caso seleccionado, no en cada guardado propio.
  useEffect(() => {
    setNumeroCausa(caso.numero_causa ?? '')
    setFechaInicio(caso.fecha_inicio ?? '')
  }, [caso.id])

  const tieneAbogado = personas.some((p) => p.rol === 'abogado')
  const { porcentaje, items } = calcularCompletitud(caso, tieneAbogado, tienePlazos, tieneDocumentos)
  const itemCumplido = (key: string) => items.find((i) => i.key === key)?.cumplido ?? false

  async function guardar(patch: Partial<Caso>) {
    onUpdateCampo(patch)
  }

  return (
    <div>
      <div className="mb-4 rounded-[10px] border border-border bg-surface p-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-ink">Perfil del caso</span>
          <span className="text-[12px] font-semibold text-accent">{porcentaje}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-soft">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
        {porcentaje < 100 && (
          <div className="mt-1.5 text-[11px] text-mute2">
            Completa la información para tener mejor control y activar funciones automáticas.
          </div>
        )}
      </div>

      {puedeEditar && porcentaje < 100 && (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {!itemCumplido('numero_causa') && (
            <TarjetaPendiente
              icono="ti-clipboard-text"
              titulo="Datos judiciales"
              descripcion="Agrega el número de causa para llevar control judicial del caso."
              onClick={() => setDatosJudicialesOpen(true)}
            />
          )}
          {caso.es_contencioso && !itemCumplido('contraparte') && (
            <TarjetaPendiente
              icono="ti-users"
              titulo="Partes del proceso"
              descripcion="¿Hay una contraparte en este caso?"
              onClick={() => setPartesOpen(true)}
            />
          )}
          {!tienePlazos && (
            <TarjetaPendiente
              icono="ti-calendar-event"
              titulo="Plazos y audiencias"
              descripcion="Registra la primera fecha importante para activar alertas automáticas."
              onClick={onOpenAddPlazo}
            />
          )}
          {!tieneDocumentos && (
            <TarjetaPendiente
              icono="ti-files"
              titulo="Documentos"
              descripcion="Sube el primer documento del caso."
              onClick={onOpenAddDoc}
            />
          )}
          {!itemCumplido('honorarios') && (
            <TarjetaPendiente
              icono="ti-coin"
              titulo="Honorarios"
              descripcion="Registra el valor pactado para llevar control de pagos y saldos."
              onClick={() => setHonorariosOpen(true)}
            />
          )}
        </div>
      )}

      <div className="mb-4">
        <InstanciaStepper caso={caso} puedeEditar={puedeEditar} onChange={(instancia) => onUpdateCampo({ instancia_actual: instancia })} />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">N° de causa</div>
          {puedeEditar ? (
            <input
              value={numeroCausa}
              onChange={(e) => setNumeroCausa(e.target.value)}
              onBlur={() => {
                if (numeroCausa !== (caso.numero_causa ?? '')) onUpdateCampo({ numero_causa: numeroCausa || null })
              }}
              placeholder="Sin registrar"
              className={fieldInputClass}
            />
          ) : (
            <div className={`mt-1 text-[13px] font-medium ${caso.numero_causa ? 'text-ink' : 'italic text-muted'}`}>
              {caso.numero_causa || 'Sin registrar'}
            </div>
          )}
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Fecha de inicio</div>
          {puedeEditar ? (
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value)
                onUpdateCampo({ fecha_inicio: e.target.value || null })
              }}
              className={fieldInputClass}
            />
          ) : (
            <div className="mt-1 text-[13px] font-medium text-ink">{caso.fecha_inicio || '—'}</div>
          )}
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Etapa</div>
          {puedeEditar ? (
            <select value={caso.etapa_id ?? ''} onChange={(e) => onChangeEtapa(e.target.value)} className={fieldInputClass}>
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-1 text-[13px] font-medium text-ink">
              {etapas.find((e) => e.id === caso.etapa_id)?.nombre ?? '—'}
            </div>
          )}
        </div>
        <div className="sm:col-span-3 rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Etiquetas</div>
          {caso.etiquetas.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {caso.etiquetas.map((t) => (
                <span key={t} className="rounded-full bg-soft px-2 py-0.5 text-[11px] text-muted">{t}</span>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-[13px] italic text-muted">Sin etiquetas</div>
          )}
        </div>
        <div className="sm:col-span-3 rounded-[10px] border border-border bg-surface p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Juzgado / Tribunal</div>
          <div className={`mt-1 text-[13px] font-medium ${caso.juzgado ? 'text-ink' : 'italic text-muted'}`}>
            {caso.juzgado || 'Sin asignar'}
          </div>
        </div>
        {caso.es_contencioso && caso.contraparte_nombre && (
          <div className="sm:col-span-3 rounded-[10px] border border-border bg-surface p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Contraparte</div>
            <div className="mt-1 text-[13px] font-medium text-ink">{caso.contraparte_nombre}</div>
          </div>
        )}
        {caso.honorarios_tipo && (
          <div className="sm:col-span-3 rounded-[10px] border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-mute2">Honorarios</div>
              {puedeEditar && (
                <button
                  onClick={() => setHonorariosOpen(true)}
                  className="text-[11px] text-accent hover:underline"
                >
                  Editar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <div>
                <div className="text-[10px] text-mute2">Tipo</div>
                <div className="text-[13px] font-medium text-ink capitalize">{caso.honorarios_tipo.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-[10px] text-mute2">Monto pactado</div>
                <div className="text-[13px] font-medium text-ink">
                  {caso.honorarios_monto != null ? `$${Number(caso.honorarios_monto).toLocaleString('es-EC', { minimumFractionDigits: 2 })}` : '—'}
                </div>
              </div>
              {caso.honorarios_forma_pago && (
                <div>
                  <div className="text-[10px] text-mute2">Forma de pago</div>
                  <div className="text-[13px] font-medium text-ink">
                    {{ inicio: 'Al inicio', cuotas: 'Por cuotas', al_finalizar: 'Al finalizar' }[caso.honorarios_forma_pago] ?? caso.honorarios_forma_pago}
                  </div>
                </div>
              )}
            </div>
            {caso.honorarios_notas && (
              <div className="mt-2.5 border-t border-border pt-2.5">
                <div className="text-[10px] text-mute2">Notas</div>
                <div className="mt-0.5 whitespace-pre-wrap text-[12px] text-ink">{caso.honorarios_notas}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Usuarios del workspace ── */}
      <div className="mt-4 mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-mute2">Usuarios asignados</span>
        {puedeEditar && (
          <button
            onClick={onOpenAddPersona}
            className="flex items-center gap-1 text-[11px] text-accent transition hover:underline"
          >
            <i className="ti ti-plus text-[12px]" /> Añadir
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {personas.filter((p) => p.user_id).map((p) => (
          <PersonaChip
            key={p.id}
            nombre={nombrePersona(p, usersById)}
            sub={ROL_LABEL[p.rol]}
            color="accent"
            onRemove={puedeEditar ? () => onRemovePersona(p.id) : undefined}
          />
        ))}
        {personas.filter((p) => p.user_id).length === 0 && (
          <span className="text-[12px] italic text-mute2">Sin usuarios asignados.</span>
        )}
      </div>

      {/* ── Clientes del caso ── */}
      <div className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">Clientes</div>
      <div className="flex flex-wrap gap-2">
        {personas.filter((p) => p.cliente_id).map((p) => (
          <PersonaChip
            key={p.id}
            nombre={p.nombre_externo ?? 'Cliente'}
            sub="Cliente registrado"
            color="success"
            onRemove={puedeEditar ? () => onRemovePersona(p.id) : undefined}
          />
        ))}
        {personas.filter((p) => p.cliente_id).length === 0 && (
          <span className="text-[12px] italic text-mute2">Sin clientes asignados.</span>
        )}
      </div>

      <DatosJudicialesModal open={datosJudicialesOpen} onClose={() => setDatosJudicialesOpen(false)} caso={caso} onSave={guardar} />
      <PartesDelProcesoModal open={partesOpen} onClose={() => setPartesOpen(false)} caso={caso} onSave={guardar} />
      <HonorariosModal open={honorariosOpen} onClose={() => setHonorariosOpen(false)} caso={caso} onSave={guardar} />
    </div>
  )
}

function PersonaChip({
  nombre,
  sub,
  color,
  onRemove,
}: {
  nombre: string
  sub: string
  color: 'accent' | 'success' | 'neutral'
  onRemove?: () => void
}) {
  const avatarClass =
    color === 'accent'
      ? 'bg-accent-soft text-accent'
      : color === 'success'
        ? 'bg-success-soft text-success'
        : 'bg-soft text-muted'
  return (
    <div className="group flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarClass}`}>
        {nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
      </div>
      <div>
        <div className="text-[12px] font-medium text-ink">{nombre}</div>
        <div className="text-[10px] text-mute2">{sub}</div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-mute2 opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
        >
          <i className="ti ti-x text-[12px]" />
        </button>
      )}
    </div>
  )
}

function TarjetaPendiente({
  icono,
  titulo,
  descripcion,
  onClick,
}: {
  icono: string
  titulo: string
  descripcion: string
  onClick: () => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-dashed border-border bg-surface p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <i className={`ti ${icono} text-[16px]`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-ink">{titulo}</div>
        <div className="mt-0.5 text-[11px] text-mute2">{descripcion}</div>
        <button onClick={onClick} className="mt-1.5 text-[11px] font-medium text-accent hover:underline">
          Añadir
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import type { CasoAnticipo, CasoGasto, Caso } from '@/types/database'
import { addAnticipo, deleteAnticipo, addGasto, deleteGasto } from '@/features/casos/pagosApi'

function fmt(n: number) {
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC')
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mute2">{children}</div>
}

function EmptyRow({ text }: { text: string }) {
  return <div className="rounded-[8px] border border-dashed border-border px-3 py-3 text-center text-[12px] text-mute2">{text}</div>
}

export function PagosTab({
  caso,
  anticipos,
  gastos,
  puedeEditar,
  onAnticipoAdded,
  onAnticipoDeleted,
  onGastoAdded,
  onGastoDeleted,
}: {
  caso: Caso
  anticipos: CasoAnticipo[]
  gastos: CasoGasto[]
  puedeEditar: boolean
  onAnticipoAdded: (a: CasoAnticipo) => void
  onAnticipoDeleted: (id: string) => void
  onGastoAdded: (g: CasoGasto) => void
  onGastoDeleted: (id: string) => void
}) {
  const [showAddAnticipo, setShowAddAnticipo] = useState(false)
  const [showAddGasto, setShowAddGasto] = useState(false)
  const [saving, setSaving] = useState(false)

  const [aFecha, setAFecha] = useState(new Date().toISOString().slice(0, 10))
  const [aMonto, setAMonto] = useState('')
  const [aDetalle, setADetalle] = useState('')

  const [gFecha, setGFecha] = useState(new Date().toISOString().slice(0, 10))
  const [gMonto, setGMonto] = useState('')
  const [gDesc, setGDesc] = useState('')
  const [gCobrable, setGCobrable] = useState(true)

  const honorario = (caso.honorarios_monto ?? 0) as number
  const totalAnticipos = anticipos.reduce((s, a) => s + Number(a.monto), 0)
  const totalGastosCob = gastos.filter((g) => g.cobrable).reduce((s, g) => s + Number(g.monto), 0)
  const totalGastosInfo = gastos.filter((g) => !g.cobrable).reduce((s, g) => s + Number(g.monto), 0)
  const saldo = honorario + totalGastosCob - totalAnticipos
  const saldado = saldo <= 0

  async function onSaveAnticipo() {
    if (!aMonto || isNaN(Number(aMonto))) return
    setSaving(true)
    try {
      const a = await addAnticipo(caso.id, aFecha, Number(aMonto), aDetalle)
      onAnticipoAdded(a)
      setAMonto(''); setADetalle(''); setShowAddAnticipo(false)
    } finally { setSaving(false) }
  }

  async function onSaveGasto() {
    if (!gMonto || isNaN(Number(gMonto)) || !gDesc.trim()) return
    setSaving(true)
    try {
      const g = await addGasto(caso.id, gFecha, Number(gMonto), gDesc, gCobrable)
      onGastoAdded(g)
      setGMonto(''); setGDesc(''); setGCobrable(true); setShowAddGasto(false)
    } finally { setSaving(false) }
  }

  function exportarPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const marginX = 20
    let y = 20

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('ESTADO DE CUENTA', marginX, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Caso: ${caso.titulo}`, marginX, y); y += 5
    if (caso.numero_causa) { doc.text(`N° causa: ${caso.numero_causa}`, marginX, y); y += 5 }
    doc.text(`Fecha de corte: ${new Date().toLocaleDateString('es-EC')}`, marginX, y); y += 10

    // Honorario
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('HONORARIO (REFERENCIA)', marginX, y); y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`${caso.honorarios_tipo?.toUpperCase() ?? 'No definido'}`, marginX + 2, y)
    doc.text(`$${fmt(honorario)}`, 190, y, { align: 'right' }); y += 8

    // Línea
    doc.setDrawColor(200)
    doc.line(marginX, y, 190, y); y += 5

    // Anticipos
    doc.setFont('helvetica', 'bold')
    doc.text('ANTICIPOS RECIBIDOS', marginX, y); y += 5
    doc.setFont('helvetica', 'normal')
    if (anticipos.length === 0) {
      doc.text('Sin anticipos registrados', marginX + 2, y); y += 5
    } else {
      for (const a of anticipos) {
        doc.text(fmtFecha(a.fecha), marginX + 2, y)
        if (a.detalle) doc.text(a.detalle, marginX + 30, y)
        doc.text(`$${fmt(Number(a.monto))}`, 190, y, { align: 'right' })
        y += 5
      }
      doc.setFont('helvetica', 'bold')
      doc.text('Total anticipos', marginX + 2, y)
      doc.text(`$${fmt(totalAnticipos)}`, 190, y, { align: 'right' }); y += 8
    }

    doc.setDrawColor(200)
    doc.line(marginX, y, 190, y); y += 5

    // Gastos
    doc.setFont('helvetica', 'bold')
    doc.text('GASTOS ADICIONALES', marginX, y); y += 5
    doc.setFont('helvetica', 'normal')
    if (gastos.length === 0) {
      doc.text('Sin gastos registrados', marginX + 2, y); y += 5
    } else {
      for (const g of gastos) {
        doc.text(fmtFecha(g.fecha), marginX + 2, y)
        doc.text(`${g.descripcion}${g.cobrable ? ' (cobrable)' : ' (informativo)'}`, marginX + 30, y)
        doc.text(`$${fmt(Number(g.monto))}`, 190, y, { align: 'right' })
        y += 5
      }
      doc.setFont('helvetica', 'bold')
      doc.text('Total gastos cobrables', marginX + 2, y)
      doc.text(`$${fmt(totalGastosCob)}`, 190, y, { align: 'right' }); y += 5
      if (totalGastosInfo > 0) {
        doc.setFont('helvetica', 'normal')
        doc.text('Total informativos', marginX + 2, y)
        doc.text(`$${fmt(totalGastosInfo)}`, 190, y, { align: 'right' }); y += 5
      }
      y += 3
    }

    // Saldo
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(marginX, y, 190, y); y += 6
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    if (saldado) {
      doc.setTextColor(34, 197, 94)
      doc.text('CUENTA SALDADA', marginX, y)
      doc.text('$0.00', 190, y, { align: 'right' })
    } else {
      doc.setTextColor(0)
      doc.text('SALDO PENDIENTE', marginX, y)
      doc.text(`$${fmt(saldo)}`, 190, y, { align: 'right' })
    }

    doc.save(`corte-${caso.titulo.replace(/\s+/g, '-').toLowerCase()}.pdf`)
  }

  const inputCls = 'w-full rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent'
  const labelCls = 'text-[10px] font-semibold uppercase tracking-wide text-mute2'

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen */}
      <div className="rounded-[10px] border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">Corte de cuentas</span>
          <button
            onClick={exportarPDF}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-soft"
          >
            <i className="ti ti-file-type-pdf text-danger" /> Exportar PDF
          </button>
        </div>

        <div className="flex flex-col gap-1.5 text-[12px]">
          <div className="flex justify-between text-muted">
            <span>Honorario ({caso.honorarios_tipo ?? 'no definido'})</span>
            <span className="font-medium text-ink">${fmt(honorario)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Gastos cobrables</span>
            <span className="font-medium text-ink">+ ${fmt(totalGastosCob)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Anticipos recibidos</span>
            <span className="font-medium text-success">− ${fmt(totalAnticipos)}</span>
          </div>
          <div className="my-1 border-t border-border" />
          <div className="flex justify-between">
            <span className="font-semibold text-ink">Saldo pendiente</span>
            <span className={`font-bold text-[13px] ${saldado ? 'text-success' : 'text-danger'}`}>
              {saldado ? '✓ Saldado' : `$${fmt(saldo)}`}
            </span>
          </div>
          {totalGastosInfo > 0 && (
            <div className="flex justify-between text-mute2 text-[11px]">
              <span>Gastos informativos (no cobrados)</span>
              <span>${fmt(totalGastosInfo)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Anticipos */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Anticipos recibidos</SectionTitle>
          {puedeEditar && (
            <button
              onClick={() => setShowAddAnticipo((v) => !v)}
              className="inline-flex items-center gap-1 rounded-[6px] bg-accent px-2 py-1 text-[11px] text-white hover:bg-accent-hover"
            >
              <i className="ti ti-plus" /> Agregar
            </button>
          )}
        </div>

        {showAddAnticipo && (
          <div className="mb-2 rounded-[8px] border border-accent/30 bg-accent-soft p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Fecha</label><input type="date" value={aFecha} onChange={(e) => setAFecha(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Monto ($)</label><input type="number" min="0" step="0.01" placeholder="0.00" value={aMonto} onChange={(e) => setAMonto(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Detalle (opcional)</label><input value={aDetalle} onChange={(e) => setADetalle(e.target.value)} placeholder="Ej: Primer anticipo" className={inputCls} /></div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddAnticipo(false)} className="rounded-[6px] border border-border px-3 py-1 text-[11px] text-muted hover:bg-soft">Cancelar</button>
              <button onClick={onSaveAnticipo} disabled={saving} className="rounded-[6px] bg-accent px-3 py-1 text-[11px] text-white hover:bg-accent-hover disabled:opacity-60">Guardar</button>
            </div>
          </div>
        )}

        {anticipos.length === 0
          ? <EmptyRow text="Sin anticipos registrados" />
          : (
            <div className="flex flex-col gap-1">
              {anticipos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-[8px] border border-border bg-surface px-3 py-2">
                  <span className="text-[11px] text-mute2 w-20 shrink-0">{fmtFecha(a.fecha)}</span>
                  <span className="flex-1 text-[12px] text-ink">{a.detalle ?? <span className="text-mute2">—</span>}</span>
                  <span className="text-[13px] font-semibold text-ink">${fmt(Number(a.monto))}</span>
                  {puedeEditar && (
                    <button onClick={async () => { await deleteAnticipo(a.id); onAnticipoDeleted(a.id) }}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-danger-soft hover:text-danger">
                      <i className="ti ti-trash text-[13px]" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex justify-end pt-1 text-[12px] font-semibold text-ink">
                Total: ${fmt(totalAnticipos)}
              </div>
            </div>
          )}
      </div>

      {/* Gastos */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Gastos adicionales</SectionTitle>
          {puedeEditar && (
            <button
              onClick={() => setShowAddGasto((v) => !v)}
              className="inline-flex items-center gap-1 rounded-[6px] bg-accent px-2 py-1 text-[11px] text-white hover:bg-accent-hover"
            >
              <i className="ti ti-plus" /> Agregar
            </button>
          )}
        </div>

        {showAddGasto && (
          <div className="mb-2 rounded-[8px] border border-accent/30 bg-accent-soft p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Fecha</label><input type="date" value={gFecha} onChange={(e) => setGFecha(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Monto ($)</label><input type="number" min="0" step="0.01" placeholder="0.00" value={gMonto} onChange={(e) => setGMonto(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Descripción</label><input value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="Ej: Notaría, perito, copias..." className={inputCls} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cobrable" checked={gCobrable} onChange={(e) => setGCobrable(e.target.checked)} className="h-3.5 w-3.5 accent-accent" />
              <label htmlFor="cobrable" className="text-[12px] text-ink cursor-pointer">Cobrable al cliente</label>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddGasto(false)} className="rounded-[6px] border border-border px-3 py-1 text-[11px] text-muted hover:bg-soft">Cancelar</button>
              <button onClick={onSaveGasto} disabled={saving} className="rounded-[6px] bg-accent px-3 py-1 text-[11px] text-white hover:bg-accent-hover disabled:opacity-60">Guardar</button>
            </div>
          </div>
        )}

        {gastos.length === 0
          ? <EmptyRow text="Sin gastos registrados" />
          : (
            <div className="flex flex-col gap-1">
              {gastos.map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-[8px] border border-border bg-surface px-3 py-2">
                  <span className="text-[11px] text-mute2 w-20 shrink-0">{fmtFecha(g.fecha)}</span>
                  <span className="flex-1 text-[12px] text-ink">{g.descripcion}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${g.cobrable ? 'bg-accent-soft text-accent' : 'bg-soft text-mute2 border border-border'}`}>
                    {g.cobrable ? 'Cobrable' : 'Informativo'}
                  </span>
                  <span className="text-[13px] font-semibold text-ink">${fmt(Number(g.monto))}</span>
                  {puedeEditar && (
                    <button onClick={async () => { await deleteGasto(g.id); onGastoDeleted(g.id) }}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-danger-soft hover:text-danger">
                      <i className="ti ti-trash text-[13px]" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex justify-end pt-1 text-[12px] font-semibold text-ink">
                Cobrables: ${fmt(totalGastosCob)}{totalGastosInfo > 0 && ` · Informativos: $${fmt(totalGastosInfo)}`}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

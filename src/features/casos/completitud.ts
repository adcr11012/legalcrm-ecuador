import type { Caso } from '@/types/database'

export type ItemCompletitud = { key: string; peso: number; cumplido: boolean }

export function calcularCompletitud(
  caso: Caso,
  tieneAbogado: boolean,
  tienePlazos: boolean,
  tieneDocumentos: boolean,
): { porcentaje: number; items: ItemCompletitud[] } {
  const items: ItemCompletitud[] = [
    { key: 'base', peso: 10, cumplido: true },
    { key: 'numero_causa', peso: 15, cumplido: Boolean(caso.numero_causa) },
    { key: 'juzgado', peso: 10, cumplido: Boolean(caso.juzgado) },
    { key: 'abogado', peso: 10, cumplido: tieneAbogado },
    { key: 'plazos', peso: 20, cumplido: tienePlazos },
    { key: 'documentos', peso: 10, cumplido: tieneDocumentos },
    { key: 'honorarios', peso: 10, cumplido: Boolean(caso.honorarios_tipo) },
  ]
  if (caso.es_contencioso) {
    items.push({ key: 'contraparte', peso: 15, cumplido: Boolean(caso.contraparte_nombre) })
  }
  const totalPeso = items.reduce((s, i) => s + i.peso, 0)
  const pesoCumplido = items.filter((i) => i.cumplido).reduce((s, i) => s + i.peso, 0)
  const porcentaje = Math.round((pesoCumplido / totalPeso) * 100)
  return { porcentaje, items }
}

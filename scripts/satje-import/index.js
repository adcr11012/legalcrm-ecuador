// Programa eSATJE — consulta el historial real de actuaciones judiciales
// para una lista de números de causa, y genera el archivo .json que se
// sube en /admin/esatje ("Subir resultados").
//
// Flujo real de la API (descubierto inspeccionando el tráfico de red):
//   1. GET  .../getIncidenteJudicatura/{numeroCausa}
//        -> lista de judicaturas por las que pasó la causa, cada una con
//           sus "incidentes" (traslados/etapas del proceso).
//   2. Por cada incidente encontrado, POST .../actuacionesJudiciales
//        -> lista real de actuaciones (oficios, notificaciones, escritos,
//           providencias, etc.) para ese incidente específico.
//
// Solo guardamos fecha + tipo + un resumen corto de cada actuación —
// nunca el texto legal completo del documento (que sí viene en la
// respuesta real, pero no lo usamos ni lo subimos).
//
// Cómo funciona:
//   1. Lee el .txt descargado desde /admin/esatje (un número de causa
//      por línea).
//   2. Abre un navegador real. TÚ resuelves el captcha y haces la
//      primera búsqueda a mano, como siempre.
//   3. Consulta automáticamente cada causa (los 2 pasos de arriba),
//      usando tu misma sesión ya autenticada (cookies reales, nunca
//      copiadas ni omitidas).
//   4. Guarda un .json con los movimientos encontrados.
//
// Uso:
//   1. cd scripts/satje-import
//   2. npm install
//   3. npx playwright install chromium   (solo la primera vez)
//   4. Copia el .txt descargado de /admin/esatje a esta carpeta como
//      "causas.txt" (o pásale la ruta como argumento).
//   5. npm start
//      (o: node index.js otra-ruta.txt)

import { chromium } from 'playwright'
import readline from 'node:readline/promises'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const rutaCausas = process.argv[2] ?? 'causas.txt'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const BASE_URL = 'https://api.funcionjudicial.gob.ec'

function leerCausas(ruta) {
  if (!existsSync(ruta)) {
    console.error(`No se encontró el archivo "${ruta}". Descárgalo desde /admin/esatje y ponlo en esta carpeta como "causas.txt", o pasa la ruta: node index.js ruta/al/archivo.txt`)
    process.exit(1)
  }
  return readFileSync(ruta, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

// Quita HTML y recorta a un resumen corto — nunca guardamos el
// documento legal completo, solo un vistazo de qué trata.
function resumirActividad(html, maxLen = 220) {
  if (!html) return undefined
  const texto = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&amp;/g, '&').replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  if (!texto) return undefined
  return texto.length > maxLen ? texto.slice(0, maxLen).trim() + '…' : texto
}

async function fetchEnPagina(page, url, options) {
  return page.evaluate(
    async ({ url, options }) => {
      const res = await fetch(url, { ...options, credentials: 'include' })
      return { status: res.status, ok: res.ok, body: await res.text() }
    },
    { url, options },
  )
}

// Nombres únicos, capitalizados como en SATJE, de una lista de litigantes.
function nombresLitigantes(lista) {
  const nombres = [...new Set((lista ?? []).map((l) => (l.nombresLitigante ?? '').trim()).filter(Boolean))]
  return nombres.length > 0 ? nombres.join('; ') : undefined
}

// "Datos generales" del proceso para UNA jurisdicción: número de proceso,
// materia y tipo de acción vienen de buscarCausas (son del proceso en
// general); judicatura/actor/demandado vienen de la propia judicatura
// (getIncidenteJudicatura), porque sí pueden variar entre instancias.
function extraerDatosGenerales(resultadoBusqueda, judicatura) {
  const actor = judicatura.lstIncidenteJudicatura?.flatMap((inc) => inc.lstLitiganteActor ?? [])
  const demandado = judicatura.lstIncidenteJudicatura?.flatMap((inc) => inc.lstLitiganteDemandado ?? [])
  return {
    numeroProceso: resultadoBusqueda?.idJuicio,
    materia: resultadoBusqueda?.nombreMateria,
    tipoAccion: resultadoBusqueda?.nombreTipoAccion,
    delitoAsunto: resultadoBusqueda?.nombreDelito,
    judicaturaActual: judicatura.nombreJudicatura,
    actor: nombresLitigantes(actor),
    demandado: nombresLitigantes(demandado),
  }
}

async function obtenerDatosBusqueda(page, numeroCausa) {
  const r = await fetchEnPagina(
    page,
    `${BASE_URL}/EXPEL-CONSULTA-CAUSAS-SERVICE/api/consulta-causas/informacion/buscarCausas?page=1&size=10`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ numeroCausa }) },
  )
  if (!r.ok) return undefined
  try {
    const data = JSON.parse(r.body)
    const lista = Array.isArray(data) ? data : (data.content ?? data.data ?? [])
    return lista[0]
  } catch {
    return undefined
  }
}

async function obtenerActuaciones(page, numeroCausa) {
  const datosBusqueda = await obtenerDatosBusqueda(page, numeroCausa)

  // Paso 1: judicaturas + incidentes por los que pasó la causa.
  const r1 = await fetchEnPagina(page, `${BASE_URL}/EXPEL-CONSULTA-CAUSAS-CLEX-SERVICE/api/consulta-causas-clex/informacion/getIncidenteJudicatura/${numeroCausa}`, { method: 'GET' })
  if (!r1.ok) return { ok: false, pidioCaptcha: r1.status === 401 || r1.status === 403 }

  let judicaturas
  try {
    judicaturas = JSON.parse(r1.body)
  } catch {
    return { ok: false, pidioCaptcha: false }
  }

  const jurisdicciones = []

  // Paso 2: por cada judicatura/incidente, trae sus actuaciones reales.
  for (const j of judicaturas ?? []) {
    const movimientos = []
    for (const inc of j.lstIncidenteJudicatura ?? []) {
      const body = {
        aplicativo: 'web',
        idIncidenteJudicatura: inc.idIncidenteJudicatura,
        idJudicatura: j.idJudicatura,
        idJuicio: numeroCausa,
        idMovimientoJuicioIncidente: inc.idMovimientoJuicioIncidente,
        incidente: inc.incidente,
        nombreJudicatura: j.nombreJudicatura,
      }
      const r2 = await fetchEnPagina(
        page,
        `${BASE_URL}/EXPEL-CONSULTA-CAUSAS-SERVICE/api/consulta-causas/informacion/actuacionesJudiciales`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      )
      if (!r2.ok) {
        if (r2.status === 401 || r2.status === 403) return { ok: false, pidioCaptcha: true }
        continue // esta judicatura/incidente falló, sigue con las demás
      }
      try {
        const actuaciones = JSON.parse(r2.body)
        for (const a of actuaciones ?? []) {
          movimientos.push({
            fecha: (a.fecha ?? '').slice(0, 10),
            tipo: (a.tipo ?? '').trim(),
            descripcion: resumirActividad(a.actividad),
            codigo: a.codigo != null ? String(a.codigo) : undefined,
          })
        }
      } catch {
        continue
      }
      await page.waitForTimeout(150)
    }
    movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha))
    jurisdicciones.push({
      jurisdiccion: j.nombreJudicatura ?? 'Sin nombre',
      ciudad: j.ciudad,
      datosGenerales: extraerDatosGenerales(datosBusqueda, j),
      movimientos,
    })
  }

  return { ok: true, jurisdicciones }
}

async function main() {
  const causas = leerCausas(rutaCausas)
  console.log(`${causas.length} números de causa cargados desde "${rutaCausas}".`)

  console.log('\nAbriendo navegador real...')
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('https://procesosjudiciales.funcionjudicial.gob.ec/causas')

  console.log('\n1) En la ventana que se abrió, resuelve el captcha y haz UNA búsqueda normal, como siempre.')
  await rl.question('   Cuando ya tengas resultados en pantalla, presiona Enter aquí para continuar...\n')

  const resultados = []
  let i = 0
  for (const numeroCausa of causas) {
    i++
    process.stdout.write(`[${i}/${causas.length}] ${numeroCausa}... `)
    try {
      let r = await obtenerActuaciones(page, numeroCausa)
      if (r.pidioCaptcha) {
        console.log('sesión expirada, pide captcha de nuevo.')
        console.log('Resuelve el captcha en la ventana del navegador y presiona Enter para seguir donde quedamos.')
        await rl.question('')
        r = await obtenerActuaciones(page, numeroCausa)
      }
      if (r.ok) {
        resultados.push({ numeroCausa, jurisdicciones: r.jurisdicciones })
        const totalMovimientos = r.jurisdicciones.reduce((sum, j) => sum + j.movimientos.length, 0)
        console.log(`${r.jurisdicciones.length} jurisdicción(es), ${totalMovimientos} movimiento(s).`)
      } else {
        console.log('sin datos / error, se omite.')
      }
    } catch (err) {
      console.log(`error inesperado (${err.message}), se omite.`)
    }
    await page.waitForTimeout(300) // pausa breve entre causas, no agresivo
  }

  const nombreArchivo = `resultados-satje-${new Date().toISOString().slice(0, 10)}.json`
  writeFileSync(nombreArchivo, JSON.stringify(resultados, null, 2), 'utf-8')

  console.log(`\n--- Listo ---`)
  console.log(`${resultados.length} causa(s) con datos, guardado en: ${nombreArchivo}`)
  console.log(`Sube ese archivo en /admin/esatje → "Subir resultados".`)

  await rl.question('\nPresiona Enter para cerrar el navegador...')
  await browser.close()
  rl.close()
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

// Programa eSATJE — consulta movimientos judiciales reales (traslados
// entre judicaturas) para una lista de números de causa, y genera el
// archivo .json que se sube en /admin/esatje ("Subir resultados").
//
// Cómo funciona:
//   1. Lee el .txt descargado desde /admin/esatje (un número de causa
//      por línea).
//   2. Abre un navegador real. TÚ resuelves el captcha y haces la
//      primera búsqueda a mano, como siempre.
//   3. A partir de ahí, consulta automáticamente el endpoint real de
//      movimientos para cada causa, usando tu misma sesión ya
//      autenticada (cookies reales del navegador, nunca copiadas ni
//      omitidas).
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

// Convierte la respuesta real de getIncidenteJudicatura (lista de
// judicaturas, cada una con sus traslados/incidentes) al formato
// {fecha, tipo, descripcion} que espera la app.
function extraerMovimientos(judicaturas) {
  const movimientos = []
  for (const j of judicaturas ?? []) {
    for (const inc of j.lstIncidenteJudicatura ?? []) {
      movimientos.push({
        fecha: (inc.fechaCrea ?? '').slice(0, 10), // YYYY-MM-DD
        tipo: `Traslado a: ${j.nombreJudicatura}`,
        descripcion: j.ciudad ? `Ciudad: ${j.ciudad}` : undefined,
      })
    }
  }
  // Ordena por fecha, más antiguo primero.
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return movimientos
}

async function consultarUna(page, numeroCausa) {
  const resultado = await page.evaluate(async (numeroCausa) => {
    const res = await fetch(
      `https://api.funcionjudicial.gob.ec/EXPEL-CONSULTA-CAUSAS-CLEX-SERVICE/api/consulta-causas-clex/informacion/getIncidenteJudicatura/${numeroCausa}`,
      { method: 'GET', credentials: 'include' },
    )
    return { status: res.status, ok: res.ok, body: await res.text() }
  }, numeroCausa)

  if (!resultado.ok) {
    return { ok: false, pidioCaptcha: resultado.status === 401 || resultado.status === 403 }
  }

  try {
    const json = JSON.parse(resultado.body)
    return { ok: true, movimientos: extraerMovimientos(json) }
  } catch {
    return { ok: false, pidioCaptcha: false, errorParseo: true }
  }
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
      const r = await consultarUna(page, numeroCausa)
      if (r.pidioCaptcha) {
        console.log('sesión expirada, pide captcha de nuevo.')
        console.log('Resuelve el captcha en la ventana del navegador y presiona Enter para seguir donde quedamos.')
        await rl.question('')
        // Reintenta esta misma causa después de resolver el captcha.
        const reintento = await consultarUna(page, numeroCausa)
        if (reintento.ok) {
          resultados.push({ numeroCausa, movimientos: reintento.movimientos })
          console.log(`  -> ${reintento.movimientos.length} movimiento(s) encontrado(s).`)
        } else {
          console.log('  -> Falló de nuevo, se omite esta causa.')
        }
      } else if (r.ok) {
        resultados.push({ numeroCausa, movimientos: r.movimientos })
        console.log(`${r.movimientos.length} movimiento(s).`)
      } else {
        console.log('sin datos / error, se omite.')
      }
    } catch (err) {
      console.log(`error inesperado (${err.message}), se omite.`)
    }
    await page.waitForTimeout(300) // pausa breve entre consultas, no agresivo
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

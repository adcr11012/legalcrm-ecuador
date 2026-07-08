// Script de PRUEBA, no de producción. Único objetivo: medir cuántas
// búsquedas seguidas acepta SATJE antes de volver a exigir el captcha,
// dentro de una sesión de navegador REAL donde el humano (tú) resuelve
// cada captcha que aparezca. Las siguientes búsquedas llaman a la API
// directamente, pero SIEMPRE desde adentro de esa misma pestaña
// autenticada (page.evaluate), con credentials:"include" — o sea, con
// tus cookies de sesión reales, nunca omitidas ni copiadas a mano.
//
// Uso:
//   1. cd scripts/satje-test
//   2. npm install
//   3. npx playwright install chromium   (solo la primera vez)
//   4. npm test
//
// Edita CAUSAS_DE_PRUEBA abajo con 4-5 números de causa reales tuyos
// antes de correr.

import { chromium } from 'playwright'
import readline from 'node:readline/promises'

const CAUSAS_DE_PRUEBA = [
  '09332201810951',
  '17297202605046G',
  '09332202608757',
  '09210202600699',
  '14255202600568',
  '09208202601896',
  '13333202100132',
  '13315201900306G',
]

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

async function buscarUna(page, numeroCausa, index) {
  try {
    // Llama a la misma API que usa la página, pero ejecutando el fetch
    // DESDE ADENTRO de la pestaña ya autenticada (page.evaluate corre el
    // código en el contexto real del navegador). El navegador agrega las
    // cookies de tu sesión real automáticamente — no las omitimos como
    // en la prueba manual anterior. Es la sesión legítima, solo que sin
    // simular clics en pantalla.
    const resultado = await page.evaluate(async (numeroCausa) => {
      const res = await fetch(
        'https://api.funcionjudicial.gob.ec/EXPEL-CONSULTA-CAUSAS-SERVICE/api/consulta-causas/informacion/buscarCausas?page=1&size=10',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include', // usa las cookies reales de esta pestaña
          body: JSON.stringify({
            numeroCausa,
            actor: { cedulaActor: '', nombreActor: '' },
            demandado: { cedulaDemandado: '', nombreDemandado: '' },
            provincia: '',
            numeroFiscalia: '',
            recaptcha: 'verdad',
            first: 1,
            pageSize: 10,
          }),
        },
      )
      return { status: res.status, ok: res.ok, body: await res.text() }
    }, numeroCausa)

    // Si la sesión ya no es válida, la API normalmente responde 401/403,
    // o el cuerpo indica que hace falta un captcha nuevo.
    const necesitaCaptcha = !resultado.ok || /captcha/i.test(resultado.body)

    let resumen = '(no se pudo interpretar la respuesta)'
    try {
      const json = JSON.parse(resultado.body)
      // Intenta detectar la cantidad de registros con nombres de campo comunes.
      const lista = json.content ?? json.data ?? json.registros ?? json.result ?? json
      const cantidad = Array.isArray(lista) ? lista.length : (json.totalElements ?? json.total ?? 'desconocida')
      resumen = `status ${resultado.status}, registros: ${cantidad}`
    } catch {
      resumen = `status ${resultado.status}, respuesta no era JSON: ${resultado.body.slice(0, 150)}`
    }
    console.log(`     (${resumen})`)

    return { numeroCausa, pidioCaptchaDeNuevo: necesitaCaptcha, status: resultado.status }
  } catch (err) {
    const archivo = `error-${index}-${numeroCausa}.png`
    await page.screenshot({ path: archivo }).catch(() => {})
    console.log(`  -> Error inesperado. Se guardó una captura: ${archivo}`)
    throw err
  }
}

async function main() {
  console.log('Abriendo navegador real...')
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('https://procesosjudiciales.funcionjudicial.gob.ec/causas')

  console.log('\n1) En la ventana que se abrió, resuelve el captcha y haz la PRIMERA búsqueda normalmente, como siempre.')
  await rl.question('   Cuando ya tengas resultados en pantalla, presiona Enter aquí para continuar...\n')

  const resultados = []
  let i = 0
  for (const numeroCausa of CAUSAS_DE_PRUEBA) {
    i++
    console.log(`Probando causa ${numeroCausa}...`)
    try {
      const r = await buscarUna(page, numeroCausa, i)
      resultados.push(r)
      if (r.pidioCaptchaDeNuevo) {
        console.log(`  -> Pidió captcha de nuevo en esta consulta. Resuélvelo en la ventana y presiona Enter para seguir.`)
        await rl.question('')
      } else {
        console.log('  -> Pasó directo, sin pedir captcha.')
      }
    } catch {
      console.log('  -> Falló esta consulta (ver captura guardada), sigo con la siguiente.')
      resultados.push({ numeroCausa, pidioCaptchaDeNuevo: null, fallo: true })
    }
  }

  console.log('\n--- Resumen ---')
  const primerFallo = resultados.findIndex((r) => r.pidioCaptchaDeNuevo)
  if (primerFallo === -1) {
    console.log(`Las ${resultados.length} búsquedas de prueba pasaron sin volver a pedir captcha.`)
  } else {
    console.log(`Se pudieron hacer ${primerFallo} búsqueda(s) seguidas antes de que volviera a pedir captcha.`)
  }

  // Prueba de carga: repite consultas (reutilizando la misma lista, dando
  // vueltas) durante 20 segundos, con una pausa breve entre cada una para
  // no saturar el servidor, y cuenta cuántas se completaron con éxito.
  console.log('\n2) Ahora una prueba de carga de 20 segundos, repitiendo las mismas causas en bucle...')
  const finEn = Date.now() + 20000
  let intentos = 0
  let exitosos = 0
  let pidieronCaptcha = 0
  while (Date.now() < finEn) {
    const numeroCausa = CAUSAS_DE_PRUEBA[intentos % CAUSAS_DE_PRUEBA.length]
    intentos++
    try {
      const r = await buscarUna(page, numeroCausa, `carga${intentos}`)
      if (r.pidioCaptchaDeNuevo) {
        pidieronCaptcha++
        console.log('  -> Pidió captcha durante la prueba de carga. Deteniendo la prueba aquí.')
        break
      } else {
        exitosos++
      }
    } catch {
      console.log('  -> Falló un intento durante la prueba de carga, sigo.')
    }
    await page.waitForTimeout(300) // pausa breve entre consultas, no agresivo
  }

  console.log('\n--- Resumen prueba de carga (20s) ---')
  console.log(`Intentos totales: ${intentos}`)
  console.log(`Exitosos: ${exitosos}`)
  console.log(`Pidieron captcha: ${pidieronCaptcha}`)

  await rl.question('\nPresiona Enter para cerrar el navegador...')
  await browser.close()
  rl.close()
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

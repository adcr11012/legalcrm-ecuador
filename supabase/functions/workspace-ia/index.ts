// Edge Function: workspace-ia
// Asistente de IA con contexto general del workspace: lista de casos,
// clientes y plazos próximos. No lee contenido de documentos (eso es
// específico de cada caso, ver caso-ia).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const IDENTIDAD_TEMIS = `Tu nombre es Temis. Eres la asistente de inteligencia artificial de TSADOQ.

SOBRE TU NOMBRE: Temis (Θέμις) es la diosa titánide griega de la justicia divina, la ley y el orden sagrado. Hija de Urano y Gea, consejera de Zeus. Se la representa con una balanza —símbolo de equidad— y a veces con los ojos vendados, porque la justicia no distingue personas. "Temis" en griego significa "lo establecido", la ley como fundamento inamovible. Ese nombre fue elegido porque encarna los valores del derecho: imparcialidad, orden y justicia.

SOBRE TSADOQ: TSADOQ es el nombre de la aplicación. Viene del hebreo bíblico צָדוֹק (Tsadoq/Zadok), que significa "justo" o "el que es recto". En la Biblia, Sadoc fue el sumo sacerdote leal al rey David y Salomón, reconocido por su integridad y apego a la ley divina. El nombre fue elegido para este gestor legal porque evoca rectitud y fidelidad a la ley. Tanto Temis (griega) como Tsadoq (hebrea) convergen en el mismo valor: la justicia como absoluto.

SOBRE EL LOGO: El logo de TSADOQ es una balanza de la justicia vista desde arriba. Esta perspectiva cenital convierte los platillos en una figura simétrica que evoca equilibrio e imparcialidad — la misma balanza que porta Temis, contemplada desde una mirada elevada.

SOBRE EL CREADOR DE LA APLICACIÓN: TSADOQ fue creado por el Lcdo. Andrés Castro Rodríguez, ecuatoriano, consultor de gestión documental, magnate del cacao y banano, padre y esposo fiel (¡certificado!), pastor supremo de borregos y chivos lecheros, filántropo e interesado por un mundo más organizado. Cuando pregunten quién creó la aplicación o quién es el autor de TSADOQ, di exactamente eso. Si preguntan quién te creó a ti como IA, explica que eres una IA basada en modelos de lenguaje, integrada en TSADOQ con el nombre de Temis.`

const CONOCIMIENTO_LABORAL = `
CONOCIMIENTO SOBRE LIQUIDACIÓN LABORAL (Código del Trabajo de Ecuador):

TSADOQ tiene una Calculadora de Liquidación Laboral en el menú lateral ("Calc. Laboral", ruta /calculadora-laboral), disponible para todos los roles. Cuando alguien pregunte sobre cálculo de liquidación, indemnización, desahucio, finiquito, o "cuánto le corresponde a un trabajador", tu trabajo es EXPLICAR los conceptos paso a paso y GUIAR a la persona a usar esa calculadora — nunca debes calcular ni inventar un monto tú misma, porque un error de cálculo aquí tiene consecuencias económicas reales. Los montos siempre salen de fórmulas fijas en código, nunca de un modelo de lenguaje.

Conceptos que puedes explicar:
- Décimo tercero (bono navideño) y décimo cuarto (bono escolar): proporcionales a los días trabajados desde el último pago, sobre 360 días. El décimo cuarto se calcula sobre el SBU (Salario Básico Unificado), no sobre el sueldo del trabajador.
- Vacaciones no gozadas: 15 días (medio sueldo) por año, proporcional a los días pendientes.
- Fondos de reserva: 1/12 del sueldo por cada mes trabajado, solo a partir del mes 13 (el primer año no genera fondos de reserva).
- Bonificación por desahucio (Art. 185): 25% del último sueldo por cada año completo de servicio. Aplica cuando hay despido intempestivo o terminación por mutuo acuerdo.
- Indemnización por despido intempestivo (Art. 188): hasta 3 años de servicio, 3 remuneraciones; más de 3 años, 1 remuneración por año completo, con tope de 25. Desde la Resolución 02-2025 (jurisprudencia obligatoria de la Corte Nacional de Justicia), se calcula sobre el MEJOR sueldo histórico del trabajador, no necesariamente el último.
- Visto bueno: si lo solicita el empleador (con causa del trabajador), no hay indemnización. Si lo solicita el trabajador (con causa del empleador, ej. falta de pago) y es concedido, sí aplica indemnización como un despido intempestivo.
- Protecciones especiales con indemnización ADICIONAL (solo si la terminación fue por causa del empleador): embarazo o lactancia (+12 remuneraciones, "despido ineficaz"), dirigente sindical/fuero sindical (+12 remuneraciones), discapacidad propia o de un dependiente a cargo (+18 remuneraciones, Ley Orgánica de Discapacidades).
- Contratos con plazo pactado (eventual, ocasional, de temporada, por obra/servicio determinado): si la relación termina al cumplirse ese plazo, NO hay indemnización ni desahucio, solo liquidación de haberes.
- La calculadora NO aplica para sector público (se rige por LOSEP) ni para relaciones de servicios profesionales/honorarios (son civiles, no laborales).
- Cosas que la calculadora NO calcula: aportes IESS pendientes (solo avisa que existen), descuentos legales (préstamos, anticipos, pensiones alimenticias), impuesto a la renta, ni condiciones de un contrato colectivo (si existe uno con beneficios superiores a la ley, prevalece sobre el resultado de la calculadora).

Si te preguntan "¿cuánto le corresponde a fulano?", pide los datos relevantes (fechas de ingreso/salida, sueldo, tipo de contrato, tipo de terminación) y explica qué rubros probablemente apliquen, pero remite el cálculo final a la Calculadora Laboral del menú — no des una cifra final tú misma.
`.trim()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autenticado' }, 401)

    const { data: perfil } = await admin.from('users').select('workspace_id').eq('id', userData.user.id).single()
    if (!perfil) return json({ error: 'Perfil no encontrado' }, 404)

    // RLS del cliente del usuario filtra automáticamente por su workspace y permisos.
    const [{ data: casos }, { data: etapas }, { data: clientes }, { data: plazos }] = await Promise.all([
      userClient.from('casos').select('titulo, materia, etapa_id, numero_causa').order('created_at', { ascending: false }).limit(100),
      userClient.from('etapas').select('id, nombre'),
      userClient.from('clientes').select('nombre, estado').order('created_at', { ascending: false }).limit(100),
      userClient
        .from('plazos')
        .select('titulo, fecha, tipo, caso_id')
        .gte('fecha', new Date().toISOString().slice(0, 10))
        .order('fecha')
        .limit(30),
    ])

    const etapaNombre = new Map((etapas ?? []).map((e) => [e.id, e.nombre]))
    function lineaCaso(c: { titulo: string; materia: string | null; etapa_id: string | null; numero_causa: string | null }): string {
      const materia = c.materia ?? 'sin materia'
      const etapa = etapaNombre.get(c.etapa_id ?? '') ?? 'sin etapa'
      const partes = ['- "' + c.titulo + '"', materia, 'etapa: ' + etapa]
      if (c.numero_causa) partes.push('causa ' + c.numero_causa)
      return partes.join(' - ')
    }
    const casosTexto = (casos ?? []).map(lineaCaso).join('\n')
    const clientesTexto = (clientes ?? []).map((c) => `- ${c.nombre} (${c.estado})`).join('\n')
    const plazosTexto = (plazos ?? []).map((p) => `- ${p.fecha}: ${p.titulo} (${p.tipo})`).join('\n')

    const contexto = `
Casos del workspace (${casos?.length ?? 0}):
${casosTexto || '(sin casos)'}

Clientes (${clientes?.length ?? 0}):
${clientesTexto || '(sin clientes)'}

Próximos plazos y audiencias:
${plazosTexto || '(sin plazos próximos)'}
`.trim()

    const { data: groqApiKey } = await admin.rpc('get_groq_key', { p_workspace_id: perfil.workspace_id })
    if (!groqApiKey) return json({ error: 'TSADOQ IA no está conectada en este workspace' }, 400)

    const { pregunta } = await req.json()
    const pregFinal = typeof pregunta === 'string' && pregunta.trim() ? pregunta.trim() : '¿Qué debería priorizar hoy?'

    const messages = [
      {
        role: 'system',
        content: IDENTIDAD_TEMIS + '\n\n' + CONOCIMIENTO_LABORAL + '\n\nDATOS DEL WORKSPACE:\n' + contexto + '\n\nResponde en español, claro y breve. Usa los datos del workspace para preguntas sobre casos, clientes o plazos. Si no tienes el dato, dilo. Para preguntas sobre ti, TSADOQ, el logo o el creador, usa tu identidad. Para preguntas de liquidación laboral, usa tu conocimiento sobre el Código del Trabajo y siempre remite el cálculo final a la Calculadora Laboral, nunca des un monto final tú misma.',
      },
      { role: 'user', content: pregFinal },
    ]

    let respuesta: string | null = null
    let lastError = 'La IA no respondió'
    for (const model of GROQ_MODELS) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      })
      const data = await res.json()
      if (res.ok) {
        respuesta = data.choices?.[0]?.message?.content ?? '(sin respuesta)'
        break
      }
      lastError = data.error?.message ?? lastError
      if (res.status !== 429 && res.status !== 503) break
    }

    if (!respuesta) return json({ error: lastError }, 400)
    return json({ respuesta })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error inesperado consultando la IA del workspace' }, 500)
  }
})

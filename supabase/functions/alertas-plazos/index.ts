// Edge Function: alertas-plazos
// Corre diariamente (vía cron). Busca plazos próximos a vencer dentro de la
// ventana de anticipación configurada por cada workspace, envía un correo
// vía Resend a los abogados asignados + administradores, y marca alertado=true.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('ALERTAS_FROM_EMAIL') ?? 'TSADOQ <onboarding@resend.dev>'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function enviarCorreo(to: string[], asunto: string, html: string) {
  if (to.length === 0) return
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject: asunto, html }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('Resend error', res.status, text)
  }
}

function diasEntre(hoy: string, fecha: string): number {
  const a = new Date(hoy + 'T00:00:00Z').getTime()
  const b = new Date(fecha + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86400000)
}

async function resolverEmailsPersonas(casoPersonaIds: string[]): Promise<string[]> {
  if (casoPersonaIds.length === 0) return []
  const { data: personas } = await supabase.from('caso_personas').select('*').in('id', casoPersonaIds)
  if (!personas || personas.length === 0) return []

  const userIds = personas.filter((p) => p.user_id).map((p) => p.user_id)
  const clienteIds = personas.filter((p) => p.cliente_id).map((p) => p.cliente_id)

  const [usersRes, clientesRes] = await Promise.all([
    userIds.length > 0 ? supabase.from('users').select('id, email').in('id', userIds) : Promise.resolve({ data: [] }),
    clienteIds.length > 0 ? supabase.from('clientes').select('id, email').in('id', clienteIds) : Promise.resolve({ data: [] }),
  ])
  const usersById = new Map((usersRes.data ?? []).map((u: { id: string; email: string }) => [u.id, u.email]))
  const clientesById = new Map((clientesRes.data ?? []).map((c: { id: string; email: string | null }) => [c.id, c.email]))

  const emails = new Set<string>()
  for (const p of personas) {
    if (p.user_id && usersById.has(p.user_id)) emails.add(usersById.get(p.user_id))
    else if (p.cliente_id && clientesById.get(p.cliente_id)) emails.add(clientesById.get(p.cliente_id)!)
    else if (p.email_externo) emails.add(p.email_externo)
  }
  return Array.from(emails).filter(Boolean)
}

// Recordatorios escalonados (opt-in por plazo): 30 días, 8 días, 48 horas antes.
// Solo se evalúan a partir del día siguiente a la creación, para no duplicar
// el aviso inicial de agendamiento con el primer recordatorio.
async function procesarRecordatoriosEscalonados(hoy: string) {
  const { data: plazos, error } = await supabase
    .from('plazos')
    .select('*, casos!inner(titulo)')
    .eq('recordatorios_activos', true)
    .gte('fecha', hoy)
    .lt('created_at', hoy)

  if (error) {
    console.error(error)
    return 0
  }

  const etapas = [
    { campo: 'aviso_48h_enviado', maxDias: 2, label: '48 horas' },
    { campo: 'aviso_8_enviado', maxDias: 8, label: '8 días' },
    { campo: 'aviso_30_enviado', maxDias: 30, label: '30 días' },
  ] as const

  let enviados = 0

  for (const plazo of plazos ?? []) {
    const caso = (plazo as { casos: { titulo: string } }).casos
    const dias = diasEntre(hoy, plazo.fecha)

    for (const etapa of etapas) {
      if (dias <= etapa.maxDias && !plazo[etapa.campo]) {
        const emailsPersonas = await resolverEmailsPersonas(plazo.notificar_a ?? [])
        const emailsExternos = (plazo.notificar_externos ?? []).filter(Boolean)
        const destinatarios = Array.from(new Set([...emailsPersonas, ...emailsExternos]))

        if (destinatarios.length > 0) {
          const fechaFmt = new Date(plazo.fecha + 'T00:00:00Z').toLocaleDateString('es-EC', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          await enviarCorreo(
            destinatarios,
            `Recordatorio (quedan ${dias} días): ${plazo.titulo} — ${caso.titulo}`,
            `<p>Recordatorio de <strong>${plazo.titulo}</strong> en <strong>${caso.titulo}</strong>:</p>
             <p>Fecha: ${fechaFmt} (quedan ${dias} día${dias === 1 ? '' : 's'})</p>
             <p>— TSADOQ</p>`,
          )
          enviados++
        }

        await supabase.from('plazos').update({ [etapa.campo]: true }).eq('id', plazo.id)
        break // un solo aviso por día, el más urgente que aplique
      }
    }
  }

  return enviados
}

Deno.serve(async () => {
  const hoy = todayISO()

  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, nombre, notif_email, dias_anticipacion')

  if (wsError) {
    console.error(wsError)
    return new Response(JSON.stringify({ error: wsError.message }), { status: 500 })
  }

  let alertados = 0

  for (const ws of workspaces ?? []) {
    if (!ws.notif_email) continue
    const limite = addDays(hoy, ws.dias_anticipacion)

    const { data: plazos, error: plazosError } = await supabase
      .from('plazos')
      .select('id, titulo, fecha, tipo, caso_id, casos!inner(id, titulo, workspace_id)')
      .eq('alertado', false)
      .gte('fecha', hoy)
      .lte('fecha', limite)
      .eq('casos.workspace_id', ws.id)

    if (plazosError) {
      console.error(plazosError)
      continue
    }

    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('workspace_id', ws.id)
      .eq('rol', 'administrador')
    const adminEmails = (admins ?? []).map((a) => a.email)

    for (const plazo of plazos ?? []) {
      const caso = (plazo as { casos: { id: string; titulo: string } }).casos

      const { data: personas } = await supabase
        .from('caso_personas')
        .select('user_id')
        .eq('caso_id', plazo.caso_id)
        .eq('rol', 'abogado')
        .not('user_id', 'is', null)

      const userIds = (personas ?? []).map((p) => p.user_id).filter(Boolean) as string[]
      let abogadoEmails: string[] = []
      if (userIds.length > 0) {
        const { data: usuarios } = await supabase.from('users').select('email').in('id', userIds)
        abogadoEmails = (usuarios ?? []).map((u) => u.email)
      }

      const destinatarios = Array.from(new Set([...adminEmails, ...abogadoEmails]))

      if (destinatarios.length > 0) {
        const fechaFmt = new Date(plazo.fecha + 'T00:00:00Z').toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        await enviarCorreo(
          destinatarios,
          `Recordatorio: ${plazo.titulo} — ${caso.titulo}`,
          `<p>Tienes un ${plazo.tipo} próximo en <strong>${caso.titulo}</strong>:</p>
           <p><strong>${plazo.titulo}</strong><br>Fecha: ${fechaFmt}</p>
           <p>— TSADOQ</p>`,
        )
        alertados++
      } else {
        console.log(`Plazo ${plazo.id} sin destinatarios (sin abogado asignado ni admin).`)
      }

      await supabase.from('plazos').update({ alertado: true }).eq('id', plazo.id)
    }
  }

  const recordatoriosEnviados = await procesarRecordatoriosEscalonados(hoy)

  return new Response(JSON.stringify({ ok: true, alertados, recordatoriosEnviados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

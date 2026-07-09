// Edge Function: calendar-sync-event
// Crea/actualiza/cancela el evento de Google Calendar correspondiente a un
// plazo. Usa la misma cuenta de Google conectada para Drive (drive_conexion).
// Los invitados son las personas del caso seleccionadas en "notificar_a".

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokenJson = await res.json()
  if (!res.ok) throw new Error(tokenJson.error_description ?? 'No se pudo renovar el acceso a Google')
  return tokenJson.access_token
}

async function resolverEmails(casoPersonaIds: string[]): Promise<string[]> {
  if (casoPersonaIds.length === 0) return []
  const { data: personas } = await admin.from('caso_personas').select('*').in('id', casoPersonaIds)
  if (!personas || personas.length === 0) return []

  const userIds = personas.filter((p) => p.user_id).map((p) => p.user_id)
  const clienteIds = personas.filter((p) => p.cliente_id).map((p) => p.cliente_id)

  const [usersRes, clientesRes] = await Promise.all([
    userIds.length > 0 ? admin.from('users').select('id, email').in('id', userIds) : Promise.resolve({ data: [] }),
    clienteIds.length > 0 ? admin.from('clientes').select('id, email').in('id', clienteIds) : Promise.resolve({ data: [] }),
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'No autenticado' }, 401)
    }

    const { data: perfil } = await admin.from('users').select('workspace_id').eq('id', userData.user.id).single()
    if (!perfil) {
      return json({ error: 'Perfil no encontrado' }, 404)
    }

    const { plazo_id, accion } = await req.json()
    if (!plazo_id || !accion) {
      return json({ error: 'Falta plazo_id o accion' }, 400)
    }

    const { data: plazo } = await admin.from('plazos').select('*').eq('id', plazo_id).eq('workspace_id', perfil.workspace_id).single()
    if (!plazo) {
      return json({ error: 'Plazo no encontrado' }, 404)
    }

    const { data: conexion } = await admin
      .from('drive_conexion')
      .select('refresh_token')
      .eq('workspace_id', perfil.workspace_id)
      .single()
    if (!conexion?.refresh_token) {
      // Sin cuenta de Google conectada — no es un error bloqueante, simplemente no sincroniza.
      return json({ ok: true, sincronizado: false, motivo: 'Sin cuenta de Google conectada' })
    }

    const accessToken = await getAccessToken(conexion.refresh_token)

    if (accion === 'cancelar') {
      if (plazo.google_event_id) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${plazo.google_event_id}?sendUpdates=all`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
      return json({ ok: true, sincronizado: true })
    }

    // accion === 'upsert'
    const emailsPersonas = await resolverEmails(plazo.notificar_a ?? [])
    const emailsExternos = (plazo.notificar_externos ?? []).filter(Boolean)
    const emails = Array.from(new Set([...emailsPersonas, ...emailsExternos]))
    const attendees = emails.map((email) => ({ email }))

    const eventBody = {
      summary: `TSADOQ - ${plazo.titulo}`,
      description: plazo.descripcion ?? undefined,
      start: { date: plazo.fecha },
      end: { date: plazo.fecha },
      attendees,
    }

    let eventId = plazo.google_event_id
    let calRes: Response
    if (eventId) {
      calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody) },
      )
      if (calRes.status === 404) {
        // El evento fue borrado manualmente en Calendar — crea uno nuevo.
        eventId = null
      }
    }
    if (!eventId) {
      calRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody) },
      )
    }

    const calJson = await calRes!.json()
    if (!calRes!.ok) {
      console.error('Calendar sync failed', calJson)
      return json({ ok: true, sincronizado: false, motivo: calJson.error?.message ?? 'Error de Google Calendar' })
    }

    await admin.from('plazos').update({ google_event_id: calJson.id }).eq('id', plazo_id)

    return json({ ok: true, sincronizado: true, google_event_id: calJson.id })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Error inesperado sincronizando con Calendar' }, 500)
  }
})

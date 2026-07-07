// Script de prueba: crea 3 casos de ejemplo, un grupo con hasta 3 usuarios
// del workspace, y asigna el grupo a los 3 casos.
//
// Uso:
//   1. Copia .env.local y agrega tus credenciales de login:
//        SEED_EMAIL=tu_correo@ejemplo.com
//        SEED_PASSWORD=tu_password
//   2. Ejecuta: node scripts/seed-test-grupo.mjs
//
// Requiere que ya existan al menos 1 usuario (tú) en el workspace.
// Si hay menos de 3 usuarios, usa los que existan.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(path) {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  } catch {}
}

loadEnv('.env.local')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const EMAIL = process.env.SEED_EMAIL
const PASSWORD = process.env.SEED_PASSWORD

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local')
  process.exit(1)
}
if (!EMAIL || !PASSWORD) {
  console.error('Agrega SEED_EMAIL y SEED_PASSWORD a .env.local (tu cuenta admin del workspace)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log('Iniciando sesión...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authError) throw authError
  const userId = authData.user.id
  console.log('Sesión iniciada como', authData.user.email)

  const { data: profile, error: profileError } = await supabase.from('users').select('*').eq('id', userId).single()
  if (profileError) throw profileError
  const workspaceId = profile.workspace_id
  console.log('Workspace:', workspaceId)

  // 1. Usuarios del workspace (hasta 3)
  const { data: usuarios, error: usuariosError } = await supabase.from('users').select('*').eq('workspace_id', workspaceId).limit(3)
  if (usuariosError) throw usuariosError
  console.log(`Usuarios encontrados: ${usuarios.length}`, usuarios.map((u) => u.nombre))

  // 2. Cliente de prueba
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .insert({
      workspace_id: workspaceId,
      nombre: 'Cliente de Prueba SEED',
      tipo: 'persona_natural',
      estado: 'activo',
      etiquetas: ['Prueba'],
    })
    .select('*')
    .single()
  if (clienteError) throw clienteError
  console.log('Cliente de prueba creado:', cliente.nombre)

  // 3. Tres casos de ejemplo
  const casosData = [
    { titulo: 'Caso Prueba — Laboral SEED', materia: 'laboral', tipo_accion: 'despido_intempestivo', etiquetas: ['Prueba', 'Externo'] },
    { titulo: 'Caso Prueba — Civil SEED', materia: 'civil', tipo_accion: 'cobro_dinero', etiquetas: ['Prueba', 'Urgente'] },
    { titulo: 'Caso Prueba — Familia SEED', materia: 'familia', tipo_accion: 'divorcio', etiquetas: ['Prueba'] },
  ]

  const casosCreados = []
  for (const c of casosData) {
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        titulo: c.titulo,
        materia: c.materia,
        tipo_accion: c.tipo_accion,
        cliente_id: cliente.id,
        es_contencioso: true,
        etiquetas: c.etiquetas,
      })
      .select('*')
      .single()
    if (casoError) throw casoError
    casosCreados.push(caso)
    console.log('Caso creado:', caso.titulo)

    // vincula cliente + creador como abogado
    await supabase.from('caso_personas').insert({ caso_id: caso.id, cliente_id: cliente.id, nombre_externo: cliente.nombre, rol: 'cliente' })
    await supabase.from('caso_personas').insert({ caso_id: caso.id, user_id: userId, rol: 'abogado' })
  }

  // 4. Grupo de prueba con hasta 3 usuarios
  const { data: grupo, error: grupoError } = await supabase
    .from('grupos')
    .insert({ workspace_id: workspaceId, nombre: 'Equipo Prueba SEED' })
    .select('*')
    .single()
  if (grupoError) throw grupoError
  console.log('Grupo creado:', grupo.nombre)

  for (const u of usuarios) {
    const { error } = await supabase.from('grupo_usuarios').insert({ grupo_id: grupo.id, user_id: u.id })
    if (error && error.code !== '23505') throw error
  }
  console.log(`Miembros añadidos al grupo: ${usuarios.length}`)

  // 5. Asigna el grupo (todos sus miembros) a cada uno de los 3 casos
  for (const caso of casosCreados) {
    for (const u of usuarios) {
      const { error } = await supabase.from('caso_personas').insert({ caso_id: caso.id, user_id: u.id, rol: 'abogado' })
      // Ignora duplicado si el usuario ya estaba (p.ej. el creador)
      if (error && error.code !== '23505') throw error
    }
  }
  console.log('Grupo asignado a los 3 casos de prueba.')

  console.log('\n✔ Listo. Revisa en la app: 3 casos con etiqueta "Prueba", cliente "Cliente de Prueba SEED" y grupo "Equipo Prueba SEED".')
}

main().catch((err) => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})

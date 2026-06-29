import { supabase } from '@/lib/supabase'

export type GeminiEstado = { conectado: boolean }

export async function getGeminiEstado(): Promise<GeminiEstado> {
  const { data, error } = await supabase.rpc('gemini_estado')
  if (error) throw error
  return data?.[0] ?? { conectado: false }
}

export async function desconectarGemini(): Promise<void> {
  const { error } = await supabase.rpc('gemini_desconectar')
  if (error) throw error
}

async function authHeader() {
  const { data: session } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' }
}

export async function conectarGemini(apiKey: string): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-conectar`
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: JSON.stringify({ api_key: apiKey }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo conectar Gemini')
}

export async function probarGemini(prompt?: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-test`
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: JSON.stringify({ prompt }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Gemini no respondió')
  return json.respuesta
}

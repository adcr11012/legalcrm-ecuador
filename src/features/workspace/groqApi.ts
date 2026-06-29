import { supabase } from '@/lib/supabase'

export type GroqEstado = { conectado: boolean }

export const GROQ_MODEL_LABEL = 'Llama 3.3 70B (vía Groq)'

export async function getGroqEstado(): Promise<GroqEstado> {
  const { data, error } = await supabase.rpc('groq_estado')
  if (error) throw error
  return data?.[0] ?? { conectado: false }
}

export async function desconectarGroq(): Promise<void> {
  const { error } = await supabase.rpc('groq_desconectar')
  if (error) throw error
}

async function authHeader() {
  const { data: session } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' }
}

export async function conectarGroq(apiKey: string): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/groq-conectar`
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: JSON.stringify({ api_key: apiKey }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo conectar la IA')
}

export async function probarGroq(prompt?: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/groq-test`
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: JSON.stringify({ prompt }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'La IA no respondió')
  return json.respuesta
}

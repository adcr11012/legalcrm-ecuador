import { supabase } from '@/lib/supabase'

export type OpenRouterEstado = { conectado: boolean }

export const OPENROUTER_MODEL_LABEL = 'NVIDIA Nemotron Nano VL (vía OpenRouter)'

export async function getOpenRouterEstado(): Promise<OpenRouterEstado> {
  const { data, error } = await supabase.rpc('openrouter_estado')
  if (error) throw error
  return data?.[0] ?? { conectado: false }
}

export async function desconectarOpenRouter(): Promise<void> {
  const { error } = await supabase.rpc('openrouter_desconectar')
  if (error) throw error
}

async function authHeader() {
  const { data: session } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' }
}

export async function conectarOpenRouter(apiKey: string): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-conectar`
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: JSON.stringify({ api_key: apiKey }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se pudo conectar')
}

export async function probarOpenRouter(prompt?: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-test`
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: JSON.stringify({ prompt }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No respondió')
  return json.respuesta
}

import { supabase } from '@/lib/supabase'

export async function preguntarCasoIA(casoId: string, pregunta?: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/caso-ia`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ caso_id: casoId, pregunta }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'La IA no respondió')
  return json.respuesta
}

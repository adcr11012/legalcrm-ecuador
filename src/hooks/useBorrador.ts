import { useState } from 'react'

// Persiste un campo de texto en sessionStorage mientras se escribe — para
// no perderlo si el celular descarga la pestaña de memoria al cambiar de
// app (comportamiento común de Chrome/Android bajo poca RAM) y la recarga
// de cero al volver. sessionStorage sobrevive esa recarga porque el
// sistema operativo conserva la sesión de la pestaña, a diferencia del
// estado de React que se pierde por completo.
export function useBorrador(clave: string) {
  const key = `tsadoq_borrador_${clave}`
  const [valor, setValorState] = useState(() => sessionStorage.getItem(key) ?? '')

  function setValor(v: string) {
    setValorState(v)
    if (v) sessionStorage.setItem(key, v)
    else sessionStorage.removeItem(key)
  }

  function limpiar() {
    setValorState('')
    sessionStorage.removeItem(key)
  }

  return [valor, setValor, limpiar] as const
}

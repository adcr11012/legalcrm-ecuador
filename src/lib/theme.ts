export type Tema = 'claro' | 'oscuro' | 'moderno'

const STORAGE_KEY = 'tsadoq-theme'

export function getTema(): Tema {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'oscuro' || v === 'moderno' ? v : 'claro'
}

export function setTema(tema: Tema) {
  localStorage.setItem(STORAGE_KEY, tema)
  if (tema === 'claro') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', tema)
  }
}

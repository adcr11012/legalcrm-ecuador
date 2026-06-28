import { createContext, useContext, useEffect } from 'react'

export type PageAction = { label: string; onClick: () => void } | null

export const PageActionContext = createContext<(action: PageAction) => void>(() => {})

export function usePageAction(action: PageAction) {
  const setAction = useContext(PageActionContext)
  const label = action?.label
  const onClick = action?.onClick

  useEffect(() => {
    setAction(label && onClick ? { label, onClick } : null)
    return () => setAction(null)
  }, [label, onClick, setAction])
}

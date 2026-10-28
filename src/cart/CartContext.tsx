import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type CartLine = { id: number; qty: number }
type Ctx = {
  lines: CartLine[]; count: number
  add: (id: number) => void; setQty: (id: number, qty: number) => void; remove: (id: number) => void; clear: () => void
}

const KEY = 'thuribles-cart'
const MAX = 99
const CartCtx = createContext<Ctx>({ lines: [], count: 0, add: () => {}, setQty: () => {}, remove: () => {}, clear: () => {} })
export const useCart = () => useContext(CartCtx)

function read(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((l) => Number.isInteger(l?.id) && Number.isInteger(l?.qty) && l.qty > 0) : []
  } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(read)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch { } }, [lines])

  const add = useCallback((id: number) => setLines((ls) =>
    ls.some((l) => l.id === id) ? ls.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX, l.qty + 1) } : l)) : [...ls, { id, qty: 1 }]), [])
  const setQty = useCallback((id: number, qty: number) => setLines((ls) =>
    ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(MAX, qty || 1)) } : l))), [])
  const remove = useCallback((id: number) => setLines((ls) => ls.filter((l) => l.id !== id)), [])
  const clear = useCallback(() => setLines([]), [])

  return <CartCtx.Provider value={{ lines, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }}>{children}</CartCtx.Provider>
}

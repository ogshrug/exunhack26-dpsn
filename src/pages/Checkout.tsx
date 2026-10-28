import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Minus, Plus, Trash2, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { errText } from '../lib/upload'
import PageHeader from '../components/PageHeader'
import CheckoutAnimation from '../components/CheckoutAnimation'
import type { Listing } from '../components/ListingCard'

const FEE = 1000
type Method = 'dead_drop' | 'cult_delivery'

export default function Checkout() {
  const nav = useNavigate()
  const { balance, refreshBalance } = useAuth()
  const { lines, setQty, remove, clear } = useCart()
  const [items, setItems] = useState<Record<number, Listing>>({})
  const [loaded, setLoaded] = useState(false)
  const [method, setMethod] = useState<Method>('dead_drop')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [err, setErr] = useState('')

  const ids = lines.map((l) => l.id).join(',')
  useEffect(() => {
    if (!ids) { setLoaded(true); return }
    supabase.from('listings').select('*').in('id', ids.split(',').map(Number)).eq('category', 'substance').then(({ data }) => {
      setItems(Object.fromEntries(((data as Listing[]) ?? []).map((l) => [l.id, l])))
      setLoaded(true)
    })
  }, [ids])

  useEffect(() => { if (loaded) lines.forEach((l) => { if (!items[l.id]) remove(l.id) }) }, [loaded, items, lines, remove])

  const rows = lines.filter((l) => items[l.id]).map((l) => ({ ...l, item: items[l.id] }))
  const subtotal = rows.reduce((n, r) => n + Number(r.item.price) * r.qty, 0)
  const fee = method === 'cult_delivery' ? FEE : 0
  const total = subtotal + fee
  const short = balance != null && balance < total

  async function checkout(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('buy_cart', { p_items: rows.map((r) => ({ id: r.id, qty: r.qty })), p_method: method, p_address: address })
    if (error) { setErr(errText(error)); setBusy(false); return }
    await refreshBalance()
    clear()
    setPlaced(true)
  }

  if (placed) return <CheckoutAnimation method={method} onDone={() => nav('/market?tab=activity')} />
  if (!loaded) return <div className="label label-crimson">loading…</div>
  if (!rows.length) return (
    <div className="card text-center py-14 max-w-xl">
      <h2 className="text-white text-lg font-semibold">Your cart is empty.</h2>
      <p className="text-mist text-sm mt-1 mb-5">Add substances from the marketplace.</p>
      <Link to="/market" className="btn btn-primary">Browse substances</Link>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader tag="Cart" title="Complete" accent="your order" />
      <form onSubmit={checkout} className="grid md:grid-cols-[1fr_18rem] gap-6">
        <div className="space-y-5 min-w-0">
          <div className="space-y-3">
            {rows.map(({ id, qty, item }) => (
              <div key={id} className="card flex gap-4 items-center">
                <img src={item.image_url} alt="" className="w-20 aspect-[4/3] object-cover rounded-lg shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-semibold truncate">{item.title}</h2>
                  <p className="label">◈ {Number(item.price).toLocaleString()} each</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" className="icon-tile !w-8 !h-8" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(id, qty - 1)}><Minus size={14} /></button>
                    <input aria-label="Quantity" className="input !w-14 !py-1 text-center" type="number" min={1} max={99} value={qty} onChange={(e) => setQty(id, Number(e.target.value))} />
                    <button type="button" className="icon-tile !w-8 !h-8" aria-label="Increase quantity" disabled={qty >= 99} onClick={() => setQty(id, qty + 1)}><Plus size={14} /></button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white font-semibold">◈ {(Number(item.price) * qty).toLocaleString()}</div>
                  <button type="button" className="text-xs text-haze hover:text-crimson inline-flex items-center gap-1 mt-2" onClick={() => remove(id)}><Trash2 size={12} />Remove</button>
                </div>
              </div>
            ))}
          </div>

          <fieldset className="space-y-2">
            <legend className="label mb-2">Delivery</legend>
            {([
              ['dead_drop', 'Dead drop', 'Left at a hidden spot near your address. Free.', MapPin],
              ['cult_delivery', 'Hand delivered by the cult', `A member brings it to you. Extra fee ◈ ${FEE.toLocaleString()} for the whole order.`, Truck],
            ] as const).map(([key, title, sub, Icon]) => (
              <label key={key} className={`card flex items-center gap-3 cursor-pointer card-hover ${method === key ? '!border-crimson' : ''}`}>
                <input type="radio" name="method" className="accent-[#df2935]" checked={method === key} onChange={() => setMethod(key)} />
                <Icon size={18} className="text-crimson" />
                <span><span className="block text-white text-sm font-semibold">{title}</span><span className="text-xs text-mist">{sub}</span></span>
              </label>
            ))}
          </fieldset>

          <div><label className="label" htmlFor="co-addr">{method === 'dead_drop' ? 'Address or area for the drop' : 'Delivery address'}</label>
            <textarea id="co-addr" className="input mt-1" rows={3} required maxLength={240} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </div>

        <aside className="card h-fit space-y-3">
          <h2 className="label label-crimson">Summary</h2>
          <div className="flex justify-between text-sm"><span className="text-mist">Items ({rows.reduce((n, r) => n + r.qty, 0)})</span><span className="text-white">◈ {subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm"><span className="text-mist">Cult delivery</span><span className="text-white">◈ {fee.toLocaleString()}</span></div>
          <div className="flex justify-between border-t border-line pt-3"><span className="text-white font-semibold">Total</span><span className="text-xl text-white font-semibold">◈ {total.toLocaleString()}</span></div>
          <div className="flex justify-between label"><span>Your balance</span><span>◈ {balance?.toLocaleString() ?? '…'}</span></div>
          {short && <p className="text-xs text-crimson-soft">Not enough bits. <Link to="/exchange" className="underline">Top up</Link></p>}
          {err && <p className="text-xs text-crimson-soft" role="alert">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || short || !address.trim()}>{busy ? 'Placing order…' : 'Checkout'}</button>
        </aside>
      </form>
    </div>
  )
}

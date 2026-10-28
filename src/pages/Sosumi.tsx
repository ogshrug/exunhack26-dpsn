import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Home, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import CityScene, { type Ownership } from '../components/CityScene'
import { byId, KIND_NAME, PRICE, PROPERTIES, type Kind } from '../lib/city'

type Plot = { id: number; owner_id: string; purchased_at: string }

const KIND_ICON = { plot: MapPin, house: Home, apartment: Building2 }
const KINDS: Kind[] = ['apartment', 'house', 'plot']

export default function Sosumi() {
  const { session, profile, refreshBalance } = useAuth()
  const me = session?.user.id
  const [owned, setOwned] = useState<Map<number, Plot>>(new Map())
  const [names, setNames] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const panel = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('plots').select('*')
    setOwned(new Map(((data as Plot[]) ?? []).map((p) => [p.id, p])))
  }, [])

  useEffect(() => {
    void load()
    supabase.from('profile_public').select('id,handle').then(({ data }) => setNames(Object.fromEntries((data ?? []).map((p) => [p.id, p.handle]))))
    const ch = supabase.channel('plots').on('postgres_changes', { event: '*', schema: 'public', table: 'plots' }, () => void load()).subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load])

  const ownership = useCallback((id: number): Ownership => {
    const o = owned.get(id)
    return !o ? 'free' : o.owner_id === me ? 'mine' : 'taken'
  }, [owned, me])

  const stats = useMemo(() => KINDS.map((k) => {
    const all = PROPERTIES.filter((p) => p.kind === k)
    return { k, total: all.length, free: all.filter((p) => !owned.has(p.id)).length }
  }), [owned])

  const mine = [...owned.values()].filter((p) => p.owner_id === me).map((p) => byId.get(p.id)!)
  const sel = selected != null && selected > 0 ? byId.get(selected) : undefined
  const selOwner = sel ? owned.get(sel.id) : undefined
  const hov = hover != null ? byId.get(hover) : undefined
  const SelIcon = sel ? KIND_ICON[sel.kind] : MapPin

  useEffect(() => {
    if (selected != null && selected > 0 && window.innerWidth < 1024) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])

  async function buy() {
    if (!sel) return
    setBusy(true)
    setMsg('')
    const { error } = await supabase.from('plots').insert({ id: sel.id, price: PRICE[sel.kind] })
    if (error) setMsg(error.code === '23505' ? 'Someone else just claimed that.' : error.message)
    else { setMsg(`${sel.label} is yours.`); await refreshBalance() }
    setBusy(false)
    await load()
  }

  return (
    <div className="space-y-8">
      <PageHeader tag="Land registry" meta="Plots" title="Sosumi" accent="is calling" />
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="relative h-[68vh] min-h-[420px] rounded-xl overflow-hidden border border-line bg-ink">
          <CityScene ownership={ownership} selected={selected} hover={hover}
            onSelect={(id) => { setSelected(id > 0 ? id : null); setMsg('') }} onHover={setHover} />
          <div className="absolute top-3 left-3 label pointer-events-none">Drag to orbit · pinch or scroll to zoom · tap a property</div>
          {hov && (
            <div className="absolute bottom-3 left-3 card !py-2 !px-3 pointer-events-none">
              <span className="text-white text-sm">{hov.label}</span>
              <span className="label ml-2">{owned.has(hov.id) ? 'owned' : 'available'}</span>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div ref={panel} className="card space-y-3 scroll-mt-20">
            <h2 className="label label-crimson">Purchase</h2>
            {!sel ? <p className="text-sm text-mist">Select an apartment, house or plot in the city.</p> : (
              <>
                <div className="flex items-center gap-3">
                  <span className="icon-tile"><SelIcon size={18} /></span>
                  <div>
                    <div className="text-lg font-semibold text-white">{sel.label}</div>
                    <div className="label">{KIND_NAME[sel.kind]} · {selOwner ? `owned by ${names[selOwner.owner_id] ?? 'unknown'}` : 'available'}</div>
                  </div>
                </div>
                <div><div className="label">Price</div><div className="text-2xl font-semibold text-white">{PRICE[sel.kind].toLocaleString()} bits</div></div>
                {profile?.has_face === false ? (
                  <Link to="/enroll" className="btn w-full">Face ID required to buy</Link>
                ) : (
                  <button className="btn btn-primary w-full" disabled={busy || !!selOwner} onClick={buy}>
                    {selOwner ? 'Already claimed' : busy ? 'Processing…' : `Buy this ${KIND_NAME[sel.kind].toLowerCase()}`}
                  </button>
                )}
              </>
            )}
            {msg && <p className="text-sm text-velvet-soft" role="status">{msg}</p>}
          </div>

          <div className="card space-y-2">
            <h2 className="label label-crimson">Market</h2>
            {stats.map(({ k, total, free }) => {
              const I = KIND_ICON[k]
              return (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <I size={16} className="text-velvet-soft" />
                  <span className="text-white flex-1">{KIND_NAME[k]}s</span>
                  <span className="label whitespace-nowrap">{free}/{total} free</span>
                  <span className="text-mist w-28 text-right">{PRICE[k].toLocaleString()}</span>
                </div>
              )
            })}
          </div>

          <div className="card">
            <h2 className="label label-crimson mb-2">Your holdings</h2>
            {mine.length === 0 ? <p className="text-sm text-haze">Nothing yet.</p>
              : <ul className="text-sm text-mist space-y-1">{mine.map((p) => <li key={p.id}>{p.label}</li>)}</ul>}
          </div>

          <div className="label flex gap-4 flex-wrap">
            <span style={{ color: '#7a3aa3' }}>■ available</span><span style={{ color: '#d9a8ff' }}>■ yours</span><span style={{ color: '#df2935' }}>■ taken</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

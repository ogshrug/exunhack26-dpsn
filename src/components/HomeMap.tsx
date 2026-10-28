import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Link } from 'react-router-dom'
import { LocateFixed, MapPin, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { distanceKm, fmtKm } from '../lib/geo'
import { useAuth } from '../auth/AuthContext'

type Bounty = {
  id: number; title: string; description: string; price: number; game: string
  target_character: string | null; status: 'open' | 'claimed' | 'completed'
  image_url: string; lat: number; lng: number; seller_id: string; claimed_by: string | null
}
type Cell = { id: number; handle: string; city: string; lat: number; lng: number; last_seen: string }
type Selection = { kind: 'bounty' | 'cell'; id: number } | null

const RED = '#df2935'
const PURPLE = '#a45bd0'
const GREEN = '#34d399'

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    dark: {
      type: 'raster', tileSize: 256, maxzoom: 16, attribution: 'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    },
  },
  layers: [{ id: 'dark', type: 'raster', source: 'dark' }],
}

function dot(color: string, size: number, label: string) {
  const wrap = document.createElement('div')
  wrap.style.cssText = `width:${size}px;height:${size}px;cursor:pointer`
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', label)
  el.title = label
  el.style.cssText = `display:block;width:100%;height:100%;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.85);box-shadow:0 0 14px ${color};cursor:pointer;padding:0;transition:transform .15s`
  wrap.onmouseenter = () => { el.style.transform = 'scale(1.35)' }
  wrap.onmouseleave = () => { el.style.transform = '' }
  wrap.appendChild(el)
  return wrap
}

export default function HomeMap() {
  const { session, profile } = useAuth()
  const uid = session?.user.id
  const [acceptMsg, setAcceptMsg] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const meMarker = useRef<maplibregl.Marker | null>(null)
  const fitted = useRef(false)
  const details = useRef<HTMLDivElement>(null)

  const [bounties, setBounties] = useState<Bounty[]>([])
  const [cells, setCells] = useState<Cell[]>([])
  const [me, setMe] = useState<[number, number] | null>(null)
  const [geo, setGeo] = useState<'asking' | 'on' | 'denied'>('asking')
  const [sel, setSel] = useState<Selection>(null)

  const loadBounties = useCallback(async () => {
    const { data } = await supabase.from('listings').select('id,title,description,price,game,target_character,status,image_url,lat,lng,seller_id,claimed_by')
      .eq('category', 'contract').neq('status', 'completed').not('lat', 'is', null)
    setBounties((data as Bounty[]) ?? [])
  }, [])
  const loadCells = useCallback(async () => {
    const { data } = await supabase.from('members').select('id,handle,city,lat,lng,last_seen')
    setCells((data as Cell[]) ?? [])
  }, [])

  useEffect(() => {
    void loadBounties()
    void loadCells()
    const ch = supabase.channel('home-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => void loadBounties())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => void loadCells())
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [loadBounties, loadCells])

  useEffect(() => {
    const m = new maplibregl.Map({ container: box.current!, style: STYLE, center: [82, 28], zoom: 3.1, attributionControl: { compact: true } })
    map.current = m
    m.on('click', () => setSel(null))
    return () => m.remove()
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) { setGeo('denied'); return }
    const id = navigator.geolocation.watchPosition(
      (p) => { setMe([p.coords.latitude, p.coords.longitude]); setGeo('on') },
      () => setGeo('denied'),
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const nearest = useMemo(() => {
    const list = bounties.map((b) => ({ b, km: me ? distanceKm(me, [b.lat, b.lng]) : null }))
    return list.sort((x, y) => (x.km != null && y.km != null ? x.km - y.km : Number(y.b.price) - Number(x.b.price)))
  }, [bounties, me])

  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((k) => k.remove())
    markers.current = []
    const add = (el: HTMLElement, lat: number, lng: number, s: Selection) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); setSel(s) })
      markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m))
    }
    cells.forEach((c) => add(dot(PURPLE, 13, `Bunker site ${c.city}`), c.lat, c.lng, { kind: 'cell', id: c.id }))
    bounties.forEach((b) => {
      const mineJob = b.claimed_by === uid && b.status !== 'completed'
      const color = mineJob ? GREEN : RED
      const el = dot(color, 17, `Contract: ${b.target_character ?? b.title}${mineJob ? ' (accepted)' : ''}`)
      if (b.status === 'completed') el.style.opacity = '.4'
      add(el, b.lat, b.lng, { kind: 'bounty', id: b.id })
    })
  }, [bounties, cells, uid])

  useEffect(() => {
    const m = map.current
    if (!m || !me) return
    if (!meMarker.current) {
      const el = document.createElement('div')
      el.title = 'You are here'
      el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.22),0 0 18px #fff'
      meMarker.current = new maplibregl.Marker({ element: el }).setLngLat([me[1], me[0]]).addTo(m)
    } else meMarker.current.setLngLat([me[1], me[0]])

    if (!fitted.current && bounties.length) {
      fitted.current = true
      const b = new maplibregl.LngLatBounds([me[1], me[0]], [me[1], me[0]])
      nearest.slice(0, 3).forEach(({ b: x }) => b.extend([x.lng, x.lat]))
      m.fitBounds(b, { padding: 70, maxZoom: 6, duration: 1200 })
    }
  }, [me, bounties.length, nearest])

  useEffect(() => {
    if (sel && window.innerWidth < 1024) details.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [sel])

  const focus = (s: Selection, lat: number, lng: number) => {
    setSel(s)
    map.current?.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 4), duration: 900 })
  }

  const selBounty = sel?.kind === 'bounty' ? bounties.find((b) => b.id === sel.id) : undefined
  const selCell = sel?.kind === 'cell' ? cells.find((c) => c.id === sel.id) : undefined
  const away = (lat: number, lng: number) => (me ? fmtKm(distanceKm(me, [lat, lng])) : null)

  return (
    <section className="mb-10">
      <div className="grid lg:grid-cols-[1fr_330px] gap-4">
        <div className="relative h-[360px] sm:h-[460px] rounded-xl overflow-hidden border border-line">
          <div ref={box} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          <div className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] flex-wrap card !py-2 !px-3 flex items-center gap-x-3 gap-y-1 label">
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: RED }} />Contracts</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: GREEN }} />Accepted</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PURPLE }} />Bunkers</span>
            {me && <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block bg-white" />You</span>}
          </div>
          <div className="absolute top-14 left-3 sm:top-3 sm:right-3 sm:left-auto label card !py-2 !px-3 flex items-center gap-2">
            <LocateFixed size={13} className={geo === 'on' ? 'text-velvet-soft' : ''} />
            {geo === 'on' ? 'Synced to your location' : geo === 'asking' ? 'Locating you…' : 'Location off: showing everything'}
          </div>
        </div>

        <aside className="space-y-3">
          {(selBounty || selCell) && (
            <div ref={details} className="card !p-0 overflow-hidden scroll-mt-20">
              {selBounty && (
                <>
                  <div className="relative aspect-[16/9] bg-ink">
                    <img src={selBounty.image_url} alt={selBounty.title} className="w-full h-full object-cover" />
                    <button className="absolute top-2 right-2 icon-tile !w-8 !h-8 !bg-black/60" onClick={() => setSel(null)} aria-label="Close details"><X size={14} /></button>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-semibold leading-snug">{selBounty.title}</h3>
                      <span className={`chip ${selBounty.status === 'open' ? 'chip-ok' : selBounty.status === 'claimed' ? 'chip-warn' : ''}`}>{selBounty.status}</span>
                    </div>
                    <div className="text-2xl font-semibold text-white">◈ {Number(selBounty.price).toLocaleString()}</div>
                    <p className="label">{selBounty.target_character ? `Target: ${selBounty.target_character}` : 'Contract'}</p>
                    {selBounty.description && <p className="text-sm text-mist">{selBounty.description}</p>}
                    {away(selBounty.lat, selBounty.lng) && <p className="label label-crimson">{away(selBounty.lat, selBounty.lng)} from you</p>}
                    {selBounty.status === 'open' && selBounty.seller_id !== uid && profile?.has_face === false && <Link to="/enroll" className="btn w-full">Face ID required to accept</Link>}
                    {selBounty.status === 'open' && selBounty.seller_id !== uid && profile?.has_face !== false && (
                      <button className="btn btn-primary w-full" onClick={async () => {
                        const { error } = await supabase.rpc('accept_contract', { p_listing: selBounty.id })
                        setAcceptMsg(error ? error.message : 'Accepted. It is green on the map now.')
                        await loadBounties()
                      }}>Accept contract</button>
                    )}
                    {selBounty.claimed_by === uid && selBounty.status === 'claimed' && <Link to="/market?tab=activity" className="btn w-full !border-emerald-500/60 !text-emerald-300">Submit proof</Link>}
                    {acceptMsg && <p className="text-xs text-emerald-300" role="status">{acceptMsg}</p>}
                    <Link to="/market" className="btn w-full">Open in marketplace</Link>
                  </div>
                </>
              )}
              {selCell && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="icon-tile" style={{ color: PURPLE }}><MapPin size={18} /></span>
                      <div><h3 className="text-white font-semibold">{selCell.handle.replace('Bunker-', 'Bunker · ')}</h3><p className="label">Bunker site · {selCell.city}</p></div>
                    </div>
                    <button className="icon-tile !w-8 !h-8" onClick={() => setSel(null)} aria-label="Close details"><X size={14} /></button>
                  </div>
                  <p className="text-sm text-mist">Safe space and transfer point. Status: operational.</p>
                  {away(selCell.lat, selCell.lng) && <p className="label label-crimson">{away(selCell.lat, selCell.lng)} from you</p>}
                </div>
              )}
            </div>
          )}

          <div className="card !p-3 space-y-1">
            <h2 className="label label-crimson px-2 pt-1 pb-2">{me ? 'Closest contracts' : 'Biggest contracts'}</h2>
            {nearest.slice(0, 6).map(({ b, km }) => (
              <button key={b.id} onClick={() => focus({ kind: 'bounty', id: b.id }, b.lat, b.lng)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-panel2 ${sel?.kind === 'bounty' && sel.id === b.id ? 'bg-panel2' : ''}`}>
                <img src={b.image_url} alt="" className="w-14 h-10 rounded object-cover flex-none" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white truncate">{b.target_character ?? b.title}</span>
                  <span className="label">{km != null ? fmtKm(km) : 'Contract'}</span>
                </span>
                <span className="text-sm text-white">◈ {Number(b.price).toLocaleString()}</span>
              </button>
            ))}
            {nearest.length === 0 && <p className="text-sm text-haze px-2 pb-2">No contracts on the map yet.</p>}
          </div>
        </aside>
      </div>
    </section>
  )
}

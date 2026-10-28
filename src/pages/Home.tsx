import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, FlaskConical, ScrollText, ShieldCheck, Timer, Users, Link2, type LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Hero from '../components/Hero'

const HomeMap = lazy(() => import('../components/HomeMap'))

type Listing = { id: number; title: string; category: string; price: number; game: string; image_url: string; status: string; target_character: string | null; created_at: string }

const COLUMNS: { key: 'substance' | 'contract' | 'enslavement'; label: string; icon: LucideIcon; empty: string }[] = [
  { key: 'substance', label: 'substances', icon: FlaskConical, empty: 'No substances listed yet.' },
  { key: 'contract', label: 'contracts', icon: ScrollText, empty: 'No open contracts.' },
  { key: 'enslavement', label: 'enslavement', icon: Link2, empty: 'No enslavement orders.' },
]

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-4 !p-4">
      <span className="icon-tile"><Icon size={18} /></span>
      <div><div className="label">{label}</div><div className="text-lg font-semibold text-white">{value}</div></div>
    </div>
  )
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [synced, setSynced] = useState<Date | null>(null)
  const [openCount, setOpenCount] = useState(0)

  useEffect(() => {
    const load = () =>
      supabase.from('listings').select('id,title,category,price,game,image_url,status,target_character,created_at')
        .in('category', ['substance', 'contract', 'enslavement']).neq('status', 'completed').order('created_at', { ascending: false }).limit(60)
        .then(({ data }) => { setListings((data as Listing[]) ?? []); setSynced(new Date()) })
    const loadOpen = () =>
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'open').then(({ count }) => setOpenCount(count ?? 0))
    void load(); void loadOpen()
    const ch = supabase.channel('home-listings').on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => { void load(); void loadOpen() }).subscribe()
    return () => void supabase.removeChannel(ch)
  }, [])

  const volume = listings.reduce((s, l) => s + Number(l.price), 0)

  return (
    <>
      <Hero />
      <PageHeader tag="Cluster log // 26.10.AX" title="Operational Feed" accent="& Orderbook"
        right={
          <Link to="/market" className="btn">
            Open listings <b className="text-crimson-soft text-sm">{openCount}</b>
          </Link>
        } />

      <Suspense fallback={<div className="h-[460px] mb-10 card label label-crimson">loading map…</div>}>
        <HomeMap />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COLUMNS.map(({ key, label, icon: Icon, empty }) => {
          const items = listings.filter((l) => l.category === key && l.status !== 'completed').slice(0, 5)
          return (
            <section key={key} className="min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <span className="icon-tile !w-9 !h-9"><Icon size={16} /></span>
                <h2 className="label !text-mist">Latest {label}</h2>
                {synced && <span className="label ml-auto hidden xl:block">{synced.toLocaleTimeString()}</span>}
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <Link key={l.id} to={`/market?tab=${key}`} className="card card-hover !p-3 flex items-center gap-3">
                    <img src={l.image_url} alt="" loading="lazy" decoding="async" className="w-16 h-12 rounded object-cover flex-none" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{l.target_character ?? l.title}</div>
                      <div className="label mt-1 truncate">{key === 'enslavement' ? l.game : new Date(l.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className="chip">◈ {Number(l.price).toLocaleString()}</span>
                  </Link>
                ))}
                {items.length === 0 && <div className="card text-haze text-sm">{empty}</div>}
                <Link to={`/market?tab=${key}`} className="btn w-full">See all {label}</Link>
              </div>
            </section>
          )
        })}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        <Stat icon={ArrowLeftRight} label="Open volume" value={`◈ ${volume.toLocaleString()}`} />
        <Stat icon={Users} label="Faithful online" value="1,024" />
        <Stat icon={Timer} label="Avg transposition" value="18.4 ms" />
        <Stat icon={ShieldCheck} label="Biometric consensus" value="Passed" />
      </div>
    </>
  )
}

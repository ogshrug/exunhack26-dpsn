import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import ListingCard, { type Listing } from '../components/ListingCard'
import ListingModal, { type Category } from '../components/ListingModal'
import HireModal from '../components/HireModal'
import ProofModal from '../components/ProofModal'
import Activity from '../components/Activity'
import { errText } from '../lib/upload'

const TABS: { key: Category; label: string; add: string }[] = [
  { key: 'contract', label: 'Contracts', add: 'Add contract' },
  { key: 'substance', label: 'Substances', add: 'Add substance' },
  { key: 'hitman', label: 'Hitmen for hire', add: 'Register as a hitman' },
  { key: 'enslavement', label: 'Enslavement', add: 'Add enslavement task' },
]

export default function Market() {
  const { profile, session } = useAuth()
  const [params, setParams] = useSearchParams()
  const isAdmin = profile?.role === 'admin'
  const [tab, setTabState] = useState<Category | 'activity'>(() => { const t = params.get('tab'); return t === 'activity' || TABS.some((x) => x.key === t) ? (t as Category | 'activity') : 'contract' })
  const setTab = (t: Category | 'activity') => { setTabState(t); setParams(t === 'activity' ? { tab: 'activity' } : {}, { replace: true }) }
  const [hire, setHire] = useState<Listing | null>(null)
  const [proof, setProof] = useState<Listing | null>(null)
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Listing[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false })
    setRows((data as Listing[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
    supabase.from('profile_public').select('id,handle').then(({ data }) => setNames(Object.fromEntries((data ?? []).map((p) => [p.id, p.handle]))))
    const ch = supabase.channel('market').on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => void load()).subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load])

  const update = async (id: number, patch: Partial<Listing>) => {
    const { error } = await supabase.from('listings').update(patch).eq('id', id)
    if (error) console.error("Update failed:", error.message)
    await load()
  }
  const accept = async (l: Listing) => {
    const { error } = await supabase.rpc('accept_contract', { p_listing: l.id })
    setNote(error ? errText(error) : `Accepted: ${l.title}. It is green on the map now. Submit proof when it is done.`)
    await load()
  }
  const visible = rows.filter((r) => r.category === tab).sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
  const current = TABS.find((t) => t.key === tab) ?? TABS[0]

  return (
    <div className="space-y-6">
      <PageHeader tag="Exchange" title="Marketplace" accent="& Contracts"
        right={tab !== 'activity' && <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />{current.add}</button>} />

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn ${tab === t.key ? 'btn-active' : ''}`}>
            {t.label} <span className="text-crimson-soft">{rows.filter((r) => r.category === t.key).length}</span>
          </button>
        ))}
        <button onClick={() => setTab('activity')} className={`btn ${tab === 'activity' ? 'btn-active' : ''}`}>My activity</button>
      </div>
      {note && <p className="text-sm text-emerald-300" role="status">{note}</p>}

      {tab === 'activity' && <Activity rows={rows} names={names} onProof={setProof} />}

      {isAdmin && tab !== 'substance' && tab !== 'activity' && (
        <div className="card overflow-x-auto">
          <h2 className="label label-crimson mb-3">Admin: hit control</h2>
          <table className="w-full text-sm">
            <thead className="text-left label">
              <tr><th className="pb-2">Listing</th><th>Game</th><th>Reward ◈</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-2 text-white">{r.target_character ?? r.title}</td>
                  <td className="pr-2">{r.category === 'enslavement' ? r.game : '—'}</td>
                  <td className="pr-2">
                    <input className="input !w-28 !py-1" type="number" defaultValue={r.price} key={r.price}
                      onBlur={(e) => Number(e.target.value) !== Number(r.price) && update(r.id, { price: Number(e.target.value) })} />
                  </td>
                  <td className="pr-2">
                    <select className="input !w-36 !py-1" value={r.status} onChange={(e) => update(r.id, { status: e.target.value as Listing['status'] })}>
                      <option value="open">remaining</option><option value="claimed">in place</option><option value="completed">completed</option>
                    </select>
                  </td>
                  <td><button className="btn !py-1" onClick={() => update(r.id, { price: Number(r.price) + 100 })}>+100</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="text-xs text-haze pt-2">No hits recorded.</p>}
        </div>
      )}

      {tab === 'activity' ? null : visible.length === 0 ? (
        <div className="card text-center py-14">
          <h3 className="text-white text-lg font-semibold">Nothing listed yet.</h3>
          <p className="text-mist text-sm mt-1 mb-5">Be the first to post in this category.</p>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />{current.add}</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((r) => <ListingCard key={r.id} l={r} seller={names[r.seller_id]} meId={session?.user.id} hasFace={profile?.has_face} onHire={setHire} onAccept={accept} onProof={setProof} />)}
        </div>
      )}

      {modal && tab !== 'activity' && <ListingModal category={tab} onClose={() => setModal(false)} />}
      {hire && <HireModal hitman={hire} onClose={() => setHire(null)} onDone={() => { setHire(null); setNote('Hire request sent. Track it under My activity.') }} />}
      {proof && <ProofModal job={proof} onClose={() => setProof(null)} onDone={() => { setProof(null); setNote('Proof submitted. An administrator will grade it.'); void load() }} />}
    </div>
  )
}

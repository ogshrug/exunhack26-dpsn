import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText } from '../lib/upload'
import type { Listing } from './ListingCard'

type Proof = { id: number; listing_id: number; user_id: string; images: string[]; note: string; status: 'pending' | 'approved' | 'rejected'; grade: number | null; payout: number | null; created_at: string }
type Hire = { id: number; client_id: string; hitman_id: string; hitman_title: string; target_name: string; last_seen: string; occupation: string; details: string; images: string[]; price: number; status: string; created_at: string }
type Order = { id: number; buyer_id: string; qty: number; title: string; method: string; address: string; price: number; fee: number; created_at: string }

const Section = ({ title, children, empty }: { title: string; children: React.ReactNode[] | React.ReactNode; empty: string }) => (
  <section className="card space-y-3">
    <h2 className="label label-crimson">{title}</h2>
    {Array.isArray(children) && children.length === 0 ? <p className="text-sm text-haze">{empty}</p> : children}
  </section>
)

const Thumbs = ({ urls }: { urls: string[] }) => (
  <div className="flex gap-2 flex-wrap">
    {urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="attachment" className="w-16 h-16 object-cover rounded border border-line" /></a>)}
  </div>
)

export default function Activity({ rows, names, onProof }: { rows: Listing[]; names: Record<string, string>; onProof: (l: Listing) => void }) {
  const { profile, session, refreshBalance } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const me = session?.user.id
  const [proofs, setProofs] = useState<Proof[]>([])
  const [hires, setHires] = useState<Hire[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [grades, setGrades] = useState<Record<number, number>>({})
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [p, h, o] = await Promise.all([
      supabase.from('proofs').select('*').order('created_at', { ascending: false }),
      supabase.from('hires').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('id,buyer_id,qty,title,method,address,price,fee,created_at').order('created_at', { ascending: false }),
    ])
    setProofs((p.data as Proof[]) ?? []); setHires((h.data as Hire[]) ?? []); setOrders(((o.data as Order[]) ?? []).filter((x) => x.buyer_id === me))
  }, [me])
  useEffect(() => {
    void load()
    const ch = supabase.channel('activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proofs' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hires' }, () => void load())
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load])

  const title = (id: number) => rows.find((r) => r.id === id)
  const myJobs = rows.filter((r) => r.claimed_by === me)
  const pending = proofs.filter((p) => p.status === 'pending')
  const myHires = hires.filter((h) => h.client_id === me)
  const forMe = isAdmin ? hires : hires.filter((h) => h.hitman_id === me)

  async function grade(p: Proof, approve: boolean) {
    setErr('')
    const { error } = await supabase.rpc('grade_proof', { p_proof: p.id, p_approve: approve, p_grade: grades[p.id] ?? 100 })
    if (error) setErr(errText(error))
    await load(); await refreshBalance()
  }

  async function resolve(h: Hire, action: 'accept' | 'complete' | 'decline') {
    setErr('')
    const { error } = await supabase.rpc('resolve_hire', { p_hire: h.id, p_action: action })
    if (error) setErr(errText(error))
    await load(); await refreshBalance()
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Section title="Admin: proofs awaiting grading" empty="Nothing to grade.">
          {pending.map((p) => {
            const l = title(p.listing_id)
            const g = grades[p.id] ?? 100
            return (
              <div key={p.id} className="border-t border-line pt-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="text-white">{l?.title ?? `Listing ${p.listing_id}`}</span>
                  <span className="label">by {names[p.user_id] ?? 'member'} · reward ◈ {Number(l?.price ?? 0).toLocaleString()}</span>
                </div>
                <Thumbs urls={p.images} />
                {p.note && <p className="text-sm text-mist">{p.note}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="label" htmlFor={`g-${p.id}`}>Grade {g}%</label>
                  <input id={`g-${p.id}`} type="range" min={0} max={100} step={5} value={g} className="accent-[#df2935]"
                    onChange={(e) => setGrades({ ...grades, [p.id]: Number(e.target.value) })} />
                  <span className="text-sm text-white">Payout ◈ {Math.round(Number(l?.price ?? 0) * g / 100).toLocaleString()}</span>
                  <button className="btn btn-primary !py-1" onClick={() => grade(p, true)}>Approve</button>
                  <button className="btn !py-1" onClick={() => grade(p, false)}>Reject</button>
                </div>
              </div>
            )
          })}
          {err && <p className="text-xs text-crimson-soft">{err}</p>}
        </Section>
      )}

      <Section title="My accepted jobs" empty="You have not accepted any contracts or tasks yet.">
        {myJobs.map((j) => {
          const mine = proofs.filter((p) => p.listing_id === j.id)
          const last = mine[0]
          return (
            <div key={j.id} className="border-t border-line pt-3 flex flex-wrap items-center justify-between gap-2">
              <div><div className="text-white text-sm">{j.title}</div>
                <div className="label">
                  {j.status === 'completed' ? `Paid ◈ ${Number(last?.payout ?? 0).toLocaleString()} (grade ${last?.grade ?? 0}%)`
                    : last?.status === 'pending' ? 'Proof awaiting grading'
                    : last?.status === 'rejected' ? 'Proof rejected, submit again' : `Reward ◈ ${Number(j.price).toLocaleString()}`}
                </div></div>
              {j.status === 'claimed' && last?.status !== 'pending' && <button className="btn btn-primary !py-1" onClick={() => onProof(j)}>Submit proof</button>}
            </div>
          )
        })}
      </Section>

      <Section title="Hitmen I hired" empty="You have not hired anyone.">
        {myHires.map((h) => (
          <div key={h.id} className="border-t border-line pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-white">{h.hitman_title}</span><span className="chip">{h.status}</span></div>
            <div className="label">{h.status === 'completed' ? `Paid out ◈ ${Number(h.price).toLocaleString()}` : h.status === 'declined' ? `Refunded ◈ ${Number(h.price).toLocaleString()}` : `◈ ${Number(h.price).toLocaleString()} reserved until the hit closes`}</div>
            <div className="text-mist">Target: {h.target_name} · {h.occupation} · last seen {h.last_seen}</div>
            {h.images.length > 0 && <Thumbs urls={h.images} />}
          </div>
        ))}
      </Section>

      {forMe.length > 0 && (
        <Section title={isAdmin ? 'Admin: all hit requests' : 'Hires for my hitman listings'} empty="">
          {forMe.map((h) => (
            <div key={h.id} className="border-t border-line pt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2"><span className="text-white">{h.target_name} ({h.occupation})</span>
                <span className="label">{h.status === 'completed' ? 'paid' : h.status === 'declined' ? 'refunded' : 'reserved'} ◈ {Number(h.price).toLocaleString()} · {h.status}</span></div>
              <div className="text-mist">{isAdmin ? `${names[h.client_id] ?? 'member'} → ${h.hitman_title} · ` : ''}Last seen {h.last_seen}{h.details ? ` · ${h.details}` : ''}</div>
              {h.images.length > 0 && <Thumbs urls={h.images} />}
              {(h.status === 'pending' || h.status === 'accepted') && (
                <div className="flex gap-2 pt-1">
                  {h.status === 'pending' && <button className="btn !py-1" onClick={() => resolve(h, 'accept')}>Take it</button>}
                  <button className="btn btn-primary !py-1" onClick={() => resolve(h, 'complete')}>Mark completed (release funds)</button>
                  <button className="btn !py-1" onClick={() => resolve(h, 'decline')}>Decline (refund)</button>
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      <Section title="My substance orders" empty="No orders yet.">
        {orders.map((o) => (
          <div key={o.id} className="border-t border-line pt-3 flex flex-wrap justify-between gap-2 text-sm">
            <div><div className="text-white">{o.title}{o.qty > 1 ? ` × ${o.qty}` : ''}</div>
              <div className="label">{o.method === 'dead_drop' ? 'Dead drop' : 'Hand delivered'} · {o.address}</div></div>
            <span className="text-white">◈ {(Number(o.price) * o.qty + Number(o.fee)).toLocaleString()}</span>
          </div>
        ))}
      </Section>
    </div>
  )
}

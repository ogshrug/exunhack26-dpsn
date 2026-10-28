import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { KIND_LABEL, type Tx } from './Wallet'

type Stats = {
  wallets: number; held: number; circulation: number; accounts: number
  deposited: number; deposits: number; minted: number; fees: number; transferred: number; transfers: number
  volume_24h: number; tx_24h: number
  by_kind: Record<string, { amount: number; n: number }>
  daily: { day: string; volume: number; deposits: number }[]
  top: { handle: string; balance: number }[]
}

const n = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })
const Stat = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) => (
  <div className="card"><div className="label">{label}</div>
    <div className={`text-2xl md:text-3xl font-semibold mt-1 ${accent ? 'text-crimson-soft' : 'text-white'}`}>{value}</div>
    {sub && <div className="text-xs text-haze mt-1">{sub}</div>}</div>
)

export default function AdminEconomy() {
  const [s, setS] = useState<Stats | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [st, t] = await Promise.all([
      supabase.rpc('economy_stats'),
      supabase.from('transactions').select('*').neq('kind', 'opening').order('created_at', { ascending: false }).limit(30),
    ])
    if (st.error) setErr(st.error.message); else setS(st.data as Stats)
    setTxs((t.data as Tx[]) ?? [])
  }, [])
  useEffect(() => {
    void load()
    supabase.from('profile_public').select('id,handle').then(({ data }) => setNames(Object.fromEntries((data ?? []).map((p) => [p.id, p.handle]))))
    const ch = supabase.channel('economy').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => void load()).subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load])

  if (err) return <p className="text-crimson-soft">{err}</p>
  if (!s) return <div className="label label-crimson">loading…</div>

  const max = Math.max(1, ...s.daily.map((d) => d.volume))
  const kinds = Object.entries(s.by_kind).sort((a, b) => b[1].amount - a[1].amount)
  const kmax = Math.max(1, ...kinds.map(([, v]) => v.amount))
  const topMax = Math.max(1, ...s.top.map((t) => t.balance))
  const who = (id: string | null) => (id ? names[id] ?? 'member' : 'the cult')

  return (
    <div className="space-y-6">
      <PageHeader tag="Admin" title="Economy" accent="dashboard" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat accent label="Money in circulation" value={`◈ ${n(s.circulation)}`} sub={`${n(s.wallets)} in wallets · ${n(s.held)} reserved`} />
        <Stat label="Deposited" value={`◈ ${n(s.deposited)}`} sub={`${s.deposits} deposits, each one adds to circulation`} />
        <Stat label="Moved in last 24h" value={`◈ ${n(s.volume_24h)}`} sub={`${s.tx_24h} transactions`} />
        <Stat label="Member transfers" value={`◈ ${n(s.transferred)}`} sub={`${s.transfers} transfers · ${s.accounts} accounts`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card">
          <h2 className="label label-crimson mb-4">Volume, last 14 days</h2>
          <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Daily transaction volume">
            {s.daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col justify-end h-full group relative" title={`${d.day}: ◈ ${n(d.volume)}`}>
                <div className="bg-crimson/80 group-hover:bg-crimson rounded-t" style={{ height: `${Math.max(2, (d.volume / max) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between label !text-[.6rem] mt-2"><span>{s.daily[0]?.day.slice(5)}</span><span>peak ◈ {n(max === 1 ? 0 : max)}</span><span>{s.daily.at(-1)?.day.slice(5)}</span></div>
        </section>

        <section className="card space-y-3">
          <h2 className="label label-crimson">Where the money goes</h2>
          {kinds.length === 0 && <p className="text-sm text-haze">No activity yet.</p>}
          {kinds.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-sm"><span className="text-white">{KIND_LABEL[k] ?? k} <span className="text-haze">×{v.n}</span></span><span className="text-mist">◈ {n(v.amount)}</span></div>
              <div className="h-1.5 rounded bg-panel2 mt-1"><div className="h-full rounded bg-velvet-soft" style={{ width: `${(v.amount / kmax) * 100}%` }} /></div>
            </div>
          ))}
          <p className="text-xs text-haze pt-1">Issued by admin rewards: ◈ {n(s.minted)} · Fees collected: ◈ {n(s.fees)}</p>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card space-y-3">
          <h2 className="label label-crimson">Biggest holders</h2>
          {s.top.map((t) => (
            <div key={t.handle}>
              <div className="flex justify-between text-sm"><span className="text-white">{t.handle}</span><span className="text-mist">◈ {n(t.balance)}</span></div>
              <div className="h-1.5 rounded bg-panel2 mt-1"><div className="h-full rounded bg-crimson" style={{ width: `${(t.balance / topMax) * 100}%` }} /></div>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="label label-crimson mb-2">Live transactions</h2>
          <div className="max-h-[26rem] overflow-auto">
            {txs.length === 0 && <p className="text-sm text-haze">Nothing yet.</p>}
            {txs.map((t) => (
              <div key={t.id} className="flex justify-between gap-3 border-t border-line py-2 text-sm">
                <div className="min-w-0">
                  <div className="text-white truncate">{KIND_LABEL[t.kind] ?? t.kind}: {who(t.from_id)} → {who(t.to_id)}</div>
                  <div className="label !text-[.62rem] truncate">{new Date(t.created_at).toLocaleString()}{t.memo ? ` · ${t.memo}` : ''}</div>
                </div>
                <span className="text-white shrink-0">◈ {n(t.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

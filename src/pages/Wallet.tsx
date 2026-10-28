import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Lock, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText } from '../lib/upload'
import PageHeader from '../components/PageHeader'

export type Tx = { id: number; kind: string; from_id: string | null; to_id: string | null; amount: number; memo: string; created_at: string }

export const KIND_LABEL: Record<string, string> = {
  opening: 'Opening balance', deposit: 'Deposit', transfer: 'Transfer', purchase: 'Purchase', fee: 'Fee',
  escrow_hold: 'Reserved', escrow_release: 'Released', escrow_refund: 'Refunded', payout: 'Payout', mint: 'Issued',
}

export default function Wallet() {
  const { session, balance, refreshBalance } = useAuth()
  const me = session!.user.id
  const [held, setHeld] = useState(0)
  const [txs, setTxs] = useState<Tx[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [handle, setHandle] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const [e, t] = await Promise.all([
      supabase.rpc('my_escrow'),
      supabase.from('transactions').select('*').or(`from_id.eq.${me},to_id.eq.${me}`).order('created_at', { ascending: false }).limit(40),
    ])
    setHeld(Number(e.data ?? 0)); setTxs((t.data as Tx[]) ?? [])
  }, [me])
  useEffect(() => {
    void load()
    supabase.from('profile_public').select('id,handle').then(({ data }) => setNames(Object.fromEntries((data ?? []).map((p) => [p.id, p.handle]))))
    const ch = supabase.channel('wallet').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => { void load(); void refreshBalance() }).subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load, refreshBalance])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { error } = await supabase.rpc('transfer_bits', { p_handle: handle, p_amount: Number(amount), p_memo: memo })
    if (error) setMsg({ ok: false, text: errText(error) })
    else { setMsg({ ok: true, text: `Sent ◈ ${Number(amount).toLocaleString()} to ${handle.trim()}.` }); setHandle(''); setAmount(''); setMemo(''); await refreshBalance(); await load() }
    setBusy(false)
  }

  const who = (id: string | null) => (id ? names[id] ?? 'member' : 'the cult')
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader tag="Wallet" title="Your" accent="bits" />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card"><div className="label">Available</div><div className="text-3xl text-white font-semibold mt-1">◈ {balance?.toLocaleString() ?? '…'}</div></div>
        <div className="card"><div className="label flex items-center gap-1.5"><Lock size={12} />Reserved</div><div className="text-3xl text-white font-semibold mt-1">◈ {held.toLocaleString()}</div>
          <p className="text-xs text-haze mt-1">Held for hits and contracts until they close.</p></div>
        <div className="card flex flex-col justify-between"><div className="label">Need more?</div><Link to="/exchange" className="btn btn-primary mt-2 justify-center">Deposit bits</Link></div>
      </div>

      <form onSubmit={send} className="card space-y-3">
        <h2 className="label label-crimson">Send bits</h2>
        <div className="grid sm:grid-cols-[1fr_10rem] gap-3">
          <div><label className="label" htmlFor="w-to">Member handle</label>
            <input id="w-to" className="input mt-1" required maxLength={40} value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="off" /></div>
          <div><label className="label" htmlFor="w-amt">Amount (◈)</label>
            <input id="w-amt" className="input mt-1" required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <div><label className="label" htmlFor="w-memo">Note (optional)</label>
          <input id="w-memo" className="input mt-1" maxLength={120} value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-crimson-soft'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy}><Send size={15} />{busy ? 'Sending…' : 'Send'}</button>
      </form>

      <section className="card space-y-1">
        <h2 className="label label-crimson mb-2">Transactions</h2>
        {txs.length === 0 && <p className="text-sm text-haze">Nothing yet.</p>}
        {txs.map((t) => {
          const incoming = t.to_id === me && t.from_id !== me
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${incoming ? 'bg-emerald-500/15 text-emerald-300' : 'bg-crimson/15 text-crimson-soft'}`}>
                  {incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <div className="min-w-0">
                  <div className="text-white truncate">{KIND_LABEL[t.kind] ?? t.kind}{t.kind === 'transfer' ? (incoming ? ` from ${who(t.from_id)}` : ` to ${who(t.to_id)}`) : ''}</div>
                  <div className="label !text-[.62rem] truncate">{new Date(t.created_at).toLocaleString()}{t.memo ? ` · ${t.memo}` : ''}</div>
                </div>
              </div>
              <span className={`shrink-0 font-semibold ${incoming ? 'text-emerald-300' : 'text-white'}`}>{incoming ? '+' : '−'} ◈ {Number(t.amount).toLocaleString()}</span>
            </div>
          )
        })}
      </section>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Bitcoin, Coins } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText } from '../lib/upload'
import PageHeader from '../components/PageHeader'

type Rates = { usd_inr: number; btc_usd: number; bnb_usd: number; updated_at: string }
type Topup = { id: number; asset: string; amount: number; bits: number; created_at: string }
const ASSETS = {
  BTC: { name: 'Bitcoin', icon: Bitcoin, key: 'btc_usd' },
  BNB: { name: 'Binance', icon: Coins, key: 'bnb_usd' },
} as const
type Asset = keyof typeof ASSETS

export default function Exchange() {
  const { balance, refreshBalance } = useAuth()
  const [rates, setRates] = useState<Rates | null>(null)
  const [asset, setAsset] = useState<Asset>('BTC')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [history, setHistory] = useState<Topup[]>([])

  const loadRates = useCallback(async () => {
    const { data } = await supabase.functions.invoke<Rates>('exchange-rate')
    if (data?.usd_inr) setRates(data)
  }, [])
  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('topups').select('id,asset,amount,bits,created_at').order('created_at', { ascending: false }).limit(8)
    setHistory((data as Topup[]) ?? [])
  }, [])
  useEffect(() => {
    void loadRates(); void loadHistory()
    const t = setInterval(() => void loadRates(), 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [loadRates, loadHistory])

  const price = rates ? Number(rates[ASSETS[asset].key]) : 0
  const n = Number(amount)
  const usd = n > 0 ? n * price : 0
  const inr = rates ? usd * rates.usd_inr : 0
  const bits = rates && usd ? Math.round((inr / rates.usd_inr) * 100) / 100 : 0
  const fmt = (v: number, d = 2) => v.toLocaleString(undefined, { maximumFractionDigits: d })

  async function convert(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { data, error } = await supabase.rpc('topup_bits', { p_asset: asset, p_amount: n })
    if (error) setMsg({ ok: false, text: errText(error) })
    else { setMsg({ ok: true, text: `Converted. ◈ ${fmt(Number(data))} added to your balance.` }); setAmount(''); await refreshBalance(); await loadHistory() }
    setBusy(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader tag="Exchange" title="Convert" accent="to bits" right={<span className="chip !text-sm">Balance ◈ {balance?.toLocaleString() ?? '…'}</span>} />

      <div className="card space-y-1">
        <div className="label">Live rate · refreshed hourly</div>
        {rates ? (
          <p className="text-white">1 bit = ₹{fmt(rates.usd_inr, 4)}</p>
        ) : <p className="text-mist text-sm">Fetching rates…</p>}
        {rates && <p className="label">Updated {new Date(rates.updated_at).toLocaleTimeString()}</p>}
      </div>

      <form onSubmit={convert} className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(ASSETS) as Asset[]).map((k) => {
            const Icon = ASSETS[k].icon
            return (
              <button type="button" key={k} onClick={() => setAsset(k)} className={`card card-hover flex items-center gap-3 text-left ${asset === k ? '!border-crimson' : ''}`}>
                <Icon size={22} className="text-crimson" />
                <span><span className="block text-white font-semibold">{ASSETS[k].name}</span>
                  <span className="label">{rates ? `$${fmt(Number(rates[ASSETS[k].key]))}` : k}</span></span>
              </button>
            )
          })}
        </div>
        <div><label className="label" htmlFor="ex-amt">Amount ({asset})</label>
          <input id="ex-amt" className="input mt-1" type="number" step="any" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><div className="label">Worth (USD)</div><div className="text-white">${fmt(usd)}</div></div>
          <div><div className="label">In INR</div><div className="text-white">₹{fmt(inr)}</div></div>
          <div><div className="label">You receive</div><div className="text-xl text-white font-semibold">◈ {fmt(bits)}</div></div>
        </div>

        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-crimson-soft'}`} role="status">{msg.text}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !rates || !(bits > 0)}>{busy ? 'Converting…' : 'Convert to bits'}</button>
      </form>

      {history.length > 0 && (
        <div className="card">
          <h2 className="label label-crimson mb-2">Recent conversions</h2>
          {history.map((h) => (
            <div key={h.id} className="flex justify-between text-sm border-t border-line py-2">
              <span className="text-mist">{fmt(Number(h.amount), 8)} {h.asset}</span>
              <span className="text-white">◈ {fmt(Number(h.bits))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

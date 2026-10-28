import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { errText } from '../lib/upload'
import { useAuth } from '../auth/AuthContext'
import { cropTo43, PRESETS } from '../lib/image'
import type { LatLng } from './LocationPicker'

const LocationPicker = lazy(() => import('./LocationPicker'))

export type Category = 'contract' | 'substance' | 'hitman' | 'enslavement'
export const GAMES = ['Skyline Online', 'Sosumi', 'Iron Halo', 'Ember Vale', 'Neon Drift']

const COPY: Record<Category, { title: string; submit: string; name: string; price: string; desc: string }> = {
  contract: { title: 'Add contract', submit: 'Post contract', name: 'Target', price: 'Reward (◈)', desc: 'Last known location, proof required…' },
  enslavement: { title: 'Add enslavement task', submit: 'Post task', name: 'Character to enslave', price: 'Task reward (◈)', desc: 'How to capture them, what the buyer expects…' },
  substance: { title: 'Add substance', submit: 'List substance', name: 'Substance name', price: 'Price (◈)', desc: 'Effects, quantity, handling…' },
  hitman: { title: 'Register as a hitman', submit: 'Register', name: 'Alias', price: 'Rate per contract (◈)', desc: 'Specialties, track record, terms…' },
}

export default function ListingModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const { session, profile, refreshBalance } = useAuth()
  const c = COPY[category]
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [resale, setResale] = useState('')
  const [game, setGame] = useState(GAMES[0])
  const [description, setDescription] = useState('')
  const [preset, setPreset] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pos, setPos] = useState<LatLng | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : preset), [file, preset])
  useEffect(() => () => { if (file && preview) URL.revokeObjectURL(preview) }, [file, preview])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!preview) return setErr('An image is required. Upload one or pick a preset.')
    if (category === 'contract' && !pos) return setErr('Pick the contract location on the map.')
    setBusy(true)
    setErr('')
    try {
      let image_url = preset!
      if (file) {
        const blob = await cropTo43(file)
        const path = `${session!.user.id}/${crypto.randomUUID()}.jpg`
        const { error: upErr } = await supabase.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg' })
        if (upErr) throw upErr
        image_url = supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl
      }
      const loc = category === 'contract' && pos ? { lat: pos[0], lng: pos[1] } : {}
      const { error } = await supabase.from('listings').insert({
        ...loc,
        category,
        title: category === 'contract' ? `Contract: ${name}` : category === 'hitman' ? `Hitman: ${name}` : category === 'enslavement' ? `Task: Enslave ${name}` : name,
        description, price: Number(price), game: category === 'enslavement' ? game : 'IRL',
        resale_price: category === 'enslavement' ? Number(resale) : null,
        target_character: category === 'contract' || category === 'enslavement' ? name : null,
        image_url,
      })
      if (error) throw error
      await refreshBalance()
      onClose()
    } catch (e2) {
      setErr(errText(e2))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-label={c.title} onSubmit={submit}
        className="card w-full max-w-2xl max-h-[92vh] overflow-auto space-y-4 !p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{c.title}</h2>
          <button type="button" className="text-mist hover:text-white" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="aspect-[4/3] rounded-lg border border-dashed border-line bg-ink overflow-hidden grid place-items-center">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="label flex items-center gap-2"><ImagePlus size={16} />Image required</span>}
            </div>
            <label className="btn w-full cursor-pointer">
              <ImagePlus size={14} />Upload image
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreset(null) }} />
            </label>
            <div className="flex gap-2">
              {PRESETS[category].map((p) => (
                <button type="button" key={p} onClick={() => { setPreset(p); setFile(null) }}
                  className={`flex-1 aspect-[4/3] rounded overflow-hidden border ${preset === p && !file ? 'border-crimson' : 'border-line'}`}>
                  <img src={p} alt="preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-[.7rem] text-haze">Images are cropped to 4:3 automatically.</p>
          </div>

          <div className="space-y-3">
            <div><label className="label" htmlFor="lm-name">{c.name}</label>
              <input id="lm-name" className="input mt-1" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
            {category === 'enslavement' && (
              <div><label className="label" htmlFor="lm-game">Game</label>
                <select id="lm-game" className="input mt-1" value={game} onChange={(e) => setGame(e.target.value)}>
                  {GAMES.map((g) => <option key={g}>{g}</option>)}</select></div>
            )}
            <div><label className="label" htmlFor="lm-price">{c.price}</label>
              <input id="lm-price" className="input mt-1" required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              {(category === 'contract' || category === 'enslavement') && profile?.role !== 'admin' && <p className="text-xs text-haze mt-1">This amount is reserved from your balance until the job is paid out or you remove it.</p>}</div>
            {category === 'enslavement' && (
              <div><label className="label" htmlFor="lm-resale">Resale price to Sosumi members (◈)</label>
                <input id="lm-resale" className="input mt-1" required type="number" min="0" value={resale} onChange={(e) => setResale(e.target.value)} /></div>
            )}
            <div><label className="label" htmlFor="lm-desc">Details</label>
              <textarea id="lm-desc" className="input mt-1" rows={3} maxLength={400} placeholder={c.desc} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
        </div>

        {category === 'contract' && (
          <Suspense fallback={<div className="h-56 card label label-crimson">loading map…</div>}>
            <LocationPicker value={pos} onChange={setPos} />
          </Suspense>
        )}

        {err && <p className="text-sm text-crimson-soft" role="alert">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : c.submit}</button>
        </div>
      </form>
    </div>
  )
}

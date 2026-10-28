import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText, uploadImages } from '../lib/upload'
import Modal from './Modal'
import ImageDrop from './ImageDrop'
import type { Listing } from './ListingCard'

export default function HireModal({ hitman, onClose, onDone }: { hitman: Listing; onClose: () => void; onDone: () => void }) {
  const { session, balance, refreshBalance } = useAuth()
  const [f, setF] = useState({ name: '', last_seen: '', occupation: '', details: '' })
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const short = balance != null && balance < Number(hitman.price)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const images = await uploadImages(files, session!.user.id)
      const { error } = await supabase.rpc('hire_hitman', {
        p_listing: hitman.id, p_name: f.name, p_last_seen: f.last_seen, p_occupation: f.occupation, p_details: f.details, p_images: images,
      })
      if (error) throw error
      await refreshBalance()
      onDone()
    } catch (x) { setErr(errText(x)); setBusy(false) }
  }

  return (
    <Modal title={`Hire ${hitman.title.replace('Hitman: ', '')}`} onClose={onClose} onSubmit={submit}>
      <div className="grid gap-3">
        <div><label className="label" htmlFor="h-name">Name</label>
          <input id="h-name" className="input mt-1" required maxLength={80} value={f.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="h-seen">Where they were last seen</label>
          <input id="h-seen" className="input mt-1" required maxLength={160} value={f.last_seen} onChange={set('last_seen')} /></div>
        <div><label className="label" htmlFor="h-occ">Occupation</label>
          <input id="h-occ" className="input mt-1" required maxLength={80} value={f.occupation} onChange={set('occupation')} /></div>
        <div><label className="label" htmlFor="h-details">Extra details</label>
          <textarea id="h-details" className="input mt-1" rows={3} maxLength={600} value={f.details} onChange={set('details')} /></div>
        <ImageDrop files={files} onChange={setFiles} label="Photos" />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-mist">Reserved <span className="text-white font-semibold">◈ {Number(hitman.price).toLocaleString()}</span></span>
        <span className="label">Balance ◈ {balance?.toLocaleString() ?? '…'}</span>
      </div>
      <p className="text-xs text-haze">The fee is held from your balance until the hit is completed. If it is declined, it is returned to you.</p>
      {short && <p className="text-xs text-crimson-soft">Not enough bits. Top up on the Exchange page.</p>}
      {err && <p className="text-sm text-crimson-soft" role="alert">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || short}>{busy ? 'Sending…' : 'Hire'}</button>
      </div>
    </Modal>
  )
}

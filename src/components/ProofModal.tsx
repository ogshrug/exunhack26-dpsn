import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText, uploadImages } from '../lib/upload'
import Modal from './Modal'
import ImageDrop from './ImageDrop'
import type { Listing } from './ListingCard'

export default function ProofModal({ job, onClose, onDone }: { job: Listing; onClose: () => void; onDone: () => void }) {
  const { session } = useAuth()
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!files.length) return setErr('Add at least one image of the completed job.')
    setBusy(true); setErr('')
    try {
      const images = await uploadImages(files, session!.user.id)
      const { error } = await supabase.rpc('submit_proof', { p_listing: job.id, p_images: images, p_note: note })
      if (error) throw error
      onDone()
    } catch (x) { setErr(errText(x)); setBusy(false) }
  }

  return (
    <Modal title="Submit proof of completion" onClose={onClose} onSubmit={submit}>
      <p className="text-sm text-mist">{job.title} · reward ◈ {Number(job.price).toLocaleString()}. An administrator grades your proof and the payout follows the grade.</p>
      <ImageDrop files={files} onChange={setFiles} label="Proof images" />
      <div><label className="label" htmlFor="p-note">Note (optional)</label>
        <textarea id="p-note" className="input mt-1" rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {err && <p className="text-sm text-crimson-soft" role="alert">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Submit for grading'}</button>
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export default function AdminCode() {
  const { refreshProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.functions.invoke('promote', { body: { code } })
    if (error || data?.error) {
      const res = (error as { context?: Response } | null)?.context
      const body = res ? await res.json().catch(() => null) : null
      setErr(body?.error ?? data?.error ?? 'Failed')
    } else {
      await refreshProfile()
      setOpen(false)
    }
    setBusy(false)
  }

  return (
    <div>
      <button type="button" className="menu-item" onClick={() => setOpen((o) => !o)}><KeyRound size={15} />Admin access</button>
      {open && (
        <form onSubmit={submit} className="space-y-2 px-3 pb-2 pt-1">
          <label className="label" htmlFor="admin-code">Administrator code</label>
          <input id="admin-code" className="input" type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
          {err && <p className="text-xs text-crimson-soft">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !code}>Elevate</button>
        </form>
      )}
    </div>
  )
}

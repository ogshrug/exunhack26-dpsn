import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlobeBackdrop from '../components/GlobeBackdrop'
import FaceScanner from '../components/FaceScanner'
import { faceLogin, faceRegister, passwordLogin, passwordRegister } from '../lib/face'

function Frame({ title, children, alt }: { title: string; children: React.ReactNode; alt: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <GlobeBackdrop />
      <div className="card w-full max-w-md space-y-4">
        <h1 className="text-white text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
        <p className="text-xs text-haze">{alt}</p>
      </div>
    </div>
  )
}

export function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState<'face' | 'password'>('face')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await passwordLogin(handle.trim(), password); nav('/home') }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); setBusy(false) }
  }

  return (
    <Frame title={mode === 'face' ? 'Biometric sign in' : 'Sign in'}
      alt={<>New here? <Link className="text-crimson" to="/register">Register your face</Link></>}>
      {mode === 'face' ? (
        <FaceScanner label="Scan face" auto frames={1} onEmbedding={async (e) => { await faceLogin(e); nav('/home') }} />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Username" autoComplete="username" autoCapitalize="none" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="text-xs text-crimson-soft">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !handle.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      )}
      <button type="button" className="text-xs text-velvet-soft underline" onClick={() => { setErr(''); setMode(mode === 'face' ? 'password' : 'face') }}>
        {mode === 'face' ? 'Use username and password instead' : 'Use face scan instead'}
      </button>
    </Frame>
  )
}

export function Register() {
  const nav = useNavigate()
  const [handle, setHandle] = useState('')
  const [code, setCode] = useState('')
  const [noFace, setNoFace] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ok = /^[\w-]{3,24}$/.test(handle)

  async function plainRegister(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await passwordRegister(handle, password, code); nav('/home') }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); setBusy(false) }
  }

  return (
    <Frame title="Register" alt={<>Already enrolled? <Link className="text-crimson" to="/login">Sign in</Link></>}>
      <input className="input" placeholder="Handle (3-24 chars)" value={handle} onChange={(e) => setHandle(e.target.value)} />
      <input className="input" placeholder="Admin invite code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
      {noFace ? (
        <form onSubmit={plainRegister} className="space-y-3">
          <input className="input" type="password" placeholder="Password (default 123)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-haze">Without a face ID you cannot hire hitmen, accept contracts or buy in Sosumi. You can add your face later.</p>
          {err && <p className="text-xs text-crimson-soft" role="alert">{err}</p>}
          <button className="btn btn-primary w-full" disabled={!ok || busy}>{busy ? 'Registering…' : 'Register without face ID'}</button>
        </form>
      ) : ok ? (
        <FaceScanner label="Sync face and register" onEmbedding={async (e) => { await faceRegister(e, handle, code); nav('/home') }} />
      ) : (
        <p className="text-xs text-haze">Pick a valid handle to enable the camera sync.</p>
      )}
      <button type="button" className="text-xs text-velvet-soft underline" onClick={() => { setErr(''); setNoFace(!noFace) }}>
        {noFace ? 'Use face scan instead' : 'Register without face ID'}
      </button>
    </Frame>
  )
}

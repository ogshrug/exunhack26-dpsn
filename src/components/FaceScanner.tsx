import { useEffect, useRef, useState } from 'react'
import { captureEmbedding, loadFaceModels } from '../lib/face'
import { beep } from '../lib/audio'

type Props = {
  label: string
  onEmbedding: (e: number[]) => Promise<void> | void
  auto?: boolean
  frames?: number
}

export default function FaceScanner({ label, onEmbedding, auto = false, frames = 3 }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState('Loading biometric models…')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const scanRef = useRef<() => Promise<void>>(async () => {})

  async function scan() {
    setBusy(true)
    setError('')
    setStatus('Scanning… hold still')
    beep(600, 0.1)
    const emb = await captureEmbedding(video.current!, { frames })
    if (!emb) {
      setError('No clear face found. Improve lighting and try again.')
      setStatus('')
      setBusy(false)
      return
    }
    setStatus('Verifying…')
    try {
      await onEmbedding(emb)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setStatus('')
      beep(180, 0.3, 'sawtooth')
    }
    setBusy(false)
  }
  scanRef.current = scan

  useEffect(() => {
    let stream: MediaStream | undefined
    let cancelled = false
    ;(async () => {
      try {
        const [, s] = await Promise.all([loadFaceModels(), navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })])
        stream = s
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        video.current!.srcObject = s
        await video.current!.play()
        setBusy(false)
        if (auto) void scanRef.current()
        else setStatus('Camera ready. Look straight at the lens.')
      } catch {
        setError('Camera unavailable. Allow camera access (HTTPS or localhost required).')
        setStatus('')
      }
    })()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="relative border border-crimson glow aspect-[4/3] overflow-hidden bg-black">
        <video ref={video} muted playsInline className="w-full h-full object-cover -scale-x-100" />
        {busy && !error && <div className="scanline" />}
      </div>
      <p className="text-xs text-crimson min-h-4">{status}</p>
      {error && <p className="text-xs text-crimson-soft">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy} onClick={scan}>{error ? 'Try again' : label}</button>
    </div>
  )
}

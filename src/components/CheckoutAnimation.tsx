import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import Eye from './Eye'

type Phase = 'look' | 'zoom' | 'done'
const LOOK_MS = 1600
const ZOOM_MS = 1000

export default function CheckoutAnimation({ method, onDone }: { method: 'dead_drop' | 'cult_delivery'; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('look')
  useEffect(() => {
    const a = setTimeout(() => setPhase('zoom'), LOOK_MS)
    const b = setTimeout(() => setPhase('done'), LOOK_MS + ZOOM_MS)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  useEffect(() => {
    if (phase !== 'done') return
    const ring = new Audio('/sounds/ZomatoRingSingle.mp3')
    ring.play().catch(() => { })
    return () => ring.pause()
  }, [phase])

  const when = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (phase === 'done') return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black text-center p-6" role="status" aria-live="polite">
      <div className="space-y-5 animate-[fade-up_.8s_ease-out_both]">
        <div className="mx-auto grid place-items-center w-32 h-32 rounded-full bg-crimson shadow-[0_0_60px_rgba(223,41,53,.6)]"><Check size={84} strokeWidth={3.5} className="text-white" /></div>
        <h1 className="font-display text-5xl md:text-6xl text-white uppercase">Order confirmed</h1>
        <p className="text-2xl text-mist">See you there on <span className="text-crimson font-semibold">{when}</span></p>
        <p className="label">{method === 'dead_drop' ? 'Your dead drop location will be shared once it is set' : 'A member is on the way'}</p>
        <button className="btn btn-primary" onClick={onDone}>View my orders</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black overflow-hidden" role="status" aria-live="polite" aria-label="Placing your order">
      <Eye zoom={phase === 'zoom'} />
    </div>
  )
}

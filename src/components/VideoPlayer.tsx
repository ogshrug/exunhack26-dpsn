import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

export default function VideoPlayer({ src, className = '' }: { src: string; className?: string }) {
  const v = useRef<HTMLVideoElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(1)
  const [muted, setMuted] = useState(false)
  const [drag, setDrag] = useState(false)

  const toggle = () => { const el = v.current; if (el) void (el.paused ? el.play() : el.pause()) }
  const seekTo = (clientX: number) => {
    const el = v.current, r = bar.current?.getBoundingClientRect()
    if (!el || !r || !dur) return
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur
    el.currentTime = t; setTime(t)
  }
  const setVolume = (n: number) => { setVol(n); setMuted(n === 0); if (v.current) { v.current.volume = n; v.current.muted = n === 0 } }
  const toggleMute = () => { const m = !muted; setMuted(m); if (v.current) v.current.muted = m; if (!m && vol === 0) setVolume(0.5) }

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => seekTo(e.clientX)
    const up = () => setDrag(false)
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  })

  const pct = dur ? (time / dur) * 100 : 0
  return (
    <div className={`rounded-xl overflow-hidden bg-black border border-line ${className}`}>
      <video ref={v} src={src} playsInline preload="metadata" className="block w-full max-h-[70vh] bg-black cursor-pointer" onClick={toggle}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onTimeUpdate={(e) => !drag && setTime(e.currentTarget.currentTime)} />
      <div className="px-3 pt-2 pb-2 space-y-2 bg-ink">
        <div ref={bar} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(time)}
          className="relative h-5 flex items-center cursor-pointer touch-none"
          onPointerDown={(e) => { setDrag(true); seekTo(e.clientX) }}
          onKeyDown={(e) => { const el = v.current; if (!el) return; if (e.key === 'ArrowRight') el.currentTime += 5; if (e.key === 'ArrowLeft') el.currentTime -= 5 }}>
          <div className="w-full h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-crimson" style={{ width: `${pct}%` }} /></div>
          <div className="absolute w-3 h-3 -ml-1.5 rounded-full bg-crimson shadow-[0_0_8px_rgba(223,41,53,.8)]" style={{ left: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-3 text-mist">
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="grid place-items-center w-9 h-9 rounded-full bg-crimson text-white hover:brightness-110">
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <span className="label tabular-nums">{fmt(time)} / {fmt(dur)}</span>
          <span className="flex-1" />
          <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="hover:text-white">
            {muted || vol === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol} aria-label="Volume" onChange={(e) => setVolume(Number(e.target.value))} className="w-20 accent-[#df2935]" />
        </div>
      </div>
    </div>
  )
}

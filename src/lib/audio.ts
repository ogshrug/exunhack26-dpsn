let ctx: AudioContext | null = null

export function beep(freq = 880, dur = 0.08, type: OscillatorType = 'square', vol = 0.03) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + dur)
  } catch { }
}

export const boop = () => beep(260 + Math.random() * 120, 0.14, 'sine', 0.05)
export const ping = () => (Math.random() < 0.5 ? beep(1200 + Math.random() * 600) : boop())

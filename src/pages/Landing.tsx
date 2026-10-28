import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Globe from '../components/Globe'
import { beep } from '../lib/audio'

export default function Landing() {
  const [sound, setSound] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => void import('../lib/face').then((m) => m.prefetchFace()), 1500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="relative h-full overflow-hidden bg-ink">
      <div className="absolute inset-0"><Globe sound={sound} /></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,#0e0e0e_100%)]" />
      <div className="relative z-10 h-full flex flex-col items-center justify-between p-8 text-center">
        <div>
          <h1 className="font-display text-5xl md:text-7xl text-white">THURIBLES</h1>
          <p className="mt-3 label label-crimson !text-xs">The second coming of humanity</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-mist max-w-md">
            Passage and funds to your Sosumi. Live as a video game character. Faces only: no passwords.
          </p>
          <div className="flex gap-3">
            <Link to="/login" className="btn" onClick={() => beep(900)}>Sign in</Link>
            <Link to="/register" className="btn btn-primary" onClick={() => beep(700)}>Register</Link>
          </div>
          <button className="text-xs text-haze hover:text-crimson" onClick={() => { setSound((s) => !s); beep(1000) }}>
            {sound ? '[ sound on ]' : '[ enable sound ]'}
          </button>
        </div>
      </div>
    </div>
  )
}

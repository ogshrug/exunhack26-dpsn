import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Thurible from './Thurible'

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center text-center pb-16 mb-12 border-b border-line overflow-hidden">
      <div className="relative w-full h-[18rem] md:h-[19rem]">
        <div className="hero-fade absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_at_center,rgba(223,41,53,.32),rgba(223,41,53,.12)_40%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 md:bottom-2 flex justify-center">
          <h2 className="hero-reveal font-display text-crimson leading-none px-[.3em] py-[.25em] -mx-[.3em] -my-[.25em] text-[clamp(3.4rem,21vw,6rem)] md:text-[clamp(3rem,13.5vw,10rem)] select-none whitespace-nowrap [text-shadow:0_0_24px_rgba(223,41,53,.65),0_0_70px_rgba(223,41,53,.4)]">
            THURIBLES
          </h2>
        </div>
        <div className="pendulum pendulum-back absolute top-0 left-1/2 -ml-[3.75rem] md:-ml-[4.5rem] w-[7.5rem] md:w-[9rem]" aria-hidden="true">
          <Thurible chain className="w-full" />
        </div>
        <div className="pendulum pendulum-front absolute top-0 left-1/2 -ml-[3.75rem] md:-ml-[4.5rem] w-[7.5rem] md:w-[9rem] [filter:drop-shadow(0_0_14px_rgba(223,41,53,.7))]">
          <Thurible chain className="w-full" />
        </div>
      </div>

      <h1 className="hero-fade font-display uppercase text-4xl md:text-6xl text-mist">Welcome the new reign</h1>
      <div className="hero-fade w-24 h-px bg-crimson/60 my-5" />
      <Link to="/sosumi" className="hero-fade-2 group inline-flex items-center gap-2 text-mist hover:text-white text-lg">
        Sosumi is calling
        <ArrowRight size={18} className="text-crimson transition-transform group-hover:translate-x-1" />
      </Link>
    </section>
  )
}

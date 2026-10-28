import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'

const Globe = lazy(() => import('./Globe'))

export default function GlobeBackdrop() {
  if (useLocation().pathname === '/sosumi') return null
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none opacity-45">
      <div className="absolute inset-0 blur-[2px]">
        <Suspense fallback={null}><Globe sound={false} shards={false} dpr={0.5} /></Suspense>
      </div>
    </div>
  )
}

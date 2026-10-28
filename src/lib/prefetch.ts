const chunks: Record<string, () => Promise<unknown>> = {
  '/sosumi': () => import('../pages/Sosumi'),
  '/checkout': () => import('../pages/Checkout'),
  '/exchange': () => import('../pages/Exchange'),
  '/enroll': () => import('../pages/Enroll'),
}
const done = new Set<string>()

export function prefetch(path: string) {
  const load = chunks[path]
  if (!load || done.has(path)) return
  done.add(path)
  void load().catch(() => done.delete(path))
}

export function prefetchIdle() {
  const run = () => Object.keys(chunks).forEach(prefetch)
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}

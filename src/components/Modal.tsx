import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, onSubmit }: { title: string; onClose: () => void; children: ReactNode; onSubmit: (e: React.FormEvent) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit} className="card w-full max-w-lg max-h-[92vh] overflow-auto space-y-4 !p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button type="button" className="text-mist hover:text-white" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </form>
    </div>
  )
}

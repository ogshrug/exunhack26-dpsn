import type { ReactNode } from 'react'

type Props = { tag: string; meta?: string; title: string; accent?: string; right?: ReactNode }

export default function PageHeader({ tag, meta, title, accent, right }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="chip"><span className="w-1.5 h-1.5 rounded-full bg-crimson" />{tag}</span>
          {meta && <span className="label">{meta}</span>}
        </div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
          {title} {accent && <span className="text-velvet-soft font-normal">{accent}</span>}
        </h1>
      </div>
      {right}
    </div>
  )
}

import { useEffect, useMemo } from 'react'
import { ImagePlus, X } from 'lucide-react'

export default function ImageDrop({ files, onChange, max = 4, label }: { files: File[]; onChange: (f: File[]) => void; max?: number; label: string }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])
  return (
    <div className="space-y-2">
      <div className="label">{label} ({files.length}/{max})</div>
      <div className="grid grid-cols-4 gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative aspect-square rounded-lg overflow-hidden border border-line">
            <img src={u} alt={`upload ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" aria-label="Remove image" className="absolute top-1 right-1 icon-tile !w-6 !h-6 !bg-black/70"
              onClick={() => onChange(files.filter((_, k) => k !== i))}><X size={12} /></button>
          </div>
        ))}
        {files.length < max && (
          <label className="aspect-square rounded-lg border border-dashed border-line grid place-items-center cursor-pointer text-mist hover:text-white">
            <ImagePlus size={20} />
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
              onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])].slice(0, max)); e.target.value = '' }} />
          </label>
        )}
      </div>
    </div>
  )
}

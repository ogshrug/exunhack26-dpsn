import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LocateFixed } from 'lucide-react'
import { currentPosition } from '../lib/geo'

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    dark: {
      type: 'raster', tileSize: 256, maxzoom: 16, attribution: 'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    },
  },
  layers: [{ id: 'dark', type: 'raster', source: 'dark' }],
}

export type LatLng = [number, number]

export default function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const pin = useRef<maplibregl.Marker | null>(null)
  const cb = useRef(onChange)
  cb.current = onChange
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    const m = new maplibregl.Map({ container: box.current!, style: STYLE, center: [82, 28], zoom: 3.1, attributionControl: { compact: true } })
    map.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('click', (e) => cb.current([e.lngLat.lat, e.lngLat.lng]))
    return () => { m.remove(); map.current = null; pin.current = null }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m || !value) return
    if (!pin.current) {
      const el = document.createElement('div')
      el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#df2935;border:2px solid #fff;box-shadow:0 0 16px #df2935;cursor:grab'
      pin.current = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([value[1], value[0]]).addTo(m)
      pin.current.on('dragend', () => { const p = pin.current!.getLngLat(); cb.current([p.lat, p.lng]) })
    } else pin.current.setLngLat([value[1], value[0]])
  }, [value])

  async function useMine() {
    setLocating(true)
    const p = await currentPosition()
    setLocating(false)
    if (!p) return
    cb.current(p)
    map.current?.flyTo({ center: [p[1], p[0]], zoom: 8 })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{value ? `Location set · ${value[0].toFixed(2)}, ${value[1].toFixed(2)}` : 'Click the map to place the contract'}</span>
        <button type="button" className="btn !py-1" onClick={useMine} disabled={locating}><LocateFixed size={13} />{locating ? 'Locating…' : 'Use my location'}</button>
      </div>
      <div ref={box} className="h-56 rounded-lg overflow-hidden border border-line cursor-crosshair" />
    </div>
  )
}

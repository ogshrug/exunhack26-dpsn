export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad
  const dLng = (b[1] - a[1]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export const fmtKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString()} km`)

export function currentPosition(timeoutMs = 4000): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60000 },
    )
  })
}

export const ASIA_CITIES: [number, number][] = [
  [28.61, 77.21], [26.91, 75.79], [30.73, 76.78], [26.85, 80.95], [31.63, 74.87], [30.32, 78.03], [25.32, 82.97],
  [35.68, 139.69], [37.57, 126.98], [13.76, 100.5], [22.32, 114.17], [1.35, 103.82], [25.2, 55.27], [39.9, 116.41],
]

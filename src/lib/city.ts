export type Kind = 'plot' | 'house' | 'apartment'

export type Property = {
  id: number
  kind: Kind
  label: string
  pos: [number, number, number]
}

export const PRICE: Record<Kind, number> = { plot: 3_000_000_000, house: 8_500_000_000, apartment: 1_200_000_000 }
export const KIND_NAME: Record<Kind, string> = { plot: 'Plot', house: 'House', apartment: 'Apartment' }

export const CELL = 5.5
export const FLOORS = 10
export const FLOOR_H = 1.6
export const TOWERS: [number, number][] = [[-4, -4], [4, -4], [-4, 4], [4, 4]]
const TOWER_NAMES = 'ABCD'

function build(): Property[] {
  const out: Property[] = []
  let p = 0
  let h = 0
  for (let i = -5; i <= 5; i++)
    for (let j = -5; j <= 5; j++) {
      const ring = Math.max(Math.abs(i), Math.abs(j))
      if (ring === 5) out.push({ id: ++p, kind: 'plot', label: `Plot P-${p}`, pos: [i * CELL, 0, j * CELL] })
    }
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      if (Math.abs(i) <= 1 && Math.abs(j) <= 1) continue
      h++
      out.push({ id: 40 + h, kind: 'house', label: `House H-${h}`, pos: [i * CELL, 0, j * CELL] })
    }
  TOWERS.forEach(([x, z], t) => {
    for (let f = 0; f < FLOORS; f++)
      out.push({ id: 81 + t * FLOORS + f, kind: 'apartment', label: `Tower ${TOWER_NAMES[t]} · floor ${f + 1}`, pos: [x, f * FLOOR_H + FLOOR_H / 2, z] })
  })
  return out
}

export const PROPERTIES: Property[] = build()
export const byId = new Map(PROPERTIES.map((p) => [p.id, p]))

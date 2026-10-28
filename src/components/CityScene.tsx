import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { PROPERTIES, type Property } from '../lib/city'

export type Ownership = 'free' | 'mine' | 'taken'

type Look = { base: string; glow: string; intensity: number; line: string }
const LOOK: Record<Ownership | 'hover' | 'selected', Look> = {
  free: { base: '#150c1c', glow: '#5a2278', intensity: 0.45, line: '#7a3aa3' },
  hover: { base: '#2a1240', glow: '#a45bd0', intensity: 1.3, line: '#d9a8ff' },
  selected: { base: '#3a0c14', glow: '#df2935', intensity: 1.8, line: '#ffffff' },
  mine: { base: '#2a1040', glow: '#a45bd0', intensity: 1.5, line: '#d9a8ff' },
  taken: { base: '#240a10', glow: '#df2935', intensity: 0.9, line: '#df2935' },
}

type Handlers = {
  ownership: (id: number) => Ownership
  selected: number | null
  hover: number | null
  onSelect: (id: number) => void
  onHover: (id: number | null) => void
}

type Look2 = keyof typeof LOOK
const GEO = {
  apt: new THREE.BoxGeometry(5, 1.45, 5),
  house: new THREE.BoxGeometry(3.2, 2, 3.2),
  roof: new THREE.ConeGeometry(2.5, 1.4, 4),
  plot: new THREE.BoxGeometry(4.2, 0.16, 4.2),
}
const EDGE = Object.fromEntries(Object.entries(GEO).map(([k, g]) => [k, new THREE.EdgesGeometry(g, 15)])) as unknown as Record<keyof typeof GEO, THREE.EdgesGeometry>
const STATES = Object.keys(LOOK) as Look2[]
const MAT = Object.fromEntries(STATES.map((k) => [k, new THREE.MeshStandardMaterial({ color: LOOK[k].base, emissive: LOOK[k].glow, emissiveIntensity: LOOK[k].intensity, roughness: 0.6, metalness: 0.3 })])) as Record<Look2, THREE.MeshStandardMaterial>
const LINE = Object.fromEntries(STATES.map((k) => [k, new THREE.LineBasicMaterial({ color: LOOK[k].line })])) as Record<Look2, THREE.LineBasicMaterial>

const noRay = () => null
function Shape({ g, state, pos, rot }: { g: keyof typeof GEO; state: Look2; pos?: [number, number, number]; rot?: [number, number, number] }) {
  return (
    <mesh position={pos} rotation={rot} geometry={GEO[g]} material={MAT[state]}>
      <lineSegments geometry={EDGE[g]} material={LINE[state]} raycast={noRay} />
    </mesh>
  )
}

const Lot = memo(function Lot({ p, state, onSelect, onHover }: { p: Property; state: Look2; onSelect: (id: number) => void; onHover: (id: number | null) => void }) {
  const events = {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(p.id) },
    onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onHover(p.id); document.body.style.cursor = 'pointer' },
    onPointerOut: () => { onHover(null); document.body.style.cursor = '' },
  }
  if (p.kind === 'apartment') return <group position={p.pos} {...events}><Shape g="apt" state={state} /></group>
  if (p.kind === 'house') {
    return (
      <group position={p.pos} {...events}>
        <Shape g="house" state={state} pos={[0, 1, 0]} />
        <Shape g="roof" state={state} pos={[0, 2.7, 0]} rot={[0, Math.PI / 4, 0]} />
      </group>
    )
  }
  return <group position={[p.pos[0], 0.08, p.pos[2]]} {...events}><Shape g="plot" state={state} /></group>
})

function Halos() {
  const g = useRef<THREE.Group>(null)
  const rings = useMemo(() => [
    { r: 46, y: 26, c: '#df2935', t: [1.2, 0.2, 0] },
    { r: 58, y: 40, c: '#a45bd0', t: [1.0, 0.0, 0.3] },
    { r: 38, y: 18, c: '#5a2278', t: [1.4, 0.1, 0] },
  ], [])
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.05 })
  return (
    <group ref={g}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, r.y, 0]} rotation={r.t as [number, number, number]}>
          <torusGeometry args={[r.r, 0.12, 6, 96]} />
          <meshBasicMaterial color={r.c} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

export default function CityScene(h: Handlers) {
  const [interacting, setInteracting] = useState(false)
  const hRef = useRef(h)
  hRef.current = h
  const onSelect = useCallback((id: number) => hRef.current.onSelect(id), [])
  const onHover = useCallback((id: number | null) => hRef.current.onHover(id), [])
  return (
    <Canvas camera={{ position: [42, 30, 42], fov: 48 }} dpr={1} gl={{ antialias: false, powerPreference: 'default' }} onPointerMissed={() => h.onSelect(-1)}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
      }}>
      <color attach="background" args={['#0e0e0e']} />
      <fog attach="fog" args={['#0e0e0e', 55, 140]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 30, 0]} intensity={900} color="#a45bd0" />
      <pointLight position={[30, 10, -30]} intensity={500} color="#df2935" />
      <Stars radius={130} depth={50} count={900} factor={4} fade speed={0.4} />
      <Halos />

      <Grid position={[0, -0.01, 0]} args={[10, 10]} cellSize={1.1} sectionSize={5.5} cellThickness={0.5} sectionThickness={1.2}
        cellColor="#3a1450" sectionColor="#df2935" fadeDistance={95} fadeStrength={1.6} infiniteGrid />

      {PROPERTIES.map((p) => (
        <Lot key={p.id} p={p} onSelect={onSelect} onHover={onHover}
          state={h.selected === p.id ? 'selected' : h.hover === p.id ? 'hover' : h.ownership(p.id)} />
      ))}

      <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.15} minDistance={14} maxDistance={80}
        autoRotate={!interacting && h.selected == null} autoRotateSpeed={0.5}
        onStart={() => setInteracting(true)} onEnd={() => setInteracting(false)} />
    </Canvas>
  )
}

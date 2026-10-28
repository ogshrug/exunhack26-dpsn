import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAPITALS } from '../lib/capitals'
import { ping } from '../lib/audio'
import { feature } from 'topojson-client'
import { geoContains } from 'd3-geo'
import land110 from 'world-atlas/land-110m.json'

const R = 2
const toVec = (lat: number, lng: number, r = R) => {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

function Earth({ sound, time, bright }: { sound: boolean; time?: number; bright?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Mesh[]>([])
  const pings = useRef<{ i: number; t: number }[]>([])
  const positions = useMemo(() => CAPITALS.map((c) => toVec(c.lat, c.lng)), [])

  const grid = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const gridStep = bright ? 15 : 30
    for (let lat = -Math.floor(75 / gridStep) * gridStep; lat <= 75; lat += gridStep)
      for (let lng = 0; lng < 360; lng += 4) pts.push(toVec(lat, lng), toVec(lat, lng + 4))
    for (let lng = 0; lng < 360; lng += gridStep)
      for (let lat = -88; lat < 88; lat += 4) pts.push(toVec(lat, lng), toVec(lat + 4, lng))
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [bright])

  const landGeo = useMemo(() => {
    if (!bright) return null
    const topo = land110 as unknown as Parameters<typeof feature>[0]
    const fc = feature(topo, (topo as unknown as { objects: { land: never } }).objects.land) as unknown as Parameters<typeof geoContains>[0]
    const pts: number[] = []
    const step = 1.6
    for (let lat = -84; lat <= 84; lat += step) {
      const stepLng = step / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
      for (let lng = -180; lng < 180; lng += stepLng) {
        if (geoContains(fc, [lng, lat])) { const v = toVec(lat, lng, R + 0.004); pts.push(v.x, v.y, v.z) }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [bright])

  const dots = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions.flatMap((p) => [p.x, p.y, p.z]), 3))
    return g
  }, [positions])

  useEffect(() => {
    if (time !== undefined) return
    const id = setInterval(() => {
      pings.current.push({ i: Math.floor(Math.random() * CAPITALS.length), t: 0 })
      if (sound) ping()
    }, 600)
    return () => clearInterval(id)
  }, [sound, time])

  useFrame((_, dt) => {
    if (time !== undefined) {
      if (group.current) group.current.rotation.y = bright ? 4.57 - time * 0.12 : 0.6 + time * 0.12
      const k1 = Math.floor(time / 0.6)
      rings.current.forEach((m) => { m.visible = false })
      for (let j = 0; j < 4; j++) {
        const k = k1 - j, age = time - k * 0.6
        if (k < 0 || age >= 1.4) continue
        const m = rings.current[k % 12]
        m.visible = true
        m.position.copy(positions[(k * 37) % CAPITALS.length])
        m.lookAt(0, 0, 0)
        const s = 0.02 + age * 0.25
        m.scale.set(s, s, s)
        ;(m.material as THREE.MeshBasicMaterial).opacity = 1 - age / 1.4
      }
      return
    }
    if (group.current) group.current.rotation.y += dt * 0.12
    pings.current = pings.current.filter((p) => (p.t += dt) < 1.4)
    rings.current.forEach((m, k) => {
      const p = pings.current[k]
      m.visible = !!p
      if (!p) return
      m.position.copy(positions[p.i])
      m.lookAt(0, 0, 0)
      const s = 0.02 + p.t * 0.25
      m.scale.set(s, s, s)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 1 - p.t / 1.4
    })
  })

  return (
    <group ref={group}>
      <mesh><sphereGeometry args={[R - 0.01, 48, 48]} /><meshBasicMaterial color={bright ? '#1a070d' : '#05070d'} /></mesh>
      <lineSegments geometry={grid}><lineBasicMaterial color={bright ? '#ff4452' : '#df2935'} transparent opacity={bright ? 0.8 : 0.35} /></lineSegments>
      <points geometry={dots}><pointsMaterial color={bright ? '#ffc2c7' : '#f2737b'} size={bright ? 0.085 : 0.05} sizeAttenuation /></points>
      {landGeo && <points geometry={landGeo}><pointsMaterial color="#ff5964" size={0.034} sizeAttenuation transparent opacity={0.95} /></points>}
      {bright && (
        <>
          <mesh scale={1.03}><sphereGeometry args={[R, 48, 48]} /><meshBasicMaterial color="#df2935" transparent opacity={0.13} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
          <mesh scale={1.09}><sphereGeometry args={[R, 48, 48]} /><meshBasicMaterial color="#df2935" transparent opacity={0.06} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        </>
      )}
      {Array.from({ length: 12 }, (_, k) => (
        <mesh key={k} ref={(m) => { if (m) rings.current[k] = m }} visible={false}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#df2935" transparent side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function Shards({ time }: { time?: number }) {
  const g = useRef<THREE.Group>(null)
  const items = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      pos: new THREE.Vector3().setFromSphericalCoords(3 + Math.random() * 1.6, Math.random() * Math.PI, Math.random() * Math.PI * 2),
      s: 0.12 + Math.random() * 0.25,
      kind: i % 3,
    })),
    [],
  )
  useFrame(({ clock }, dt) => {
    if (!g.current) return
    const t = time ?? clock.elapsedTime
    if (time !== undefined) g.current.rotation.y = -time * 0.05
    else g.current.rotation.y -= dt * 0.05
    g.current.children.forEach((c, i) => {
      if (time !== undefined) { c.rotation.x = time * 0.4; c.rotation.y = time * 0.3 }
      else { c.rotation.x += dt * 0.4; c.rotation.y += dt * 0.3 }
      c.position.y = items[i].pos.y + Math.sin(t + i) * 0.15
    })
  })
  return (
    <group ref={g}>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} scale={it.s}>
          {it.kind === 0 ? <octahedronGeometry /> : it.kind === 1 ? <icosahedronGeometry /> : <torusGeometry args={[1, 0.3, 8, 24]} />}
          <meshStandardMaterial color="#df2935" emissive="#8a1520" emissiveIntensity={0.8} wireframe={i % 2 === 0} />
        </mesh>
      ))}
    </group>
  )
}

function Rig({ time, push }: { time: number; push: [number, number, number] }) {
  useFrame(({ camera }) => { camera.position.z = push[0] + (push[1] - push[0]) * Math.min(1, Math.max(0, time / push[2])) })
  return null
}

export default function Globe({ sound, shards = true, dpr = [1, 1.5], time, push, bright }: { sound: boolean; shards?: boolean; dpr?: number | [number, number]; time?: number; push?: [number, number, number]; bright?: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={dpr} gl={{ antialias: Array.isArray(dpr), powerPreference: 'high-performance' }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={40} color="#df2935" />
      <Earth sound={sound} time={time} bright={bright} />
      {shards && <Shards time={time} />}
      {time !== undefined && push && <Rig time={time} push={push} />}
    </Canvas>
  )
}

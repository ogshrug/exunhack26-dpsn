import * as faceapi from '@vladmandic/face-api'
import { supabase } from './supabase'

let loaded: Promise<void> | null = null

export function loadFaceModels() {
  loaded ??= (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ])
    const blank = document.createElement('canvas')
    blank.width = blank.height = 160
    try {
      await faceapi.detectSingleFace(blank, opts).withFaceLandmarks().withFaceDescriptor()
    } catch { }
  })()
  return loaded
}

function warmFunctions() {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  for (const fn of ['face-login', 'face-register', 'password-login', 'password-register']) void fetch(`${base}/${fn}`, { method: 'OPTIONS' }).catch(() => {})
}

export function prefetchFace() {
  warmFunctions()
  void loadFaceModels()
}

const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })

type CaptureOpts = { frames?: number; gapMs?: number; timeoutMs?: number }

export async function captureEmbedding(video: HTMLVideoElement, { frames = 3, gapMs = 200, timeoutMs = 5000 }: CaptureOpts = {}): Promise<number[] | null> {
  const acc = new Array<number>(128).fill(0)
  let n = 0
  const end = performance.now() + timeoutMs
  while (n < frames && performance.now() < end) {
    const det = await faceapi.detectSingleFace(video, opts).withFaceLandmarks().withFaceDescriptor()
    if (det) {
      det.descriptor.forEach((v, k) => (acc[k] += v))
      n++
      if (n < frames) await new Promise((r) => setTimeout(r, gapMs))
    } else {
      await new Promise((r) => setTimeout(r, 80))
    }
  }
  return n < frames ? null : acc.map((v) => v / n)
}

type FnResult = { token_hash?: string; email?: string; error?: string }

async function exchange(fn: string, body: object) {
  const { data, error } = await supabase.functions.invoke<FnResult>(fn, { body })
  let msg = data?.error
  if (error) {
    const ctxRes = (error as { context?: Response }).context
    msg = ctxRes ? ((await ctxRes.json().catch(() => null)) as FnResult | null)?.error ?? error.message : error.message
  }
  if (msg || !data?.token_hash) throw new Error(msg ?? 'unknown error')
  const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
  if (vErr) throw vErr
}

export const passwordLogin = (handle: string, password: string) => exchange('password-login', { handle, password })
export const passwordRegister = (handle: string, password: string, inviteCode?: string) =>
  exchange('password-register', { handle, password: password || undefined, inviteCode: inviteCode || undefined })
export async function faceEnroll(embedding: number[]) {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>('face-enroll', { body: { embedding } })
  let msg = data?.error
  if (error) {
    const res = (error as { context?: Response }).context
    msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? error.message : error.message
  }
  if (msg) throw new Error(msg)
}
export const faceLogin = (embedding: number[]) => exchange('face-login', { embedding })
export const faceRegister = (embedding: number[], handle: string, inviteCode?: string) =>
  exchange('face-register', { embedding, handle, inviteCode: inviteCode || undefined })

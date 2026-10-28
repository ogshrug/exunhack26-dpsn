export async function cropTo43(file: File, w = 800, h = 600): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const target = w / h
  let sw = bmp.width
  let sh = bmp.height
  if (sw / sh > target) sw = sh * target
  else sh = sw / target
  const sx = (bmp.width - sw) / 2
  const sy = (bmp.height - sh) / 2
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h)
  bmp.close()
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('crop failed'))), 'image/jpeg', 0.85))
}

export const PRESETS: Record<'contract' | 'substance' | 'hitman' | 'enslavement', string[]> = {
  contract: ['bounty-1', 'bounty-2', 'bounty-3', 'bounty-4'].map((n) => `/placeholders/${n}.svg`),
  hitman: ['hitman-1', 'hitman-2', 'hitman-3'].map((n) => `/placeholders/${n}.svg`),
  enslavement: ['enslave-1', 'enslave-2', 'enslave-3'].map((n) => `/placeholders/${n}.svg`),
  substance: ['substance-1', 'substance-2', 'substance-3'].map((n) => `/placeholders/${n}.svg`),
}

export async function downscale(file: File, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('resize failed'))), 'image/jpeg', 0.85))
}

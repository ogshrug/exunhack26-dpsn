import { supabase } from './supabase'
import { downscale } from './image'

export async function uploadImages(files: File[], uid: string): Promise<string[]> {
  return Promise.all(files.map(async (f) => {
    const path = `${uid}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('listing-images').upload(path, await downscale(f), { contentType: 'image/jpeg' })
    if (error) throw error
    return supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl
  }))
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Something went wrong')

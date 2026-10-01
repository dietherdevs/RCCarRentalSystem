import { fail, supabase } from './client'
import { uid } from './ids'
import type { PhotoRow } from './cars'

const BUCKET = 'rc-car-photos'
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const sanitizeFilename = (n: string) =>
  n.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'photo'

// The bucket is private: images are only reachable through short-lived signed URLs.
export async function signedUrls(paths: string[]) {
  const out = new Map<string, string>()
  if (!paths.length) return out
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  fail(error)
  for (const d of data ?? []) if (d.signedUrl && d.path) out.set(d.path, d.signedUrl)
  return out
}

export async function savePhoto(p: {
  carRef: string
  existing: PhotoRow | null
  isPrimary: boolean
  sortOrder: number
  full: Blob
  thumb: Blob
  originalName: string
}) {
  const carId = uid('car', p.carRef)
  const key = crypto.randomUUID()
  const path = `cars/${carId}/${key}.webp`
  const thumb = `cars/${carId}/${key}_thumb.webp`
  const bucket = supabase.storage.from(BUCKET)
  const up = await bucket.upload(path, p.full, { contentType: 'image/webp', upsert: false })
  fail(up.error)
  const upT = await bucket.upload(thumb, p.thumb, { contentType: 'image/webp', upsert: false })
  if (upT.error) {
    await bucket.remove([path])
    fail(upT.error)
  }
  const { data: u } = await supabase.auth.getUser()
  const fields = {
    storage_path: path, thumbnail_path: thumb, original_filename_sanitized: sanitizeFilename(p.originalName),
    mime_type: 'image/webp', size_bytes: p.full.size,
  }
  try {
    if (p.existing) {
      const { error } = await supabase.from('rc_car_photos').update(fields).eq('id', p.existing.id)
      fail(error)
      await bucket.remove([p.existing.storage_path, ...(p.existing.thumbnail_path ? [p.existing.thumbnail_path] : [])])
    } else {
      const { data, error } = await supabase.from('rc_car_photos')
        .insert({ car_id: carId, ...fields, is_primary: p.isPrimary, sort_order: p.sortOrder, uploaded_by: u.user?.id })
        .select('id').single()
      fail(error)
      if (p.isPrimary) {
        const r = await supabase.from('rc_cars').update({ primary_photo_id: data!.id }).eq('id', carId)
        fail(r.error)
      }
    }
  } catch (e) {
    await bucket.remove([path, thumb])
    throw e
  }
}

export async function removePhoto(photo: PhotoRow) {
  const { error } = await supabase.from('rc_car_photos').delete().eq('id', photo.id)
  fail(error)
  await supabase.storage.from(BUCKET).remove([photo.storage_path, ...(photo.thumbnail_path ? [photo.thumbnail_path] : [])])
}

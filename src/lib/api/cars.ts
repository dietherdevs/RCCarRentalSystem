import { fail, supabase } from './client'
import { uid } from './ids'

export interface CarRow {
  id: string
  asset_id: string
  name: string
  brand: string
  model: string
  scale: string
  category: string
  description: string
  hourly_rate: number
  condition: 'Good' | 'Minor wear' | 'Damaged'
  status: string
}
export interface PhotoRow {
  id: string
  car_id: string
  storage_path: string
  thumbnail_path: string | null
  is_primary: boolean
  sort_order: number
}

export async function fetchCars() {
  const [c, p] = await Promise.all([
    supabase.from('rc_cars').select('*').order('asset_id'),
    supabase.from('rc_car_photos').select('id, car_id, storage_path, thumbnail_path, is_primary, sort_order'),
  ])
  fail(c.error); fail(p.error)
  return { cars: (c.data ?? []) as CarRow[], photos: (p.data ?? []) as PhotoRow[] }
}

export async function saveCar(c: {
  id: string; name: string; brand: string; model: string; category: string; scale: string; desc: string
  rate: number; condition: string; status?: string
}, isNew: boolean) {
  const row = {
    name: c.name, brand: c.brand, model: c.model, category: c.category, scale: c.scale, description: c.desc,
    hourly_rate: c.rate, condition: c.condition, ...(c.status ? { status: c.status } : {}),
  }
  if (isNew) {
    const { error } = await supabase.from('rc_cars').insert({ asset_id: c.id, ...row })
    if (error?.code === '23505') throw new Error(`${c.id} already exists. Choose another asset ID.`)
    fail(error)
  } else {
    const { error } = await supabase.from('rc_cars').update(row).eq('id', uid('car', c.id))
    fail(error)
  }
}

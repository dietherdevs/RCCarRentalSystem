import { fail, iso, supabase } from './client'
import { uid } from './ids'

export interface MaintRow {
  id: string
  ref_no: string
  car_id: string
  date: string
  issue: string
  repair: string
  parts: string
  cost: number
  notes: string
  staff_name: string
  is_open: boolean
}

export async function fetchMaintenance() {
  const { data, error } = await supabase.from('maintenance_records').select('*').order('date', { ascending: false })
  fail(error)
  return (data ?? []) as MaintRow[]
}
export async function logMaintenance(m: {
  carRef: string; date: number; issue: string; repair: string; parts: string; cost: number; notes: string; staffId?: string; setStatus: boolean
}) {
  const { error } = await supabase.rpc('log_maintenance', {
    p_car: uid('car', m.carRef), p_date: iso(m.date), p_issue: m.issue, p_repair: m.repair, p_parts: m.parts,
    p_cost: m.cost, p_notes: m.notes, p_staff: m.staffId ?? null, p_set_status: m.setStatus,
  })
  fail(error)
}
export async function releaseCar(carRef: string, note: string) {
  const { error } = await supabase.rpc('release_car', { p_car: uid('car', carRef), p_note: note })
  fail(error)
}

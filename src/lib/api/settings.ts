import { fail, supabase } from './client'

export interface SettingsRow {
  id: string
  hourly_rate: number
  track_price: number
  min_rental_unit_minutes: number
  rounding_rule: 'up' | 'nearest' | 'down'
  timezone: string
  business_name: string
  branch_name: string
  opening_hours: string
  return_alert_minutes: number
  max_photo_mb: number
  permissions: Record<string, Record<string, boolean>> | null
}

export async function fetchSettings() {
  const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle()
  fail(error)
  return data as SettingsRow | null
}
export async function updateSettings(id: string | null, patch: Partial<Omit<SettingsRow, 'id'>>) {
  const { error } = id
    ? await supabase.from('settings').update(patch).eq('id', id)
    : await supabase.from('settings').insert({ singleton: true, ...patch })
  fail(error)
}

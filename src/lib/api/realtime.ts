import { supabase } from './client'

const TABLES = ['rentals', 'rc_cars', 'rc_car_photos', 'payments', 'payment_lines', 'payment_transactions', 'track_passes', 'maintenance_records', 'customers']

export function subscribeChanges(onChange: (table: string) => void) {
  let ch = supabase.channel('app-changes')
  for (const table of TABLES) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table))
  ch.subscribe()
  return () => {
    void supabase.removeChannel(ch)
  }
}

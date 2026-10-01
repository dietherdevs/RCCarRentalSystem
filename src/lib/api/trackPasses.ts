import { fail, supabase } from './client'
import { uid } from './ids'

export interface PassRow {
  id: string
  ref_no: string
  customer_id: string
  payment_id: string | null
  price: number
  pass_date: string
  checkin_time: string | null
  checkout_time: string | null
}

export async function fetchTrackPasses() {
  const { data, error } = await supabase.from('track_passes').select('*').order('pass_date')
  fail(error)
  return (data ?? []) as PassRow[]
}
export async function sellTrack(customerRef: string, method: string, linkPaymentRef?: string) {
  const { data, error } = await supabase.rpc('sell_track', {
    p_customer: uid('cust', customerRef), p_method: method,
    p_link_payment: linkPaymentRef ? uid('pay', linkPaymentRef) : null,
  })
  fail(error)
  return data as { pass_ref: string; payment_ref: string }
}
export async function trackClock(passRef: string, kind: 'in' | 'out') {
  const { error } = await supabase.rpc('track_clock', { p_pass: uid('pass', passRef), p_kind: kind })
  fail(error)
}

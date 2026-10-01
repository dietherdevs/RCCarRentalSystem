import { fail, iso, supabase } from './client'
import { uid } from './ids'

export interface RentalRow {
  id: string
  ref_no: string
  customer_id: string
  car_id: string
  payment_id: string | null
  start_time: string
  end_time: string
  actual_checkout_time: string | null
  actual_return_time: string | null
  rental_amount: number
  status: 'Reserved' | 'Active' | 'Returned' | 'Cancelled' | 'No-show'
  return_condition: 'Good' | 'Minor wear' | 'Damaged' | null
  damage_notes: string | null
  return_photo_count: number
  history: { at: number; text: string; by: string }[]
}

export async function fetchRentals() {
  const { data, error } = await supabase.from('rentals').select('*').order('start_time')
  fail(error)
  return (data ?? []) as RentalRow[]
}

export async function createBooking(b: {
  customerRef: string
  items: { carRef: string; start: number; end: number }[]
  track: boolean
  method: string
  amountPaid: number
}) {
  const { data, error } = await supabase.rpc('create_rental', {
    p_customer_id: uid('cust', b.customerRef),
    p_items: b.items.map((i) => ({ car_id: uid('car', i.carRef), start_time: iso(i.start), end_time: iso(i.end) })),
    p_track: b.track,
    p_method: b.method,
    p_amount_paid: b.amountPaid,
  })
  fail(error)
  const r = data as { rental_refs: string[]; payment_ref: string; total: number }
  return { rentalIds: r.rental_refs, paymentId: r.payment_ref, total: Number(r.total) }
}
export async function checkOut(ref: string) {
  const { error } = await supabase.rpc('checkout_rental', { p_rental: uid('rental', ref) })
  fail(error)
}
export async function returnRental(ref: string, r: {
  actualReturn: number; condition: string; notes: string; photos: number; outcome: string; payAmount: number; method: string
}) {
  const { error } = await supabase.rpc('return_rental', {
    p_rental: uid('rental', ref), p_actual_return: iso(r.actualReturn), p_condition: r.condition, p_notes: r.notes,
    p_photos: r.photos, p_outcome: r.outcome, p_pay_amount: r.payAmount, p_method: r.method,
  })
  fail(error)
}
export async function extendRental(ref: string, minutes: number) {
  const { error } = await supabase.rpc('extend_rental', { p_rental: uid('rental', ref), p_minutes: minutes })
  fail(error)
}
export async function cancelRental(ref: string) {
  const { error } = await supabase.rpc('cancel_rental', { p_rental: uid('rental', ref) })
  fail(error)
}

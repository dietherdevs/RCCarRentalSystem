import { fail, supabase } from './client'
import { uid } from './ids'

export interface PaymentRow {
  id: string; ref_no: string; customer_id: string; status: string; refunded: number; created_at: string
}
export interface LineRow {
  payment_id: string; kind: 'rental' | 'track'; label: string; amount: number; rental_id: string | null; track_pass_id: string | null; created_at: string
}
export interface TxnRow {
  payment_id: string; amount: number; method: string; note: string | null; recorded_name: string | null; created_at: string
}
export interface RevenueRow { at: string; rental_amount: number; track_amount: number }

export async function fetchPayments() {
  const [p, l, t] = await Promise.all([
    supabase.from('payments').select('id, ref_no, customer_id, status, refunded, created_at').order('created_at'),
    supabase.from('payment_lines').select('payment_id, kind, label, amount, rental_id, track_pass_id, created_at').order('created_at'),
    supabase.from('payment_transactions').select('payment_id, amount, method, note, recorded_name, created_at').order('created_at'),
  ])
  fail(p.error); fail(l.error); fail(t.error)
  return { payments: (p.data ?? []) as PaymentRow[], lines: (l.data ?? []) as LineRow[], txns: (t.data ?? []) as TxnRow[] }
}
// Per-transaction revenue split (RC vs Track), allocated pro-rata by the SQL view v_revenue_txns.
export async function fetchRevenue() {
  const { data, error } = await supabase.from('v_revenue_txns').select('at, rental_amount, track_amount')
  fail(error)
  return (data ?? []) as RevenueRow[]
}
export async function recordPayment(payRef: string, amount: number, method: string, note?: string) {
  const { error } = await supabase.rpc('record_payment', { p_payment: uid('pay', payRef), p_amount: amount, p_method: method, p_note: note ?? null })
  fail(error)
}
export async function refundPayment(payRef: string, amount: number, reason: string) {
  const { error } = await supabase.rpc('refund_payment', { p_payment: uid('pay', payRef), p_amount: amount, p_reason: reason })
  fail(error)
}

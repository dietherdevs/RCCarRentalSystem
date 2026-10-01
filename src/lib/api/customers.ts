import { fail, supabase } from './client'

export interface CustomerRow {
  id: string
  ref_no: string
  user_id: string | null
  name: string
  phone: string
  email: string
  notes: string | null
  created_at: string
}

export async function fetchCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('created_at')
  fail(error)
  return (data ?? []) as CustomerRow[]
}
export async function createCustomer(c: { name: string; phone: string; email: string; notes?: string }) {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: c.name, phone: c.phone, email: c.email, notes: c.notes ?? null })
    .select()
    .single()
  fail(error)
  return data as CustomerRow
}

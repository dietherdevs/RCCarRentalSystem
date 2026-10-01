import { fail, supabase } from './client'

export interface ProfileRow {
  id: string
  name: string
  email: string | null
  role: 'admin' | 'staff' | 'customer'
  active: boolean
  created_at: string
}

export async function fetchProfile(id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  fail(error)
  return data as ProfileRow | null
}
export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  fail(error)
  return (data ?? []) as ProfileRow[]
}
export async function setActive(id: string, active: boolean) {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', id)
  fail(error)
}
export async function inviteUser(u: { name: string; email: string; role: 'admin' | 'staff' | 'customer' }) {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { ...u, redirectTo: window.location.origin + window.location.pathname },
  })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(body?.error ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
}

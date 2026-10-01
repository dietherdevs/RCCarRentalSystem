import { fail, supabase } from './client'

export interface AuditRow {
  id: string
  actor_name: string
  actor_role: string
  action: string
  entity: string
  entity_ref: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: string
}

export async function fetchAuditLogs() {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
  fail(error)
  return (data ?? []) as AuditRow[]
}

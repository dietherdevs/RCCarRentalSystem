import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anon)

// Only the public anon key is ever used in the browser. Never put the service_role key in a VITE_ variable.
export const supabase = createClient(url ?? 'http://localhost:54321', anon ?? 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

export function fail(error: { message: string } | null): asserts error is null {
  if (!error) return
  const m = error.message
  if (/row-level security|permission denied/i.test(m)) throw new Error('You do not have permission to do that.')
  if (/Failed to fetch|NetworkError|fetch failed/i.test(m)) throw new Error('Could not reach the server. Check your connection and try again.')
  throw new Error(m)
}

export const iso = (t: number) => new Date(t).toISOString()
export const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : undefined)

// Edge Function: lets an admin invite a staff/admin/customer user.
// The service_role key lives only here (Supabase injects it as an env var); it never reaches the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: u } = await caller.auth.getUser()
    if (!u.user) return json({ error: 'Not signed in' }, 401)
    const { data: me } = await admin.from('profiles').select('role, active').eq('id', u.user.id).single()
    if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Admins only' }, 403)

    const { name, email, role, redirectTo } = await req.json()
    if (!name || !email || !['admin', 'staff', 'customer'].includes(role)) return json({ error: 'Invalid input' }, 400)

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { name }, redirectTo })
    if (error) return json({ error: error.message }, 400)
    const id = data.user.id
    await admin.from('profiles').update({ role, name }).eq('id', id)
    if (role !== 'customer') await admin.from('customers').delete().eq('user_id', id)
    return json({ id })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

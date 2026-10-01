import { fail, supabase } from './client'

export const getSession = async () => (await supabase.auth.getSession()).data.session

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  fail(error)
}
export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
  fail(error)
  return { needsConfirm: !data.session }
}
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  fail(error)
}
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  })
  fail(error)
}
export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  fail(error)
}
// Extension point for optional 2FA (supabase.auth.mfa.*). Intentionally not wired yet.

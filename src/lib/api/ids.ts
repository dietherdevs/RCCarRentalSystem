// UI records are keyed by their human refs (R-1001, RC-001 ...). Mutations need the row uuid; this maps one to the other.
const m = new Map<string, string>()
export type IdKind = 'car' | 'cust' | 'rental' | 'pay' | 'pass' | 'maint'
export const reg = (kind: IdKind, ref: string, id: string) => {
  m.set(`${kind}:${ref}`, id)
  return ref
}
export const uid = (kind: IdKind, ref: string) => {
  const v = m.get(`${kind}:${ref}`)
  if (!v) throw new Error(`Unknown ${kind} ${ref}. Refresh and try again.`)
  return v
}
export const clearIds = () => m.clear()

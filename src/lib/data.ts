export type Role = 'Admin' | 'Staff' | 'Customer'

export type CarStatus =
  | 'Available'
  | 'Reserved'
  | 'Active Rental'
  | 'Returned'
  | 'Maintenance'
  | 'Damaged'
  | 'Inactive'
export const CAR_STATUSES: CarStatus[] = [
  'Available',
  'Reserved',
  'Active Rental',
  'Returned',
  'Maintenance',
  'Damaged',
  'Inactive',
]
export type BaseStatus = 'Available' | 'Returned' | 'Maintenance' | 'Damaged' | 'Inactive'
export type Condition = 'Good' | 'Minor wear' | 'Damaged'
export type RentalStatus = 'Upcoming' | 'Active' | 'Overdue' | 'Returned' | 'Cancelled'
export type PayStatus = 'Pending' | 'Paid' | 'Partially Paid' | 'Refunded' | 'Cancelled'
export const PAY_STATUSES: PayStatus[] = ['Pending', 'Paid', 'Partially Paid', 'Refunded', 'Cancelled']
export type PayMethod = 'Cash' | 'Card (terminal)' | 'Bank transfer'

export interface Car {
  id: string
  name: string
  brand: string
  model: string
  category: string
  desc: string
  rate: number
  condition: Condition
  base: BaseStatus
  photos: string[]
  photoIds?: string[]
  scale: string
}
export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  notes?: string
  joined: number
  userId?: string
}
export interface HistoryEntry {
  at: number
  text: string
  by: string
}
export interface Rental {
  id: string
  customerId: string
  carId: string
  start: number
  end: number
  actualOut?: number
  actualReturn?: number
  status: RentalStatus
  condition?: Condition
  damageNotes?: string
  returnPhotos?: number
  paymentId: string
  amount: number
  history: HistoryEntry[]
}
export interface TrackPass {
  id: string
  customerId: string
  date: number
  price: number
  checkIn?: number
  checkOut?: number
  paymentId: string
}
export interface PayLine {
  label: string
  amount: number
  kind: 'rental' | 'track'
  ref: string
}
export interface PayTxn {
  at: number
  amount: number
  method: PayMethod
  by: string
  note?: string
}
export interface Payment {
  id: string
  customerId: string
  lines: PayLine[]
  status: PayStatus
  txns: PayTxn[]
  refunded: number
  created: number
}
export interface Maintenance {
  id: string
  carId: string
  date: number
  issue: string
  repair: string
  parts: string
  cost: number
  notes: string
  staff: string
  open: boolean
}
export interface AuditEntry {
  id: string
  at: number
  user: string
  role: Role | 'System'
  action: string
  entity: string
  before: string
  after: string
}
export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  last: string
}
export interface Settings {
  carRate: number
  trackPrice: number
  minUnit: number
  rounding: 'up' | 'nearest' | 'down'
  timezone: string
  business: string
  branch: string
  hours: string
  returnAlertMins: number
  maxPhotoMB: number
}

export const DAY = 86400000

export const peso = (n: number) => '₱' + Math.round(n).toLocaleString('en-PH')
export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const fmtDT = (t: number) => `${fmtDay(t)}, ${fmtTime(t)}`
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
export const startOfDay = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
export const fmtDur = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`
}
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
export const toLocalInput = (t: number) => {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function billedMinutes(mins: number, s: Pick<Settings, 'minUnit' | 'rounding'>) {
  if (mins <= 0) return 0
  const u = s.minUnit
  if (s.rounding === 'up') return Math.ceil(mins / u) * u
  if (s.rounding === 'down') return Math.max(u, Math.floor(mins / u) * u)
  return Math.max(u, Math.round(mins / u) * u)
}
// Non-dummy defaults, used until the settings row loads. The database settings row is the source of truth.
export const DEFAULT_SETTINGS: Settings = {
  carRate: 200,
  trackPrice: 300,
  minUnit: 30,
  rounding: 'up',
  timezone: 'Asia/Manila',
  business: 'RC Rental & Track',
  branch: 'Main branch',
  hours: '9:00 AM – 9:00 PM',
  returnAlertMins: 30,
  maxPhotoMB: 5,
}

export const carPrice = (mins: number, rate: number, s: Settings) =>
  Math.round((billedMinutes(mins, s) / 60) * rate)


export type Action =
  | 'rentals.manage'
  | 'cars.edit'
  | 'cars.maintenance'
  | 'payments.record'
  | 'payments.refund'
  | 'customers.contact'
  | 'reports.view'
  | 'settings.pricing'
  | 'users.manage'
  | 'audit.view'
export const ACTIONS: { key: Action; label: string }[] = [
  { key: 'rentals.manage', label: 'Create / check-out / return rentals' },
  { key: 'cars.edit', label: 'Add, edit and photograph cars' },
  { key: 'cars.maintenance', label: 'Log maintenance & release cars' },
  { key: 'payments.record', label: 'Record payments' },
  { key: 'payments.refund', label: 'Issue refunds' },
  { key: 'customers.contact', label: 'View full customer contact details' },
  { key: 'reports.view', label: 'View reports' },
  { key: 'settings.pricing', label: 'Change pricing & business settings' },
  { key: 'users.manage', label: 'Manage users & permissions' },
  { key: 'audit.view', label: 'View audit log' },
]
export const PERMS0: Record<Role, Record<Action, boolean>> = {
  Admin: Object.fromEntries(ACTIONS.map((a) => [a.key, true])) as Record<Action, boolean>,
  Staff: {
    'rentals.manage': true,
    'cars.edit': true,
    'cars.maintenance': true,
    'payments.record': true,
    'payments.refund': false,
    'customers.contact': false,
    'reports.view': false,
    'settings.pricing': false,
    'users.manage': false,
    'audit.view': false,
  },
  Customer: {
    'rentals.manage': false,
    'cars.edit': false,
    'cars.maintenance': false,
    'payments.record': false,
    'payments.refund': false,
    'customers.contact': false,
    'reports.view': false,
    'settings.pricing': false,
    'users.manage': false,
    'audit.view': false,
  },
}

export const maskPhone = (p: string) => p.replace(/\d(?=(?:\D*\d){3})/g, '•')
export const maskEmail = (e: string) => {
  const [u, d] = e.split('@')
  return u[0] + '•••@' + d
}

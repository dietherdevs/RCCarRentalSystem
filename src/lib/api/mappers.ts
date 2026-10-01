import type { AppUser, AuditEntry, Car, Customer, Maintenance, Payment, Rental, Role, Settings, TrackPass } from '../data'
import { DEFAULT_SETTINGS, PERMS0 } from '../data'
import type { CarRow, PhotoRow } from './cars'
import type { CustomerRow } from './customers'
import type { MaintRow } from './maintenance'
import type { LineRow, PaymentRow, TxnRow } from './payments'
import type { ProfileRow } from './profiles'
import type { RentalRow } from './rentals'
import type { SettingsRow } from './settings'
import type { PassRow } from './trackPasses'
import type { AuditRow } from './auditLogs'
import { ms } from './client'
import { reg } from './ids'

export const roleOf = (r: string): Role => (r === 'admin' ? 'Admin' : r === 'staff' ? 'Staff' : 'Customer')

export function mapSettings(s: SettingsRow | null): Settings {
  if (!s) return DEFAULT_SETTINGS
  return {
    carRate: Number(s.hourly_rate),
    trackPrice: Number(s.track_price),
    minUnit: s.min_rental_unit_minutes,
    rounding: s.rounding_rule,
    timezone: s.timezone,
    business: s.business_name,
    branch: s.branch_name,
    hours: s.opening_hours,
    returnAlertMins: s.return_alert_minutes,
    maxPhotoMB: s.max_photo_mb,
  }
}
export function mapPerms(s: SettingsRow | null) {
  const out = JSON.parse(JSON.stringify(PERMS0)) as typeof PERMS0
  const saved = s?.permissions
  if (saved) for (const r of ['Staff', 'Customer'] as const) Object.assign(out[r], saved[r] ?? {})
  return out
}

export function mapCars(rows: CarRow[], photos: PhotoRow[], urls: Map<string, string>): Car[] {
  return rows.map((r) => {
    const mine = photos
      .filter((p) => p.car_id === r.id)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    return {
      id: reg('car', r.asset_id, r.id),
      name: r.name,
      brand: r.brand,
      model: r.model,
      category: r.category,
      scale: r.scale,
      desc: r.description,
      rate: Number(r.hourly_rate),
      condition: r.condition,
      // Reserved / Active Rental are derived from live rentals in the UI; the stored base is what staff set.
      base: (r.status === 'Reserved' || r.status === 'Active Rental' ? 'Available' : r.status) as Car['base'],
      photos: mine.map((p) => urls.get(p.storage_path) ?? '').filter(Boolean),
      photoIds: mine.map((p) => p.id),
    }
  })
}

export function mapCustomers(rows: CustomerRow[]): Customer[] {
  return rows.map((r) => ({
    id: reg('cust', r.ref_no, r.id),
    name: r.name,
    phone: r.phone,
    email: r.email,
    notes: r.notes ?? undefined,
    joined: ms(r.created_at)!,
    userId: r.user_id ?? undefined,
  }))
}

export interface RefMaps {
  cust: Map<string, string>
  car: Map<string, string>
  pay: Map<string, string>
  rental: Map<string, string>
  pass: Map<string, string>
}
export const refMaps = (): RefMaps => ({ cust: new Map(), car: new Map(), pay: new Map(), rental: new Map(), pass: new Map() })

export function mapRentals(rows: RentalRow[], m: RefMaps): Rental[] {
  return rows.map((r) => ({
    id: reg('rental', r.ref_no, r.id),
    customerId: m.cust.get(r.customer_id) ?? '',
    carId: m.car.get(r.car_id) ?? '',
    start: ms(r.start_time)!,
    end: ms(r.end_time)!,
    actualOut: ms(r.actual_checkout_time),
    actualReturn: ms(r.actual_return_time),
    status: r.status === 'Reserved' ? 'Upcoming' : r.status === 'No-show' ? 'Cancelled' : r.status,
    condition: r.return_condition ?? undefined,
    damageNotes: r.damage_notes ?? undefined,
    returnPhotos: r.return_photo_count || undefined,
    paymentId: (r.payment_id && m.pay.get(r.payment_id)) || '',
    amount: Number(r.rental_amount),
    history: r.history ?? [],
  }))
}

export function mapPasses(rows: PassRow[], m: RefMaps): TrackPass[] {
  return rows.map((r) => ({
    id: reg('pass', r.ref_no, r.id),
    customerId: m.cust.get(r.customer_id) ?? '',
    date: ms(r.pass_date)!,
    price: Number(r.price),
    checkIn: ms(r.checkin_time),
    checkOut: ms(r.checkout_time),
    paymentId: (r.payment_id && m.pay.get(r.payment_id)) || '',
  }))
}

export function mapPayments(rows: PaymentRow[], lines: LineRow[], txns: TxnRow[], m: RefMaps): Payment[] {
  return rows.map((p) => ({
    id: reg('pay', p.ref_no, p.id),
    customerId: m.cust.get(p.customer_id) ?? '',
    status: p.status as Payment['status'],
    refunded: Number(p.refunded),
    created: ms(p.created_at)!,
    lines: lines
      .filter((l) => l.payment_id === p.id)
      .map((l) => ({
        label: l.label,
        amount: Number(l.amount),
        kind: l.kind,
        ref: (l.kind === 'rental' ? m.rental.get(l.rental_id ?? '') : m.pass.get(l.track_pass_id ?? '')) ?? '',
      })),
    txns: txns
      .filter((t) => t.payment_id === p.id)
      .map((t) => ({ at: ms(t.created_at)!, amount: Number(t.amount), method: t.method as Payment['txns'][0]['method'], by: t.recorded_name ?? '', note: t.note ?? undefined })),
  }))
}

export function mapMaint(rows: MaintRow[], m: RefMaps): Maintenance[] {
  return rows.map((r) => ({
    id: reg('maint', r.ref_no, r.id),
    carId: m.car.get(r.car_id) ?? '',
    date: ms(r.date)!,
    issue: r.issue,
    repair: r.repair,
    parts: r.parts,
    cost: Number(r.cost),
    notes: r.notes,
    staff: r.staff_name,
    open: r.is_open,
  }))
}

export const mapUsers = (rows: ProfileRow[]): AppUser[] =>
  rows.map((r) => ({ id: r.id, name: r.name, email: r.email ?? '', role: roleOf(r.role), active: r.active, last: '' }))

const NOISE = new Set(['id', 'created_at', 'created_by', 'updated_at', 'history', 'branch_id', 'brand_model'])
const show = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))
export function mapAudit(rows: AuditRow[]): AuditEntry[] {
  return rows.map((r) => {
    const keys = Object.keys({ ...r.before, ...r.after }).filter(
      (k) => !NOISE.has(k) && (!r.before || !r.after || show(r.before[k]) !== show(r.after[k])),
    )
    const side = (o: AuditRow['before']) => (o ? keys.map((k) => `${k.replace(/_/g, ' ')}: ${show(o[k])}`).join(' · ') : '') || '—'
    return {
      id: r.id,
      at: ms(r.created_at)!,
      user: r.actor_name,
      role: r.actor_role === 'system' ? 'System' : roleOf(r.actor_role),
      action: r.action,
      entity: r.entity_ref ?? r.entity,
      before: side(r.before),
      after: side(r.after),
    }
  })
}

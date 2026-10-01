import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ACTIONS,
  DEFAULT_SETTINGS,
  PERMS0,
  carPrice,
  fmtTime,
  type Action,
  type AppUser,
  type AuditEntry,
  type Car,
  type CarStatus,
  type Condition,
  type Customer,
  type Maintenance,
  type PayMethod,
  type Payment,
  type Rental,
  type Role,
  type Settings,
  type TrackPass,
} from './data'
import type { RevenueTxn } from './calc'
import { isConfigured, supabase, ms } from './api/client'
import { clearIds, uid } from './api/ids'
import * as authApi from './api/auth'
import * as profilesApi from './api/profiles'
import * as settingsApi from './api/settings'
import * as carsApi from './api/cars'
import * as photosApi from './api/photos'
import * as customersApi from './api/customers'
import * as rentalsApi from './api/rentals'
import * as passesApi from './api/trackPasses'
import * as paymentsApi from './api/payments'
import * as maintApi from './api/maintenance'
import * as auditApi from './api/auditLogs'
import { subscribeChanges } from './api/realtime'
import {
  mapAudit, mapCars, mapCustomers, mapMaint, mapPasses, mapPayments, mapPerms, mapRentals, mapSettings, mapUsers,
  refMaps, roleOf,
} from './api/mappers'
import type { ProfileRow } from './api/profiles'

export interface Toast {
  id: number
  msg: string
  tone: 'ok' | 'err' | 'info'
}
export interface BookingInput {
  customerId: string
  items: { carId: string; start: number; end: number }[]
  track: boolean
  method: PayMethod
  amountPaid: number
}
export interface ReturnInput {
  actualReturn: number
  condition: Condition
  notes: string
  photos: number
  outcome: 'Available' | 'Maintenance' | 'Damaged'
  payAmount: number
  method: PayMethod
}

type LoadState = 'loading' | 'ready' | 'error'

interface Ctx {
  configured: boolean
  authReady: boolean
  loadState: LoadState
  loadError: string
  retry: () => void
  role: Role
  authed: boolean
  userId: string
  myCustomerId: string
  signOut: () => Promise<void>
  can: (a: Action) => boolean
  perms: typeof PERMS0
  togglePerm: (r: Role, a: Action) => void
  path: string
  go: (p: string) => void
  now: number
  cars: Car[]
  rentals: Rental[]
  customers: Customer[]
  payments: Payment[]
  passes: TrackPass[]
  maint: Maintenance[]
  audit: AuditEntry[]
  users: AppUser[]
  revenue: RevenueTxn[]
  settings: Settings
  toasts: Toast[]
  toast: (msg: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
  carStatus: (c: Car) => CarStatus
  conflict: (carId: string, start: number, end: number, ignoreId?: string) => Rental | undefined
  createBooking: (b: BookingInput) => Promise<{ rentalIds: string[]; paymentId: string; total: number }>
  checkOut: (id: string) => Promise<boolean>
  returnRental: (id: string, r: ReturnInput) => Promise<boolean>
  extendRental: (id: string, mins: number) => Promise<boolean>
  cancelRental: (id: string) => Promise<boolean>
  recordPayment: (pid: string, amount: number, method: PayMethod, note?: string) => Promise<boolean>
  refundPayment: (pid: string, amount: number, reason: string) => Promise<boolean>
  sellTrack: (customerId: string, method: PayMethod, linkPaymentId?: string) => Promise<string | undefined>
  trackClock: (id: string, kind: 'in' | 'out') => Promise<boolean>
  saveCar: (c: Car, isNew: boolean) => Promise<boolean>
  setCarPhoto: (carId: string, idx: number | 'add', full: Blob, thumb: Blob, originalName: string) => Promise<boolean>
  logMaintenance: (m: Omit<Maintenance, 'id' | 'open'>, setStatus: boolean) => Promise<boolean>
  releaseCar: (carId: string, note: string) => Promise<boolean>
  addCustomer: (c: Omit<Customer, 'id' | 'joined'>) => Promise<Customer | undefined>
  addUser: (u: Omit<AppUser, 'id' | 'last' | 'active'>) => Promise<boolean>
  toggleUser: (id: string) => Promise<boolean>
  saveSettings: (s: Settings) => Promise<boolean>
  customerById: (id: string) => Customer | undefined
  carById: (id: string) => Car | undefined
  actor: string
}

const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

const inviteLanding = typeof window !== 'undefined' && /type=invite/.test(window.location.hash)
const hashPath = () => window.location.hash.slice(1).split('?')[0] || '/login'
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!isConfigured)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [path, setPath] = useState(() => (inviteLanding ? '/reset' : hashPath()))
  const [perms, setPerms] = useState(PERMS0)
  const [cars, setCars] = useState<Car[]>([])
  const [rentalsBase, setRentals] = useState<Rental[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [passes, setPasses] = useState<TrackPass[]>([])
  const [maint, setMaint] = useState<Maintenance[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [revenue, setRevenue] = useState<RevenueTxn[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [now, setNow] = useState(() => Date.now())
  const tid = useRef(1)
  const settingsId = useRef<string | null>(null)
  const photoRows = useRef<carsApi.PhotoRow[]>([])
  const seq = useRef(0)

  const role: Role = profile ? roleOf(profile.role) : 'Customer'
  const authed = Boolean(profile && profile.active)

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(i)
  }, [])
  useEffect(() => {
    const h = () => setPath(hashPath())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const go = useCallback((p: string) => {
    window.location.hash = p
    window.scrollTo({ top: 0 })
  }, [])

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (msg: string, tone: Toast['tone'] = 'ok') => {
      const id = tid.current++
      setToasts((t) => [...t, { id, msg, tone }])
      setTimeout(() => dismissToast(id), 4500)
    },
    [dismissToast],
  )

  // ── auth session ──
  useEffect(() => {
    if (!isConfigured) return
    let live = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      setUserId(data.session?.user.id ?? null)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id ?? null)
      if (event === 'PASSWORD_RECOVERY') window.location.hash = '/reset'
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (!userId) {
      setProfile(null)
      return
    }
    let live = true
    profilesApi
      .fetchProfile(userId)
      .then((p) => {
        if (!live) return
        if (p && !p.active) {
          void authApi.signOut()
          toast('This account has been deactivated. Contact an admin.', 'err')
          setProfile(null)
          return
        }
        setProfile(p)
      })
      .catch((e) => live && toast(errMsg(e), 'err'))
    return () => {
      live = false
    }
  }, [userId, authReady, toast])

  // route by role once the profile is known
  useEffect(() => {
    if (!profile || !profile.active) return
    const p = hashPath()
    if (p === '/reset') return
    if (profile.role === 'customer' && !p.startsWith('/portal')) go('/portal')
    else if (profile.role !== 'customer' && (p.startsWith('/portal') || p === '/login' || p === '/forgot')) go('/')
  }, [profile, go])

  // ── data loading ──
  const load = useCallback(async () => {
    if (!profile || !profile.active) return
    const n = ++seq.current
    const staff = profile.role !== 'customer'
    try {
      const [st, car, cust, rent, pass, pay, mnt, rev, aud, usr] = await Promise.all([
        settingsApi.fetchSettings(),
        carsApi.fetchCars(),
        customersApi.fetchCustomers(),
        rentalsApi.fetchRentals(),
        passesApi.fetchTrackPasses(),
        paymentsApi.fetchPayments(),
        staff ? maintApi.fetchMaintenance() : Promise.resolve([]),
        staff ? paymentsApi.fetchRevenue() : Promise.resolve([]),
        profile.role === 'admin' ? auditApi.fetchAuditLogs() : Promise.resolve([]),
        staff ? profilesApi.fetchProfiles() : Promise.resolve([]),
      ])
      const urls = await photosApi.signedUrls(car.photos.map((p) => p.storage_path))
      if (n !== seq.current) return
      const m = refMaps()
      cust.forEach((r) => m.cust.set(r.id, r.ref_no))
      car.cars.forEach((r) => m.car.set(r.id, r.asset_id))
      rent.forEach((r) => m.rental.set(r.id, r.ref_no))
      pass.forEach((r) => m.pass.set(r.id, r.ref_no))
      pay.payments.forEach((r) => m.pay.set(r.id, r.ref_no))
      settingsId.current = st?.id ?? null
      photoRows.current = car.photos
      setSettings(mapSettings(st))
      setPerms(mapPerms(st))
      setCars(mapCars(car.cars, car.photos, urls))
      setCustomers(mapCustomers(cust))
      setRentals(mapRentals(rent, m))
      setPasses(mapPasses(pass, m))
      setPayments(mapPayments(pay.payments, pay.lines, pay.txns, m))
      setMaint(mapMaint(mnt, m))
      setRevenue(rev.map((r) => ({ at: ms(r.at)!, rental: Number(r.rental_amount), track: Number(r.track_amount) })))
      setAudit(mapAudit(aud))
      setUsers(mapUsers(usr))
      setLoadError('')
      setLoadState('ready')
    } catch (e) {
      if (n !== seq.current) return
      setLoadError(errMsg(e))
      setLoadState('error')
    }
  }, [profile])

  useEffect(() => {
    if (!authed) {
      seq.current++
      clearIds()
      setCars([]); setRentals([]); setCustomers([]); setPayments([]); setPasses([]); setMaint([]); setAudit([]); setUsers([]); setRevenue([])
      setLoadState('loading')
      return
    }
    setLoadState('loading')
    void load()
  }, [authed, load])

  const retry = useCallback(() => {
    setLoadState('loading')
    void load()
  }, [load])

  // realtime: schedule, dashboard and countdowns follow the database
  useEffect(() => {
    if (!authed) return
    let t: ReturnType<typeof setTimeout> | undefined
    const stop = subscribeChanges(() => {
      clearTimeout(t)
      t = setTimeout(() => void load(), 350)
    })
    const resign = setInterval(() => void load(), 45 * 60000)
    return () => {
      clearTimeout(t)
      clearInterval(resign)
      stop()
    }
  }, [authed, load])

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut()
    } catch (e) {
      toast(errMsg(e), 'err')
    }
    setProfile(null)
    setUserId(null)
    go('/login')
  }, [go, toast])

  const actor = profile?.name ?? ''
  const myCustomerId = customers.find((c) => c.userId === userId)?.id ?? ''

  const rentals = useMemo<Rental[]>(
    () => rentalsBase.map((r) => (r.status === 'Active' && r.end < now ? { ...r, status: 'Overdue' as const } : r)),
    [rentalsBase, now],
  )

  const carStatus = useCallback(
    (c: Car): CarStatus => {
      if (c.base === 'Maintenance' || c.base === 'Damaged' || c.base === 'Inactive') return c.base
      const mine = rentals.filter((r) => r.carId === c.id)
      if (mine.some((r) => r.status === 'Active' || r.status === 'Overdue')) return 'Active Rental'
      if (mine.some((r) => r.status === 'Upcoming' && r.start <= now + 60 * 60000 && r.end > now)) return 'Reserved'
      return c.base
    },
    [rentals, now],
  )

  const conflict = useCallback(
    (carId: string, start: number, end: number, ignoreId?: string) =>
      rentals
        .filter((r) => r.carId === carId && r.id !== ignoreId && ['Upcoming', 'Active', 'Overdue'].includes(r.status))
        .sort((a, b) => a.start - b.start)
        .find((r) => start < r.end && end > r.start),
    [rentals],
  )

  // run a mutation, refresh from the database, report the outcome
  const run = async (fn: () => Promise<unknown>, okMsg?: string, tone: Toast['tone'] = 'ok') => {
    try {
      await fn()
      await load()
      if (okMsg) toast(okMsg, tone)
      return true
    } catch (e) {
      toast(errMsg(e), 'err')
      return false
    }
  }

  const createBooking: Ctx['createBooking'] = async (b) => {
    try {
      const r = await rentalsApi.createBooking({
        customerRef: b.customerId,
        items: b.items.map((i) => ({ carRef: i.carId, start: i.start, end: i.end })),
        track: b.track,
        method: b.method,
        amountPaid: b.amountPaid,
      })
      await load()
      return r
    } catch (e) {
      await load()
      throw e
    }
  }
  const checkOut: Ctx['checkOut'] = (id) => run(() => rentalsApi.checkOut(id), `${id} checked out`)
  const returnRental: Ctx['returnRental'] = (id, r) => {
    const rent = rentals.find((x) => x.id === id)
    return run(() => rentalsApi.returnRental(id, r), `${rent?.carId ?? id} returned. Car is now ${r.outcome}.`)
  }
  const extendRental: Ctx['extendRental'] = async (id, mins) => {
    const r = rentals.find((x) => x.id === id)
    if (!r) return false
    const newEnd = r.end + mins * 60000
    const c = conflict(r.carId, r.start, newEnd, id)
    if (c) {
      toast(`Can't extend: ${r.carId} is booked ${fmtTime(c.start)}–${fmtTime(c.end)}`, 'err')
      return false
    }
    return run(() => rentalsApi.extendRental(id, mins), `Extended ${id} to ${fmtTime(newEnd)}`)
  }
  const cancelRental: Ctx['cancelRental'] = (id) => run(() => rentalsApi.cancelRental(id), `${id} cancelled`, 'info')
  const recordPayment: Ctx['recordPayment'] = (pid, amount, method, note) =>
    run(() => paymentsApi.recordPayment(pid, amount, method, note), `₱${amount.toLocaleString()} recorded on ${pid}`)
  const refundPayment: Ctx['refundPayment'] = (pid, amount, reason) =>
    run(() => paymentsApi.refundPayment(pid, amount, reason), `Refunded ₱${amount.toLocaleString()} on ${pid}`)
  const sellTrack: Ctx['sellTrack'] = async (customerId, method, link) => {
    let id: string | undefined
    const ok = await run(async () => {
      id = (await passesApi.sellTrack(customerId, method, link)).pass_ref
    })
    if (ok) toast(`Track access ${id} sold · ₱${settings.trackPrice}`)
    return ok ? id : undefined
  }
  const trackClock: Ctx['trackClock'] = (id, kind) =>
    run(() => passesApi.trackClock(id, kind), kind === 'in' ? 'Checked in to the track' : 'Checked out of the track')

  const saveCar: Ctx['saveCar'] = (c, isNew) => {
    const prev = cars.find((x) => x.id === c.id)
    return run(
      () =>
        carsApi.saveCar({ ...c, status: isNew || prev?.base !== c.base ? c.base : undefined }, isNew),
      isNew ? `${c.id} added to fleet` : `${c.id} updated`,
    )
  }
  const setCarPhoto: Ctx['setCarPhoto'] = (carId, idx, full, thumb, originalName) => {
    const car = cars.find((c) => c.id === carId)
    const mine = photoRows.current.filter((p) => p.car_id === uid('car', carId))
    const existing = idx === 'add' ? null : (photoRows.current.find((p) => p.id === car?.photoIds?.[idx]) ?? null)
    return run(
      () =>
        photosApi.savePhoto({
          carRef: carId, existing, isPrimary: mine.length === 0, originalName, full, thumb,
          sortOrder: mine.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1,
        }),
      'Photo saved',
    )
  }
  const logMaintenance: Ctx['logMaintenance'] = (m, setStatus) =>
    run(
      () =>
        maintApi.logMaintenance({
          carRef: m.carId, date: m.date, issue: m.issue, repair: m.repair, parts: m.parts, cost: m.cost, notes: m.notes,
          staffId: users.find((u) => u.name === m.staff)?.id, setStatus,
        }),
      'Maintenance record saved',
    )
  const releaseCar: Ctx['releaseCar'] = (carId, note) =>
    run(() => maintApi.releaseCar(carId, note), `${carId} released back to service`)

  const addCustomer: Ctx['addCustomer'] = async (c) => {
    try {
      const row = await customersApi.createCustomer(c)
      await load()
      toast(`Customer ${row.name} created`)
      return { id: row.ref_no, name: row.name, phone: row.phone, email: row.email, notes: row.notes ?? undefined, joined: ms(row.created_at)! }
    } catch (e) {
      toast(errMsg(e), 'err')
      return undefined
    }
  }
  const addUser: Ctx['addUser'] = (u) => run(() => profilesApi.inviteUser({ ...u, role: u.role.toLowerCase() as 'admin' | 'staff' | 'customer' }), `${u.name} invited as ${u.role}`)
  const toggleUser: Ctx['toggleUser'] = (id) => {
    const u = users.find((x) => x.id === id)
    if (!u) return Promise.resolve(false)
    return run(() => profilesApi.setActive(id, !u.active), `${u.name} ${u.active ? 'disabled' : 'enabled'}`, 'info')
  }
  const saveSettings: Ctx['saveSettings'] = (s) =>
    run(
      () =>
        settingsApi.updateSettings(settingsId.current, {
          hourly_rate: s.carRate, track_price: s.trackPrice, min_rental_unit_minutes: s.minUnit, rounding_rule: s.rounding,
          business_name: s.business, branch_name: s.branch, opening_hours: s.hours, return_alert_minutes: s.returnAlertMins,
          max_photo_mb: s.maxPhotoMB,
        }),
      'Settings saved',
    )
  const togglePerm = (r: Role, a: Action) => {
    if (r === 'Admin') return
    const next = { Staff: { ...perms.Staff }, Customer: { ...perms.Customer } }
    next[r][a] = !perms[r][a]
    void run(() => settingsApi.updateSettings(settingsId.current, { permissions: next }))
  }

  const value: Ctx = useMemo(
    () => ({
      configured: isConfigured, authReady, loadState, loadError, retry, role, authed, userId: userId ?? '', myCustomerId, signOut,
      can: (a: Action) => perms[role][a], perms, togglePerm, path, go, now,
      cars, rentals, customers, payments, passes, maint, audit, users, revenue, settings, toasts, toast, dismissToast,
      carStatus, conflict, createBooking, checkOut, returnRental, extendRental, cancelRental, recordPayment,
      refundPayment, sellTrack, trackClock, saveCar, setCarPhoto, logMaintenance, releaseCar, addCustomer,
      addUser, toggleUser, saveSettings,
      customerById: (id: string) => customers.find((c) => c.id === id),
      carById: (id: string) => cars.find((c) => c.id === id),
      actor,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authReady, loadState, loadError, role, authed, userId, myCustomerId, perms, path, now, cars, rentals, customers, payments, passes, maint, audit, users, revenue, settings, toasts, carStatus, conflict, actor, retry, signOut],
  )
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useLiveNow() {
  const { now } = useApp()
  const base = useRef({ app: now, real: Date.now() })
  const [n, setN] = useState(now)
  useEffect(() => {
    base.current = { app: now, real: Date.now() }
    setN(now)
    const i = setInterval(() => setN(base.current.app + Date.now() - base.current.real), 1000)
    return () => clearInterval(i)
  }, [now])
  return n
}

export function paymentTotals(p: Payment) {
  const booked = p.lines.reduce((s, l) => s + l.amount, 0)
  const paid = p.txns.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0)
  const balance = p.status === 'Cancelled' || p.status === 'Refunded' ? 0 : Math.max(0, booked - paid)
  return { booked, paid, balance, refunded: p.refunded }
}

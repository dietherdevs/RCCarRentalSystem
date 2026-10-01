import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Flag, Lock, Plus, Search, UserPlus } from 'lucide-react'
import { Badge, Button, Callout, Card, Field, Input, PageHeader, Photo, StatusBadge, TextField, cx } from '../components/ui'
import { useApp } from '../lib/store'
import {
  billedMinutes, carPrice, fmtDT, fmtDur, fmtTime, maskPhone, peso, toLocalInput, type PayMethod, type Car,
} from '../lib/data'

const STEPS = ['Customer', 'Cars', 'Time', 'Payment', 'Review'] as const
const METHODS: PayMethod[] = ['Cash', 'Card (terminal)', 'Bank transfer']
const roundUp = (t: number, mins = 30) => Math.ceil(t / (mins * 60000)) * mins * 60000

export default function NewRental() {
  const { rentals, customers, cars, carStatus, conflict, settings, now, can, go, createBooking, addCustomer, path, toast } = useApp()
  const q = new URLSearchParams(path.split('?')[1] ?? '')
  const [step, setStep] = useState(q.get('customer') ? 1 : 0)
  const [customerId, setCustomerId] = useState(q.get('customer') ?? '')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [nc, setNc] = useState({ name: '', phone: '', email: '' })
  const [ncErr, setNcErr] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<string[]>(q.get('car') ? [q.get('car')!] : [])
  const [start, setStart] = useState(roundUp(now, 30))
  const [end, setEnd] = useState(roundUp(now, 30) + 2 * 3600000)
  const [track, setTrack] = useState(false)
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [payMode, setPayMode] = useState<'full' | 'part' | 'later'>('full')
  const [partAmt, setPartAmt] = useState(200)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ rentalIds: string[]; paymentId: string; total: number } | null>(null)

  if (!can('rentals.manage'))
    return (
      <Callout tone="amber" title="You do not have permission to create rentals">
        Ask an Admin to enable “Create / check-out / return rentals” for your role.
      </Callout>
    )

  const mins = Math.max(0, (end - start) / 60000)
  const billed = billedMinutes(mins, settings)
  const customer = customers.find((c) => c.id === customerId)
  const maskedOk = can('customers.contact')

  const lines = sel.map((id) => {
    const car = cars.find((c) => c.id === id)!
    return { car, amount: carPrice(mins, car.rate, settings) }
  })
  const rentalTotal = lines.reduce((s, l) => s + l.amount, 0)
  const total = rentalTotal + (track ? settings.trackPrice : 0)
  const paying = payMode === 'full' ? total : payMode === 'part' ? Math.min(partAmt, total) : 0
  const payStatus = paying >= total && total > 0 ? 'Paid' : paying > 0 ? 'Partially Paid' : 'Pending'

  const timeErr = end <= start ? 'End time must be after the start time.' : start < now - 15 * 60000 ? 'Start time is in the past.' : ''
  const conflicts = sel
    .map((id) => ({ id, c: end > start ? conflict(id, start, end) : undefined }))
    .filter((x) => x.c) as { id: string; c: NonNullable<ReturnType<typeof conflict>> }[]

  const carInfo = (car: Car) => {
    const s = carStatus(car)
    const mine = rentals.filter((r) => r.carId === car.id).sort((a, b) => a.start - b.start)
    if (s === 'Maintenance' || s === 'Damaged') return { ok: false, reason: `${s}: not rentable` }
    if (s === 'Inactive') return { ok: false, reason: 'Retired from fleet: not rentable' }
    if (s === 'Active Rental') {
      const r = mine.find((x) => x.status === 'Active' || x.status === 'Overdue')
      return { ok: false, reason: r ? `On rental until ${fmtTime(r.end)}` : 'Currently rented' }
    }
    const next = mine.find((r) => r.status === 'Upcoming' && r.end > now)
    return { ok: true, reason: next ? `Next booking ${fmtTime(next.start)}–${fmtTime(next.end)}` : 'Free all day' }
  }

  const alternatives = (carId: string) =>
    cars.filter((c) => c.id !== carId && !sel.includes(c.id) && ['Available', 'Returned', 'Reserved'].includes(carStatus(c)) && !conflict(c.id, start, end))

  const slotsFor = (carId: string) => {
    const dur = end - start
    const out: { s: number; e: number }[] = []
    const first = conflict(carId, start, end)
    if (first) {
      const e2 = first.start
      const s2 = e2 - dur
      if (s2 >= now - 15 * 60000 && !conflict(carId, s2, e2)) out.push({ s: s2, e: e2 })
    }
    let s = first ? roundUp(first.end, 30) : start
    for (let i = 0; i < 6; i++) {
      const c = conflict(carId, s, s + dur)
      if (!c) {
        out.push({ s, e: s + dur })
        break
      }
      s = roundUp(c.end, 30)
    }
    return out
  }

  const validNc = () => {
    const e: Record<string, string> = {}
    if (nc.name.trim().length < 2) e.name = 'Enter the customer’s full name.'
    if (!/^[0-9 +()-]{7,}$/.test(nc.phone)) e.phone = 'Enter a valid phone number.'
    if (nc.email && !/^\S+@\S+\.\S+$/.test(nc.email)) e.email = 'Email format looks wrong.'
    setNcErr(e)
    return !Object.keys(e).length
  }

  const canNext =
    (step === 0 && !!customerId) ||
    (step === 1 && sel.length > 0) ||
    (step === 2 && !timeErr && conflicts.length === 0) ||
    (step === 3 && (payMode !== 'part' || (partAmt > 0 && partAmt <= total))) ||
    step === 4

  const confirm = async () => {
    setSubmitting(true)
    try {
      setDone(await createBooking({ customerId, items: sel.map((carId) => ({ carId, start, end })), track, method, amountPaid: paying }))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the rental', 'err')
      setStep(2)
    }
    setSubmitting(false)
  }

  if (done)
    return (
      <div className="rise mx-auto max-w-xl py-6 text-center sm:py-12">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#DCF3E6] text-[#0A6240]">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="display text-4xl">Rental confirmed</h1>
        <p className="mt-3 text-sm text-mute">
          {customer?.name} · {done.rentalIds.length} car{done.rentalIds.length > 1 ? 's' : ''} · {fmtDT(start)} → {fmtTime(end)}
        </p>
        <Card className="mt-6 text-left">
          <ul className="divide-y divide-line-2">
            {lines.map((l, i) => (
              <li key={l.car.id} className="flex items-center justify-between py-2.5 text-sm">
                <span><b>{done.rentalIds[i]}</b> · {l.car.id} {l.car.name}</span>
                <span className="num">{fmtTime(start)}–{fmtTime(end)}</span>
              </li>
            ))}
            {track && <li className="flex justify-between py-2.5 text-sm"><span>Track access (separate record)</span><span className="num">{peso(settings.trackPrice)}</span></li>}
            <li className="flex justify-between py-2.5 text-base font-bold"><span>Total · {payStatus}</span><span className="num">{peso(done.total)}</span></li>
          </ul>
        </Card>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={() => go(`/rental/${done.rentalIds[0]}`)}>View rental record</Button>
          <Button onClick={() => go('/rentals/schedule')}>See on schedule</Button>
          <Button variant="ghost" onClick={() => { setDone(null); setStep(0); setCustomerId(''); setSel([]); setTrack(false) }}>New rental</Button>
        </div>
      </div>
    )

  const filtered = customers.filter((c) => (c.name + c.phone + c.id).toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <PageHeader eyebrow="New rental" title={STEPS[step]} sub={step === 2 ? `Rate ${peso(settings.carRate)}/hr · billed in ${settings.minUnit}-min steps, rounded ${settings.rounding}.` : undefined} />

      <ol className="mb-6 flex gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <button disabled={i > step} onClick={() => setStep(i)} className="block w-full text-left">
              <span className={cx('block h-1.5 rounded-full', i <= step ? 'bg-accent' : 'bg-line')} />
              <span className={cx('mt-1.5 hidden text-xs font-semibold sm:block', i === step ? 'text-ink' : 'text-mute')}>{i + 1}. {s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 0 && (
            <div className="rise space-y-4">
              {customer && (
                <Callout tone="green" title={`${customer.name} selected`}>
                  {maskedOk ? customer.phone : maskPhone(customer.phone)}
                </Callout>
              )}
              {!creating ? (
                <>
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                    <Input aria-label="Search customers" placeholder="Search name, phone or ID" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <ul className="overflow-hidden rounded-[6px] border border-line bg-surface">
                    {filtered.length === 0 && (
                      <li className="p-6 text-center text-sm text-mute">No match for “{search}”. Create a new customer below.</li>
                    )}
                    {filtered.slice(0, 8).map((c) => (
                      <li key={c.id} className="border-b border-line-2 last:border-0">
                        <button onClick={() => setCustomerId(c.id)} className={cx('flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-paper', customerId === c.id && 'bg-accent-soft')}>
                          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{c.name.split(' ').map((s) => s[0]).join('')}</span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{c.name}</span>
                            <span className="num block text-xs text-mute">{maskedOk ? c.phone : maskPhone(c.phone)}</span>
                          </span>
                          {customerId === c.id && <Check size={18} className="text-accent" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => setCreating(true)}><UserPlus size={16} /> Create new customer</Button>
                </>
              ) : (
                <Card className="space-y-4">
                  <TextField label="Full name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} error={ncErr.name} autoComplete="off" />
                  <TextField label="Mobile number" inputMode="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} error={ncErr.phone} placeholder="0917 555 0100" />
                  <TextField label="Email (optional)" type="email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} error={ncErr.email} />
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={async () => { if (validNc()) { const c = await addCustomer(nc); if (c) { setCustomerId(c.id); setCreating(false); setNc({ name: '', phone: '', email: '' }) } } }}>Save customer</Button>
                    <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="rise space-y-4">
              <p className="text-sm text-mute">Pick one or more cars. Each car becomes its own rental record. Grey cars cannot be selected.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cars.map((car) => {
                  const info = carInfo(car)
                  const on = sel.includes(car.id)
                  return (
                    <button
                      key={car.id}
                      disabled={!info.ok}
                      aria-pressed={on}
                      onClick={() => setSel(on ? sel.filter((x) => x !== car.id) : [...sel, car.id])}
                      className={cx(
                        'group overflow-hidden rounded-[6px] border bg-surface text-left transition-all',
                        on ? 'border-accent ring-2 ring-accent' : 'border-line hover:border-ink',
                        !info.ok && 'cursor-not-allowed opacity-60 grayscale',
                      )}
                    >
                      <div className="relative">
                        <Photo src={car.photos[0]} alt={`${car.name}, ${car.brand} ${car.model}`} className="h-32 w-full" />
                        <div className="absolute left-2 top-2"><StatusBadge status={carStatus(car)} /></div>
                        {on && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-accent text-white"><Check size={16} /></span>}
                        {!info.ok && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-ink text-white"><Lock size={13} /></span>}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-bold">{car.name}</p>
                        <p className="num text-xs text-mute">{car.id} · {car.category} · {peso(car.rate)}/hr</p>
                        <p className={cx('mt-2 text-xs font-medium', info.ok ? 'text-ink-2' : 'text-[#A1160D]')}>{info.reason}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rise space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date & time" error={timeErr && end > start ? timeErr : undefined}>
                  {(a) => <Input {...a} type="datetime-local" value={toLocalInput(start)} onChange={(e) => e.target.value && setStart(new Date(e.target.value).getTime())} />}
                </Field>
                <Field label="End date & time" error={end <= start ? timeErr : undefined}>
                  {(a) => <Input {...a} type="datetime-local" value={toLocalInput(end)} onChange={(e) => e.target.value && setEnd(new Date(e.target.value).getTime())} />}
                </Field>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold">Quick duration</p>
                <div className="flex flex-wrap gap-2">
                  {[30, 60, 90, 120, 180].map((m) => (
                    <button key={m} onClick={() => setEnd(start + m * 60000)} className={cx('min-h-11 rounded-[4px] border px-4 text-sm font-semibold', mins === m ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-surface hover:border-ink')}>
                      {fmtDur(m * 60000)}
                    </button>
                  ))}
                </div>
              </div>
              <Card className="flex items-center gap-4 !bg-paper">
                <Clock size={22} />
                <div>
                  <p className="eyebrow">Duration</p>
                  <p className="num text-xl font-medium">{fmtDur(mins * 60000)}{billed !== mins && <span className="ml-2 text-sm text-mute">billed as {fmtDur(billed * 60000)}</span>}</p>
                </div>
              </Card>

              {conflicts.map(({ id, c }) => {
                const alts = alternatives(id)
                const slots = slotsFor(id)
                return (
                  <div key={id} className="space-y-3">
                    <Callout tone="red" title={`This car is already booked ${fmtTime(c.start)}–${fmtTime(c.end)}`}>
                      {id} {cars.find((x) => x.id === id)?.name} overlaps rental {c.id}. Choose another time or another car.
                    </Callout>
                    <Card className="space-y-4">
                      <div>
                        <p className="eyebrow mb-2">Suggested time slots for {id}</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.length === 0 && <span className="text-sm text-mute">No nearby free slot today.</span>}
                          {slots.map((s) => (
                            <Button key={s.s} onClick={() => { setStart(s.s); setEnd(s.e) }}>
                              {fmtTime(s.s)} – {fmtTime(s.e)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="eyebrow mb-2">Free cars for {fmtTime(start)}–{fmtTime(end)}</p>
                        <div className="flex flex-wrap gap-2">
                          {alts.length === 0 && <span className="text-sm text-mute">No other cars are free for this window.</span>}
                          {alts.slice(0, 4).map((a) => (
                            <Button key={a.id} onClick={() => setSel(sel.map((x) => (x === id ? a.id : x)))}>
                              Swap to {a.id} {a.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              })}
              {conflicts.length === 0 && !timeErr && sel.length > 0 && (
                <Callout tone="green" title={`${sel.length === 1 ? 'Car is' : 'All cars are'} free for this window`} />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="rise space-y-6">
              <Card>
                <label className="flex min-h-14 cursor-pointer items-center gap-4">
                  <input type="checkbox" className="size-5 accent-[#d63a0b]" checked={track} onChange={(e) => setTrack(e.target.checked)} />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-bold"><Flag size={16} /> Add Track Access · {peso(settings.trackPrice)}</span>
                    <span className="block text-xs text-mute">Unlimited access. Saved as a separate record, not part of car pricing.</span>
                  </span>
                </label>
              </Card>
              <div>
                <p className="mb-2 text-[13px] font-semibold">Payment method</p>
                <div className="flex flex-wrap gap-2">
                  {METHODS.map((m) => (
                    <button key={m} aria-pressed={method === m} onClick={() => setMethod(m)} className={cx('min-h-11 rounded-[4px] border px-4 text-sm font-semibold', method === m ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-surface hover:border-ink')}>
                      {m}
                    </button>
                  ))}
                  {['GCash', 'Maya'].map((m) => (
                    <button key={m} disabled className="min-h-11 rounded-[4px] border border-dashed border-ink/25 px-4 text-sm font-semibold text-mute">
                      {m} <span className="ml-1 text-[10px] uppercase">Coming soon</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold">Amount received now</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([['full', `Paid in full · ${peso(total)}`], ['part', 'Deposit / partial'], ['later', 'Pay later (₱0)']] as const).map(([v, l]) => (
                    <button key={v} aria-pressed={payMode === v} onClick={() => setPayMode(v)} className={cx('min-h-12 rounded-[4px] border px-3 text-sm font-semibold', payMode === v ? 'border-accent bg-accent-soft' : 'border-ink/25 bg-surface hover:border-ink')}>
                      {l}
                    </button>
                  ))}
                </div>
                {payMode === 'part' && (
                  <div className="mt-3 max-w-xs">
                    <Field label="Amount received (₱)" error={partAmt <= 0 || partAmt > total ? `Enter between ₱1 and ${peso(total)}.` : undefined}>
                      {(a) => <Input {...a} type="number" min={1} max={total} value={partAmt} onChange={(e) => setPartAmt(+e.target.value)} />}
                    </Field>
                  </div>
                )}
                <p className="mt-3 flex items-center gap-2 text-sm">Resulting status <StatusBadge status={payStatus} /></p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rise space-y-4">
              <Card className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-mute">Customer</span><b>{customer?.name}</b></div>
                {lines.map((l) => (
                  <div key={l.car.id} className="flex items-center gap-3 border-t border-line-2 pt-3">
                    <Photo src={l.car.photos[0]} alt={l.car.name} className="size-14 shrink-0 rounded-[4px]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{l.car.id} · {l.car.name}</p>
                      <p className="num text-xs text-mute">{fmtDT(start)} → {fmtDT(end)}</p>
                    </div>
                    <span className="num text-sm">{peso(l.amount)}</span>
                  </div>
                ))}
                {track && <div className="flex justify-between border-t border-line-2 pt-3 text-sm"><span>Track access</span><span className="num">{peso(settings.trackPrice)}</span></div>}
              </Card>
              <Callout tone="blue" title={`${peso(paying)} received via ${method} · ${payStatus}`}>
                Balance after confirmation: {peso(total - paying)}
              </Callout>
            </div>
          )}
        </div>

        {/* price summary */}
        <aside className="hidden lg:block">
          <PriceSummary lines={lines} mins={mins} billed={billed} track={track} total={total} paying={paying} rate={settings.carRate} trackPrice={settings.trackPrice} />
        </aside>
      </div>

      <div className="sticky bottom-[72px] z-10 mt-6 rounded-[6px] border border-ink bg-surface p-3 shadow-lg lg:bottom-4">
        <details className="mb-2 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold">
            <span>Price summary</span><span className="num text-lg">{peso(total)}</span>
          </summary>
          <div className="pb-2 pt-1"><PriceSummary compact lines={lines} mins={mins} billed={billed} track={track} total={total} paying={paying} rate={settings.carRate} trackPrice={settings.trackPrice} /></div>
        </details>
        <div className="flex items-center gap-2">
          <Button onClick={() => (step === 0 ? go('/rentals/today') : setStep(step - 1))}><ArrowLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}</Button>
          <div className="num ml-auto hidden text-lg font-medium sm:block lg:hidden">{peso(total)}</div>
          {step < 4 ? (
            <Button variant="primary" className="ml-auto flex-1 sm:ml-2 sm:flex-none sm:px-8" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" className="ml-auto flex-1 sm:ml-2 sm:flex-none sm:px-8" loading={submitting} onClick={confirm}>
              <Check size={16} /> Confirm rental
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function PriceSummary({ lines, mins, billed, track, total, paying, rate, trackPrice, compact }: {
  lines: { car: Car; amount: number }[]; mins: number; billed: number; track: boolean; total: number; paying: number; rate: number; trackPrice: number; compact?: boolean
}) {
  const hrs = billed / 60
  return (
    <Card className={cx(!compact && 'sticky top-20')}>
      {!compact && <p className="eyebrow mb-3">Price summary</p>}
      {lines.length === 0 ? (
        <p className="text-sm text-mute">Select a car to see pricing.</p>
      ) : (
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.car.id} className="text-sm">
              <div className="flex justify-between font-semibold"><span>{l.car.id} rental</span><span className="num">{peso(l.amount)}</span></div>
              <p className="num text-xs text-mute">{mins > 0 ? `${+hrs.toFixed(2)} hr × ${peso(rate)} = ${peso(l.amount)}` : 'Set start and end time'}</p>
            </li>
          ))}
          {track && (
            <li className="text-sm">
              <div className="flex justify-between font-semibold"><span>Track access</span><span className="num">{peso(trackPrice)}</span></div>
              <p className="text-xs text-mute">Separate record · unlimited</p>
            </li>
          )}
        </ul>
      )}
      <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink pt-3">
        <span className="text-sm font-bold uppercase tracking-wide">Total</span>
        <span className="display num text-3xl" style={{ fontFamily: 'var(--font-sans)' }}>{peso(total)}</span>
      </div>
      <div className="mt-2 flex justify-between text-xs text-mute"><span>Received now</span><span className="num">{peso(paying)}</span></div>
      <div className="flex justify-between text-xs text-mute"><span>Balance</span><span className="num">{peso(total - paying)}</span></div>
      {!compact && <Badge className="mt-4" tone="slate"><Plus size={10} /> 2 hrs × ₱200 + ₱300 track = ₱700</Badge>}
    </Card>
  )
}

import { useRef, useState } from 'react'
import { ArrowLeft, Camera, CheckCircle2, ChevronRight, Clock, Flag, Hourglass, LogIn, Plus, Search, X } from 'lucide-react'
import {
  Badge, Button, Callout, Card, Confirm, Countdown, Empty, ErrorState, Field, Input, KV, Modal, PageHeader, Photo, SectionTitle, Select,
  SkeletonRows, StatusBadge, Tabs, TableWrap, Textarea, TextField, cx, td, th, useFakeLoad,
} from '../components/ui'
import { useApp, paymentTotals } from '../lib/store'
import { RecordPaymentModal } from './Payments'
import {
  fmtDT, fmtDur, fmtTime, maskPhone, peso, sameDay, toLocalInput, type Condition, type PayMethod, type Rental, billedMinutes,
} from '../lib/data'

function RentalRow({ r }: { r: Rental }) {
  const { carById, customerById, payments, go, checkOut, can } = useApp()
  const car = carById(r.carId)!
  const pay = payments.find((p) => p.id === r.paymentId)
  return (
    <tr className="hover:bg-paper/60">
      <td className={td}>
        <button onClick={() => go(`/rental/${r.id}`)} className="flex items-center gap-3 text-left">
          <Photo src={car.photos[0]} alt={car.name} className="size-11 shrink-0 rounded-[4px]" />
          <span><b className="block text-sm">{car.name}</b><span className="num text-xs text-mute">{car.id} · {r.id}</span></span>
        </button>
      </td>
      <td className={td}>{customerById(r.customerId)?.name}</td>
      <td className={cx(td, 'num')}>{fmtTime(r.start)}</td>
      <td className={cx(td, 'num')}>{fmtTime(r.end)}</td>
      <td className={td}><StatusBadge status={r.status} /></td>
      <td className={td}>{pay && <StatusBadge status={pay.status} />}</td>
      <td className={cx(td, 'text-right')}>
        {r.status === 'Upcoming' && can('rentals.manage') && <Button size="sm" onClick={() => checkOut(r.id)}><LogIn size={14} /> Check-out</Button>}
        {(r.status === 'Active' || r.status === 'Overdue') && can('rentals.manage') && <Button size="sm" variant="primary" onClick={() => go(`/rental/${r.id}/return`)}>Return</Button>}
        {(r.status === 'Returned' || r.status === 'Cancelled') && <Button size="sm" variant="ghost" onClick={() => go(`/rental/${r.id}`)}>View <ChevronRight size={14} /></Button>}
      </td>
    </tr>
  )
}

export function TodaysRentals() {
  const { rentals, now, go, can } = useApp()
  const [tab, setTab] = useState<'all' | 'Active' | 'Upcoming' | 'Returned'>('all')
  const loading = useFakeLoad('today' + tab, 400)
  const today = rentals.filter((r) => sameDay(r.start, now) && r.status !== 'Cancelled').sort((a, b) => a.start - b.start)
  const n = (s: string) => today.filter((r) => (s === 'Active' ? r.status === 'Active' || r.status === 'Overdue' : r.status === s)).length
  const list = tab === 'all' ? today : today.filter((r) => (tab === 'Active' ? r.status === 'Active' || r.status === 'Overdue' : r.status === tab))
  return (
    <>
      <PageHeader eyebrow="Rentals" title="Today's rentals">
        <Button variant="primary" disabled={!can('rentals.manage')} onClick={() => go('/rentals/new')}><Plus size={16} /> New rental</Button>
      </PageHeader>
      <Tabs value={tab} onChange={setTab} tabs={[{ v: 'all', l: 'All', n: today.length }, { v: 'Active', l: 'Active', n: n('Active') }, { v: 'Upcoming', l: 'Upcoming', n: n('Upcoming') }, { v: 'Returned', l: 'Returned', n: n('Returned') }]} />
      {loading ? (
        <Card pad={false}><SkeletonRows rows={6} cols={5} /></Card>
      ) : list.length === 0 ? (
        <Card><Empty title={`No ${tab === 'all' ? '' : tab.toLowerCase() + ' '}rentals today`} body="When a rental starts today it will appear here with its car, customer and times." action={<Button variant="primary" onClick={() => go('/rentals/new')}>Create rental</Button>} /></Card>
      ) : (
        <>
          <div className="hidden md:block">
            <TableWrap>
              <thead><tr>{['Car', 'Customer', 'Start', 'End', 'Status', 'Payment', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{list.map((r) => <RentalRow key={r.id} r={r} />)}</tbody>
            </TableWrap>
          </div>
          <ul className="space-y-3 md:hidden">{list.map((r) => <RentalCard key={r.id} r={r} />)}</ul>
        </>
      )}
    </>
  )
}

function RentalCard({ r }: { r: Rental }) {
  const { carById, customerById, payments, go, checkOut, can } = useApp()
  const car = carById(r.carId)!
  const pay = payments.find((p) => p.id === r.paymentId)
  return (
    <li className="rounded-[6px] border border-line bg-surface p-4">
      <button onClick={() => go(`/rental/${r.id}`)} className="flex w-full items-start gap-3 text-left">
        <Photo src={car.photos[0]} alt={car.name} className="size-14 shrink-0 rounded-[4px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{car.name} <span className="num text-xs font-normal text-mute">{car.id}</span></p>
          <p className="truncate text-sm">{customerById(r.customerId)?.name}</p>
          <p className="num mt-1 text-xs text-mute">{fmtTime(r.start)} → {fmtTime(r.end)} · {fmtDur(r.end - r.start)}</p>
        </div>
        <StatusBadge status={r.status} />
      </button>
      <div className="mt-3 flex items-center gap-2">
        {pay && <StatusBadge status={pay.status} />}
        <div className="ml-auto flex gap-2">
          {r.status === 'Upcoming' && can('rentals.manage') && <Button size="sm" onClick={() => checkOut(r.id)}>Check-out</Button>}
          {(r.status === 'Active' || r.status === 'Overdue') && can('rentals.manage') && <Button size="sm" variant="primary" onClick={() => go(`/rental/${r.id}/return`)}>Return</Button>}
        </div>
      </div>
    </li>
  )
}

export function RentalHistory() {
  const { rentals, customerById, carById, go, loadError, retry } = useApp()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('all')
  const loading = useFakeLoad('hist')
  const list = rentals
    .filter((r) => (st === 'all' || r.status === st) && (customerById(r.customerId)?.name + r.id + r.carId + carById(r.carId)?.name).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.start - a.start)
  return (
    <>
      <PageHeader eyebrow="Rentals" title="Rental history" />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <Input aria-label="Search rentals" placeholder="Search customer, car or rental ID" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="Filter by status" value={st} onChange={(e) => setSt(e.target.value)} className="!w-auto">
          <option value="all">All statuses</option>
          {['Upcoming', 'Active', 'Returned', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>
      {loadError ? (
        <Card><ErrorState title="Could not load rental history" body={loadError} onRetry={retry} /></Card>
      ) : loading ? (
        <Card pad={false}><SkeletonRows rows={7} cols={6} /></Card>
      ) : list.length === 0 ? (
        <Card><Empty title="No rentals match" body="Try a different name, car or status filter." action={<Button onClick={() => { setQ(''); setSt('all') }}>Clear filters</Button>} /></Card>
      ) : (
        <TableWrap>
          <thead><tr>{['Rental', 'Customer', 'Car', 'Start', 'End', 'Duration', 'Amount', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} onClick={() => go(`/rental/${r.id}`)} className="cursor-pointer hover:bg-paper/60">
                <td className={cx(td, 'num font-medium')}>{r.id}</td>
                <td className={td}>{customerById(r.customerId)?.name}</td>
                <td className={td}><span className="num text-xs">{r.carId}</span> {carById(r.carId)?.name}</td>
                <td className={cx(td, 'num whitespace-nowrap')}>{fmtDT(r.start)}</td>
                <td className={cx(td, 'num whitespace-nowrap')}>{fmtTime(r.end)}</td>
                <td className={cx(td, 'num')}>{fmtDur(r.end - r.start)}</td>
                <td className={cx(td, 'num')}>{peso(r.amount)}</td>
                <td className={td}><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  )
}

export function RentalDetail({ id }: { id: string }) {
  const { rentals, carById, customerById, payments, audit, go, checkOut, extendRental, cancelRental, can, role, settings } = useApp()
  const [modal, setModal] = useState<null | 'pay' | 'extend' | 'cancel'>(null)
  const loading = useFakeLoad('rd' + id, 350)
  const r = rentals.find((x) => x.id === id)
  if (!r)
    return <Card><Empty title="Rental not found" body={`No rental with ID ${id}.`} action={<Button onClick={() => go('/rentals/today')}>Back to rentals</Button>} /></Card>
  const car = carById(r.carId)!
  const cust = customerById(r.customerId)!
  const pay = payments.find((p) => p.id === r.paymentId)
  const tot = pay ? paymentTotals(pay) : { booked: r.amount, paid: 0, balance: r.amount }
  const live = r.status === 'Active' || r.status === 'Overdue'
  const trail = audit.filter((a) => a.entity === r.id || a.entity === r.paymentId)
  const mins = (r.end - r.start) / 60000
  const rentalLine = pay?.lines.find((l) => l.ref === r.id)
  const trackLines = pay?.lines.filter((l) => l.kind === 'track') ?? []
  const otherLines = pay?.lines.filter((l) => l.kind === 'rental' && l.ref !== r.id) ?? []
  const canManage = can('rentals.manage')
  const phone = can('customers.contact') ? cust.phone : maskPhone(cust.phone)

  if (loading) return <Card pad={false}><SkeletonRows rows={8} cols={3} /></Card>
  return (
    <>
      <button onClick={() => go('/rentals/today')} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Rentals</button>
      <PageHeader eyebrow={`Rental · ${r.id}`} title={`${car.name} → ${cust.name}`}>
        <StatusBadge status={r.status} />
        {r.status === 'Upcoming' && canManage && <Button onClick={() => checkOut(r.id)}><LogIn size={16} /> Check-out</Button>}
        {live && canManage && <Button variant="primary" onClick={() => go(`/rental/${r.id}/return`)}>Return car</Button>}
        {(live || r.status === 'Upcoming') && canManage && <Button onClick={() => setModal('extend')}><Hourglass size={16} /> Extend</Button>}
        {tot.balance > 0 && can('payments.record') && r.status !== 'Cancelled' && <Button onClick={() => setModal('pay')}>Record payment</Button>}
        {(r.status === 'Upcoming') && canManage && <Button variant="danger" onClick={() => setModal('cancel')}>Cancel</Button>}
      </PageHeader>

      {r.status === 'Overdue' && <div className="mb-4"><Callout tone="red" title="This rental is past its expected return time" /></div>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <button onClick={() => go(`/car/${car.id}`)}><Photo src={car.photos[0]} alt={`${car.name} photo`} className="aspect-[4/3] w-full rounded-[4px]" /></button>
              <div>
                <p className="eyebrow">Car · asset {car.id}</p>
                <button onClick={() => go(`/car/${car.id}`)} className="display mt-1 text-2xl underline-offset-4 hover:underline">{car.name}</button>
                <p className="text-sm text-mute">{car.brand} {car.model} · {car.category}</p>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Meta k="Start" v={fmtDT(r.start)} />
                  <Meta k="Expected end" v={fmtDT(r.end)} />
                  <Meta k="Actual out" v={r.actualOut ? fmtTime(r.actualOut) : '—'} />
                  <Meta k="Actual return" v={r.actualReturn ? fmtTime(r.actualReturn) : '—'} />
                  <Meta k="Scheduled duration" v={fmtDur(r.end - r.start)} />
                  {r.actualReturn && r.actualOut ? <Meta k="Actual duration" v={fmtDur(r.actualReturn - r.actualOut)} /> : live ? <Meta k="Time remaining" v={<Countdown end={r.end} />} /> : <Meta k="Time remaining" v="—" />}
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line-2 pt-4 text-sm">
              <div>
                <p className="eyebrow">Customer</p>
                <button onClick={() => go(`/customer/${cust.id}`)} className="font-semibold underline-offset-4 hover:underline">{cust.name}</button>
                <span className="num ml-2 text-xs text-mute">{phone}</span>
              </div>
              {r.condition && <div className="text-right"><p className="eyebrow">Condition on return</p><Badge tone={r.condition === 'Good' ? 'green' : r.condition === 'Damaged' ? 'red' : 'amber'}>{r.condition}</Badge></div>}
            </div>
            {r.damageNotes && (
              <div className="mt-4"><Callout tone={r.condition === 'Damaged' ? 'red' : 'amber'} title="Damage notes">{r.damageNotes}{r.returnPhotos ? ` · ${r.returnPhotos} photo(s) attached` : ''}</Callout></div>
            )}
          </Card>

          <Card>
            <SectionTitle>Status history</SectionTitle>
            <ol className="relative ml-2 border-l border-line">
              {r.history.map((h, i) => (
                <li key={i} className="relative pb-4 pl-5 last:pb-0">
                  <span className={cx('absolute -left-[5px] top-1.5 size-2.5 rounded-full', i === r.history.length - 1 ? 'bg-accent' : 'bg-ink/40')} />
                  <p className="text-sm font-medium">{h.text}</p>
                  <p className="num text-xs text-mute">{fmtDT(h.at)} · {h.by}</p>
                </li>
              ))}
            </ol>
          </Card>

          {role === 'Admin' || can('audit.view') ? (
            <Card>
              <SectionTitle>Audit trail</SectionTitle>
              {trail.length === 0 ? <p className="text-sm text-mute">No audited changes yet for this record.</p> : (
                <ul className="divide-y divide-line-2">
                  {trail.map((a) => (
                    <li key={a.id} className="py-2.5 text-sm"><b>{a.action}</b> <span className="text-mute">by {a.user} · {fmtDT(a.at)}</span><p className="num text-xs text-mute">{a.before} → {a.after}</p></li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle>Price breakdown</SectionTitle>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between font-semibold"><span>{car.id} rental</span><span className="num">{peso(rentalLine?.amount ?? r.amount)}</span></div>
                <p className="num text-xs text-mute">{+(billedMinutes(mins, settings) / 60).toFixed(2)} hr × {peso(car.rate)}</p>
              </div>
              {otherLines.map((l) => <div key={l.ref} className="flex justify-between"><span>{l.label} <span className="num text-xs text-mute">{l.ref}</span></span><span className="num">{peso(l.amount)}</span></div>)}
              {trackLines.map((l) => (
                <div key={l.ref}>
                  <div className="flex justify-between font-semibold"><span className="flex items-center gap-1.5"><Flag size={13} /> Track access</span><span className="num">{peso(l.amount)}</span></div>
                  <p className="text-xs text-mute">Separate record {l.ref} · same payment</p>
                </div>
              ))}
            </div>
            <dl className="mt-4 divide-y divide-line-2 border-t-2 border-ink">
              <KV k="Booked" v={<span className="num">{peso(tot.booked)}</span>} />
              <KV k="Paid" v={<span className="num">{peso(tot.paid)}</span>} />
              <KV k="Balance" v={<span className={cx('num font-bold', tot.balance > 0 && 'text-accent')}>{peso(tot.balance)}</span>} />
            </dl>
          </Card>
          <Card>
            <SectionTitle right={pay && <StatusBadge status={pay.status} />}>Payments · {r.paymentId}</SectionTitle>
            {!pay || pay.txns.length === 0 ? <p className="text-sm text-mute">No payment received yet.</p> : (
              <ul className="divide-y divide-line-2">
                {pay.txns.map((t, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{t.method}<span className="num block text-xs text-mute">{fmtDT(t.at)} · {t.by}</span></span>
                    <span className={cx('num font-semibold', t.amount < 0 && 'text-[#A1160D]')}>{t.amount < 0 ? '−' : ''}{peso(Math.abs(t.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
            {tot.balance > 0 && can('payments.record') && <Button className="mt-3 w-full" onClick={() => setModal('pay')}>Record payment</Button>}
          </Card>
        </div>
      </div>

      {modal === 'pay' && pay && <RecordPaymentModal payment={pay} onClose={() => setModal(null)} />}
      {modal === 'extend' && <ExtendModal r={r} onClose={() => setModal(null)} onExtend={(m) => extendRental(r.id, m)} />}
      {modal === 'cancel' && <Confirm danger title="Cancel this rental?" confirmLabel="Cancel rental" body={`${r.id} for ${cust.name} will be cancelled and ${r.carId} freed for ${fmtTime(r.start)}–${fmtTime(r.end)}. ${tot.paid > 0 ? 'A payment has been received, so process a refund afterwards.' : ''}`} onConfirm={() => cancelRental(r.id)} onClose={() => setModal(null)} />}
    </>
  )
}
const Meta = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div><p className="eyebrow">{k}</p><p className="num mt-0.5 text-sm font-medium">{v}</p></div>
)

function ExtendModal({ r, onClose, onExtend }: { r: Rental; onClose: () => void; onExtend: (m: number) => Promise<boolean> }) {
  const { settings, carById } = useApp()
  const [m, setM] = useState(30)
  const car = carById(r.carId)!
  const extra = Math.round((m / 60) * car.rate)
  return (
    <Modal title="Extend rental" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={async () => { if (await onExtend(m)) onClose() }}>Extend by {fmtDur(m * 60000)}</Button></>}>
      <p className="mb-4 text-sm text-mute">Current end {fmtTime(r.end)} → new end <b className="text-ink">{fmtTime(r.end + m * 60000)}</b>. If another booking overlaps, the extension is blocked.</p>
      <div className="flex flex-wrap gap-2">
        {[30, 60, 90, 120].filter((x) => x >= settings.minUnit).map((x) => (
          <button key={x} aria-pressed={m === x} onClick={() => setM(x)} className={cx('min-h-11 rounded-[4px] border px-4 text-sm font-semibold', m === x ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-surface')}>+{fmtDur(x * 60000)}</button>
        ))}
      </div>
      <p className="num mt-4 text-sm">Added charge: <b>{peso(extra)}</b></p>
    </Modal>
  )
}

export function ReturnFlow({ id }: { id: string }) {
  const { rentals, carById, customerById, payments, now, returnRental, go, can } = useApp()
  const r = rentals.find((x) => x.id === id)
  const [when, setWhen] = useState(now)
  const [cond, setCond] = useState<Condition>('Good')
  const [outcome, setOutcome] = useState<'Available' | 'Maintenance' | 'Damaged'>('Available')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<{ name: string; url: string }[]>([])
  const [fileErr, setFileErr] = useState('')
  const [collect, setCollect] = useState(true)
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  if (!r) return <Card><Empty title="Rental not found" body="That rental does not exist." /></Card>
  if (!can('rentals.manage')) return <Callout tone="amber" title="No permission to process returns" />
  const car = carById(r.carId)!
  const pay = payments.find((p) => p.id === r.paymentId)
  const tot = pay ? paymentTotals(pay) : { balance: 0, booked: 0, paid: 0 }
  const late = when - r.end
  const notesErr = submitted && cond === 'Damaged' && notes.trim().length < 5 ? 'Describe the damage so the workshop knows what to fix.' : ''

  const pickCond = (c: Condition) => {
    setCond(c)
    setOutcome(c === 'Damaged' ? 'Damaged' : 'Available')
  }
  const addFiles = (list: FileList | null) => {
    setFileErr('')
    Array.from(list ?? []).forEach((f) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setFileErr(`“${f.name}” is not allowed. Use JPG, PNG or WebP.`)
      if (f.size > 5 * 1024 * 1024) return setFileErr(`“${f.name}” is over 5 MB.`)
      setFiles((x) => [...x, { name: f.name, url: URL.createObjectURL(f) }])
    })
  }
  const submit = () => {
    setSubmitted(true)
    if (cond === 'Damaged' && notes.trim().length < 5) return
    setBusy(true)
    setTimeout(() => {
      returnRental(id, { actualReturn: when, condition: cond, notes, photos: files.length, outcome, payAmount: collect ? tot.balance : 0, method })
      setBusy(false)
      setDone(true)
    }, 700)
  }

  if (done)
    return (
      <div className="rise mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#DCF3E6] text-[#0A6240]"><CheckCircle2 size={34} /></div>
        <h1 className="display text-4xl">Car returned</h1>
        <p className="mt-3 text-sm text-mute">{car.id} {car.name} returned at {fmtTime(when)} in <b>{cond}</b> condition. Status is now <StatusBadge status={outcome} />.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="primary" onClick={() => go(`/rental/${id}`)}>View rental record</Button>
          <Button onClick={() => go('/rentals/today')}>Back to today</Button>
        </div>
      </div>
    )

  return (
    <>
      <button onClick={() => go(`/rental/${id}`)} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> {id}</button>
      <PageHeader eyebrow="Checkout & return" title={`Return ${car.name}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <Field label="Actual return time" hint={late > 60000 ? `${fmtDur(late)} after the expected end (${fmtTime(r.end)}). Use Extend to bill overtime.` : `Expected end ${fmtTime(r.end)}`}>
              {(a) => <Input {...a} type="datetime-local" value={toLocalInput(when)} onChange={(e) => e.target.value && setWhen(new Date(e.target.value).getTime())} />}
            </Field>
          </Card>
          <Card>
            <p className="mb-3 text-[13px] font-semibold">Car condition</p>
            <div role="radiogroup" aria-label="Car condition" className="grid gap-2 sm:grid-cols-3">
              {(['Good', 'Minor wear', 'Damaged'] as Condition[]).map((c) => (
                <button key={c} role="radio" aria-checked={cond === c} onClick={() => pickCond(c)} className={cx('min-h-14 rounded-[4px] border px-3 text-left text-sm font-semibold', cond === c ? 'border-accent bg-accent-soft ring-1 ring-accent' : 'border-ink/25 bg-surface hover:border-ink')}>
                  {c}
                  <span className="block text-xs font-normal text-mute">{c === 'Good' ? 'Ready for the next renter' : c === 'Minor wear' ? 'Cosmetic only, still safe' : 'Needs repair before use'}</span>
                </button>
              ))}
            </div>
            <div className="mt-4"><Field label={`Damage / condition notes${cond === 'Damaged' ? ' (required)' : ''}`} error={notesErr}>{(a) => <Textarea {...a} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Left rear shock bent, body crack near bumper" />}</Field></div>
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-semibold">Photos</p>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative"><img src={f.url} alt={f.name} className="size-20 rounded-[4px] object-cover" /><button aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-ink text-white"><X size={13} /></button></div>
                ))}
                <button onClick={() => inp.current?.click()} className="flex size-20 flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-ink/40 text-xs font-semibold text-ink-2 hover:border-ink"><Camera size={18} />Add</button>
                <input ref={inp} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden onChange={(e) => addFiles(e.target.files)} />
              </div>
              {fileErr && <p role="alert" className="mt-2 text-xs font-medium text-[#B42318]">{fileErr}</p>}
              <p className="mt-2 text-xs text-mute">JPG, PNG or WebP · up to 5 MB each</p>
            </div>
          </Card>
          <Card>
            <Field label="After return, set car status to" hint={outcome === 'Available' ? 'Car goes back to Available.' : `${outcome} cars are not rentable. A maintenance record is created automatically.`}>
              {(a) => <Select {...a} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}><option>Available</option><option>Maintenance</option><option>Damaged</option></Select>}
            </Field>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <SectionTitle>Final payment</SectionTitle>
            <dl className="divide-y divide-line-2 text-sm"><KV k="Booked" v={<span className="num">{peso(tot.booked)}</span>} /><KV k="Paid" v={<span className="num">{peso(tot.paid)}</span>} /><KV k="Balance" v={<span className="num font-bold">{peso(tot.balance)}</span>} /></dl>
            {tot.balance > 0 ? (
              <div className="mt-3 space-y-3">
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-[#d63a0b]" checked={collect} onChange={(e) => setCollect(e.target.checked)} />Collect {peso(tot.balance)} now</label>
                {collect && <Select aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}><option>Cash</option><option>Card (terminal)</option><option>Bank transfer</option></Select>}
                <p className="text-xs text-mute">Resulting status: {collect ? 'Paid' : pay?.status}</p>
              </div>
            ) : <p className="mt-3 text-sm text-[#0A6240]">Fully paid. Nothing to collect.</p>}
          </Card>
          <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={submit}>Confirm return</Button>
          <p className="text-center text-xs text-mute">{customerById(r.customerId)?.name} · {fmtDT(r.start)}</p>
        </div>
      </div>
    </>
  )
}

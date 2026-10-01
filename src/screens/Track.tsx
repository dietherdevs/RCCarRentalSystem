import { useState } from 'react'
import { Flag, Info, LogIn, LogOut, Plus, Ticket } from 'lucide-react'
import { Badge, Button, Callout, Card, Empty, Field, Modal, PageHeader, Select, SkeletonRows, Stat, StatusBadge, TableWrap, Tabs, cx, td, th, useFakeLoad } from '../components/ui'
import { MethodPicker } from './Payments'
import { useApp, paymentTotals } from '../lib/store'
import { fmtDate, fmtTime, peso, sameDay, startOfDay, type PayMethod, type TrackPass } from '../lib/data'

function SellModal({ onClose }: { onClose: () => void }) {
  const { customers, payments, rentals, settings, sellTrack, can, go } = useApp()
  const [cid, setCid] = useState('')
  const [link, setLink] = useState('')
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [tried, setTried] = useState(false)
  const links = payments.filter((p) => p.customerId === cid && p.status !== 'Cancelled' && p.status !== 'Refunded' && p.lines.some((l) => l.kind === 'rental') && !p.lines.some((l) => l.kind === 'track'))
  void rentals
  return (
    <Modal title={`Sell track access · ${peso(settings.trackPrice)}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!can('rentals.manage')} onClick={() => { setTried(true); if (!cid) return; sellTrack(cid, method, link || undefined); onClose(); go('/track/today') }}>Sell · {peso(settings.trackPrice)}</Button></>}>
      <div className="space-y-4">
        <Callout tone="teal" title="Separate product">Track access is its own record and price (unlimited). It is never part of the car hourly rate.</Callout>
        <Field label="Customer" error={tried && !cid ? 'Select a customer.' : undefined}>
          {(a) => <Select {...a} value={cid} onChange={(e) => { setCid(e.target.value); setLink('') }}><option value="">Select customer…</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.id}</option>)}</Select>}
        </Field>
        {cid && (
          <Field label="Bill together with a rental payment" hint="Keeps one receipt for the customer. The track pass stays a separate record.">
            {(a) => <Select {...a} value={link} onChange={(e) => setLink(e.target.value)}><option value="">No, new payment</option>{links.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.lines.map((l) => l.ref).join(', ')}</option>)}</Select>}
          </Field>
        )}
        {!link && <div><p className="mb-2 text-[13px] font-semibold">Payment method</p><MethodPicker value={method} onChange={setMethod} /></div>}
      </div>
    </Modal>
  )
}

function PassRow({ t, history }: { t: TrackPass; history?: boolean }) {
  const { customerById, payments, trackClock, can, go } = useApp()
  const c = customerById(t.customerId)
  const p = payments.find((x) => x.id === t.paymentId)
  const tot = p && paymentTotals(p)
  const state = t.checkOut ? 'Done' : t.checkIn ? 'On track' : 'Not arrived'
  return (
    <tr>
      <td className={cx(td, 'num font-medium')}>{t.id}</td>
      <td className={td}><button className="font-medium hover:underline" onClick={() => go(`/customer/${t.customerId}`)}>{c?.name}</button></td>
      {history && <td className={cx(td, 'num')}>{fmtDate(t.date)}</td>}
      <td className={cx(td, 'num')}>{peso(t.price)}</td>
      <td className={cx(td, 'num')}>{t.checkIn ? fmtTime(t.checkIn) : '—'}</td>
      <td className={cx(td, 'num')}>{t.checkOut ? fmtTime(t.checkOut) : '—'}</td>
      <td className={td}><Badge tone={state === 'On track' ? 'teal' : state === 'Done' ? 'slate' : 'amber'} dot>{state}</Badge></td>
      <td className={td}>{p && <button className="num text-xs underline" onClick={() => go('/payments')}>{p.id}</button>} {p && <StatusBadge status={p.status} />}{tot && tot.balance > 0 && <span className="num ml-1 text-xs text-accent">{peso(tot.balance)} due</span>}</td>
      {!history && (
        <td className={cx(td, 'whitespace-nowrap text-right')}>
          {!t.checkIn && <Button size="sm" disabled={!can('rentals.manage')} onClick={() => trackClock(t.id, 'in')}><LogIn size={14} /> Check in</Button>}
          {t.checkIn && !t.checkOut && <Button size="sm" disabled={!can('rentals.manage')} onClick={() => trackClock(t.id, 'out')}><LogOut size={14} /> Check out</Button>}
        </td>
      )}
    </tr>
  )
}

export function TrackToday() {
  const { passes, now, settings, can, customerById, trackClock, go } = useApp()
  const [sell, setSell] = useState(false)
  const loading = useFakeLoad('track', 450)
  const list = passes.filter((p) => sameDay(p.date, now))
  const on = list.filter((p) => p.checkIn && !p.checkOut).length
  return (
    <>
      <PageHeader eyebrow="Track" title="Today’s access" sub={`Unlimited track access at ${peso(settings.trackPrice)} per customer per day.`}>
        {can('rentals.manage') && <Button variant="primary" size="lg" onClick={() => setSell(true)}><Ticket size={17} /> Sell Track Access {peso(settings.trackPrice)}</Button>}
      </PageHeader>
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Passes sold" value={list.length} />
        <Stat label="On track now" value={on} tone="teal" />
        <Stat label="Revenue" value={peso(list.reduce((s, p) => s + p.price, 0))} />
      </div>
      <div className="mb-5 flex items-start gap-2 rounded-[4px] border border-line bg-surface p-3 text-xs text-ink-2"><Info size={14} className="mt-0.5 shrink-0" /> Check-in and check-out times are for operations (headcount, safety) only. They are not used for pricing.</div>
      {loading ? <Card pad={false}><SkeletonRows rows={5} cols={6} /></Card> : list.length === 0 ? (
        <Card><Empty icon={<Flag size={22} />} title="No track passes today" body="Sell the first one with the button above." action={can('rentals.manage') ? <Button variant="primary" onClick={() => setSell(true)}><Plus size={15} /> Sell track access</Button> : undefined} /></Card>
      ) : (
        <>
          <div className="hidden md:block">
            <TableWrap>
              <thead><tr>{['Pass', 'Customer', 'Price', 'In', 'Out', 'State', 'Payment', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{list.map((t) => <PassRow key={t.id} t={t} />)}</tbody>
            </TableWrap>
          </div>
          <ul className="space-y-3 md:hidden">
            {list.map((t) => (
              <li key={t.id} className="rounded-[6px] border border-line bg-surface p-4">
                <div className="flex justify-between"><button className="font-semibold" onClick={() => go(`/customer/${t.customerId}`)}>{customerById(t.customerId)?.name}</button><span className="num text-sm">{peso(t.price)}</span></div>
                <p className="num mt-1 text-xs text-mute">{t.id} · In {t.checkIn ? fmtTime(t.checkIn) : '—'} · Out {t.checkOut ? fmtTime(t.checkOut) : '—'}</p>
                <div className="mt-3">
                  {!t.checkIn && <Button className="w-full" onClick={() => trackClock(t.id, 'in')}><LogIn size={14} /> Check in</Button>}
                  {t.checkIn && !t.checkOut && <Button className="w-full" onClick={() => trackClock(t.id, 'out')}><LogOut size={14} /> Check out</Button>}
                  {t.checkOut && <Badge>Done</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {sell && <SellModal onClose={() => setSell(false)} />}
    </>
  )
}

export function TrackHistory() {
  const { passes, now } = useApp()
  const [range, setRange] = useState<'7' | '30' | 'all'>('30')
  const loading = useFakeLoad('trackh' + range, 400)
  const from = range === 'all' ? 0 : startOfDay(now) - (+range - 1) * 86400000
  const list = passes.filter((p) => p.date >= from).sort((a, b) => b.date - a.date)
  return (
    <>
      <PageHeader eyebrow="Track" title="Access history" sub="Every track pass sold, separate from car rentals." />
      <Tabs value={range} onChange={setRange} tabs={[{ v: '7', l: 'Last 7 days' }, { v: '30', l: 'Last 30 days' }, { v: 'all', l: 'All time' }]} />
      {loading ? <Card pad={false}><SkeletonRows rows={6} cols={6} /></Card> : list.length === 0 ? <Card><Empty title="No passes in this range" body="Try a longer range." /></Card> : (
        <TableWrap>
          <thead><tr>{['Pass', 'Customer', 'Date', 'Price', 'In', 'Out', 'State', 'Payment'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{list.map((t) => <PassRow key={t.id} t={t} history />)}</tbody>
        </TableWrap>
      )}
    </>
  )
}

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Badge, Button, Callout, Card, Countdown, Empty, Field, Input, KV, Modal, PageHeader, Photo, SectionTitle, SkeletonCards, StatusBadge, Tabs, cx, useFakeLoad } from '../components/ui'
import { useApp, paymentTotals } from '../lib/store'
import { carPrice, fmtDT, fmtTime, peso, toLocalInput } from '../lib/data'

function BookModal({ carId, onClose }: { carId: string; onClose: () => void }) {
  const { carById, settings, conflict, createBooking, now, go, myCustomerId, toast } = useApp()
  const car = carById(carId)!
  const [start, setStart] = useState(Math.ceil((now + 3600000) / 900000) * 900000)
  const [hrs, setHrs] = useState(1)
  const [track, setTrack] = useState(true)
  const end = start + hrs * 3600000
  const clash = conflict(carId, start, end)
  const price = carPrice(hrs * 60, car.rate, settings)
  return (
    <Modal title={`Request ${car.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!clash || start < now || !myCustomerId} onClick={async () => { try { await createBooking({ customerId: myCustomerId, items: [{ carId, start, end }], track, method: 'Cash', amountPaid: 0 }); onClose(); go('/portal/bookings') } catch (e) { toast(e instanceof Error ? e.message : 'Could not book', 'err') } }}>Request · {peso(price + (track ? settings.trackPrice : 0))}</Button></>}>
      <div className="space-y-4">
        <Field label="Start time">{(a) => <Input {...a} type="datetime-local" value={toLocalInput(start)} onChange={(e) => e.target.value && setStart(new Date(e.target.value).getTime())} />}</Field>
        <Field label="Hours">{(a) => <Input {...a} type="number" min={1} max={8} value={hrs} onChange={(e) => setHrs(Math.max(1, Math.min(8, +e.target.value || 1)))} />}</Field>
        <p className="num text-sm">{fmtDT(start)} → {fmtTime(end)}</p>
        {clash && <Callout tone="red" title={`This car is already booked ${fmtTime(clash.start)}–${fmtTime(clash.end)}`}>Pick another time or another car.</Callout>}
        {start < now && <Callout tone="amber" title="Start time is in the past" />}
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-[#d63a0b]" checked={track} onChange={(e) => setTrack(e.target.checked)} />Add track access ({peso(settings.trackPrice)}, unlimited)</label>
        <div className="num rounded-[4px] bg-paper p-3 text-sm"><div className="flex justify-between"><span>{hrs} hr × {peso(car.rate)}</span><b>{peso(price)}</b></div>{track && <div className="flex justify-between"><span>Track access</span><b>{peso(settings.trackPrice)}</b></div>}<div className="mt-1 flex justify-between border-t border-line pt-1"><span>Total, pay at the counter</span><b>{peso(price + (track ? settings.trackPrice : 0))}</b></div></div>
      </div>
    </Modal>
  )
}

export default function Portal({ sub }: { sub?: string }) {
  const { cars, carStatus, rentals, payments, passes, carById, go, customerById, myCustomerId: ME } = useApp()
  const [book, setBook] = useState<string | null>(null)
  const tab = sub || 'home'
  const loading = useFakeLoad('portal' + tab, 400)
  const me = customerById(ME)
  const mine = rentals.filter((r) => r.customerId === ME).sort((a, b) => b.start - a.start)
  const current = mine.filter((r) => ['Active', 'Overdue', 'Upcoming'].includes(r.status))
  const past = mine.filter((r) => ['Returned', 'Cancelled'].includes(r.status))
  const pays = payments.filter((p) => p.customerId === ME).sort((a, b) => b.created - a.created)
  const avail = cars.filter((c) => ['Available', 'Returned', 'Reserved'].includes(carStatus(c)))
  const TABS = [{ v: 'home', l: 'Browse cars' }, { v: 'bookings', l: 'My bookings', n: current.length }, { v: 'payments', l: 'Payments' }, { v: 'history', l: 'History' }]
  return (
    <>
      <PageHeader eyebrow="Customer portal" title={me ? `Hi, ${me.name.split(' ')[0]}` : 'Welcome'} sub="Browse cars, request a time slot and track your rentals. The track will confirm your request at the counter." />
      <Tabs value={tab} onChange={(v) => go(v === 'home' ? '/portal' : `/portal/${v}`)} tabs={TABS} />
      {loading ? <SkeletonCards n={3} /> : tab === 'home' || tab === 'book' ? (
        avail.length === 0 ? <Card><Empty title="No cars available right now" body="Check back soon." /></Card> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {avail.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-[6px] border border-line bg-surface">
                <Photo src={c.photos[0]} alt={`${c.name} RC car`} className="aspect-[16/10] w-full" />
                <div className="p-4"><div className="flex items-baseline justify-between"><p className="display text-lg">{c.name}</p><span className="num text-sm font-semibold">{peso(c.rate)}/hr</span></div>
                  <p className="text-sm text-mute">{c.brand} {c.model} · {c.category}</p><p className="mt-2 line-clamp-2 text-sm text-ink-2">{c.desc}</p>
                  <Button variant="primary" className="mt-4 w-full" onClick={() => setBook(c.id)}>Request this car</Button></div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'bookings' ? (
        current.length === 0 ? <Card><Empty icon={<Clock size={22} />} title="No upcoming bookings" body="Request a car to get started." action={<Button variant="primary" onClick={() => go('/portal')}>Browse cars</Button>} /></Card> : (
          <div className="space-y-4">
            {current.map((r) => { const c = carById(r.carId)!; return (
              <Card key={r.id} className="flex flex-col gap-4 sm:flex-row">
                <Photo src={c.photos[0]} alt={c.name} className="aspect-[16/10] w-full rounded-[4px] sm:w-48" />
                <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="display text-xl">{c.name}</p><StatusBadge status={r.status} /><span className="num text-xs text-mute">{r.id}</span></div>
                  <dl className="mt-2 divide-y divide-line-2"><KV k="Start" v={fmtDT(r.start)} /><KV k="End" v={fmtDT(r.end)} /><KV k="Amount" v={<span className="num">{peso(r.amount)}</span>} />
                    {(r.status === 'Active' || r.status === 'Overdue') && <KV k="Time left" v={<Countdown end={r.end} />} />}</dl></div>
              </Card>) })}
          </div>
        )
      ) : tab === 'payments' ? (
        pays.length === 0 ? <Card><Empty title="No payments yet" body="Payments appear after your first booking." /></Card> : (
          <ul className="space-y-3">{pays.map((p) => { const t = paymentTotals(p); return (
            <Card key={p.id}><div className="flex items-center justify-between"><b className="num">{p.id}</b><StatusBadge status={p.status} /></div>
              <ul className="num mt-3 space-y-1 text-sm">{p.lines.map((l) => <li key={l.ref} className="flex justify-between"><span>{l.label} <span className="text-mute">{l.ref}</span></span><span>{peso(l.amount)}</span></li>)}</ul>
              <div className="num mt-3 flex justify-between border-t border-line pt-2 text-sm"><span>Booked {peso(t.booked)}</span><span>Paid {peso(t.paid)}</span><b className={cx(t.balance > 0 && 'text-accent')}>Due {peso(t.balance)}</b></div></Card>) })}</ul>
        )
      ) : (
        <>
          {past.length === 0 && passes.filter((p) => p.customerId === ME).length === 0 ? <Card><Empty title="No history yet" body="Finished rentals show up here." /></Card> : (
            <div className="space-y-2">
              {past.map((r) => <Card key={r.id} className="flex items-center justify-between gap-3"><div><b>{carById(r.carId)?.name}</b><p className="num text-xs text-mute">{fmtDT(r.start)} – {fmtTime(r.end)}</p></div><div className="text-right"><StatusBadge status={r.status} /><p className="num mt-1 text-sm">{peso(r.amount)}</p></div></Card>)}
              <SectionTitle>Track passes</SectionTitle>
              {passes.filter((p) => p.customerId === ME).map((p) => <Card key={p.id} className="flex justify-between text-sm"><span className="num">{p.id} · {fmtDT(p.date)}</span><Badge tone="teal">{peso(p.price)}</Badge></Card>)}
            </div>
          )}
        </>
      )}
      {book && <BookModal carId={book} onClose={() => setBook(null)} />}
    </>
  )
}

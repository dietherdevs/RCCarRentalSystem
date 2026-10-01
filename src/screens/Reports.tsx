import { useMemo, useState } from 'react'
import { Download, FileText, Lock } from 'lucide-react'
import { Button, Callout, Card, Empty, Field, Input, PageHeader, SectionTitle, SkeletonCards, Stat, StatusBadge, TableWrap, Tabs, cx, td, th, useFakeLoad } from '../components/ui'
import { useApp } from '../lib/store'
import { revenueBetween } from '../lib/calc'
import { DAY, fmtDate, fmtDT, peso, startOfDay, toLocalInput } from '../lib/data'

type Range = 'daily' | 'weekly' | 'monthly' | 'custom'

function Bars({ data }: { data: { label: string; rental: number; track: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.rental + d.track))
  return (
    <figure>
      <div className="flex h-56 items-end gap-1.5 border-b border-ink/40 sm:gap-3" role="img" aria-label="Stacked bars of RC rental and track revenue per period">
        {data.map((d) => (
          <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.label}: RC ${peso(d.rental)}, Track ${peso(d.track)}`}>
            <span className="num mb-1 hidden text-center text-[10px] text-mute sm:block">{d.rental + d.track ? peso(d.rental + d.track) : ''}</span>
            <div className="bg-[#1F8A8A]" style={{ height: `${(d.track / max) * 100}%` }} />
            <div className="bg-accent" style={{ height: `${(d.rental / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-3">{data.map((d) => <span key={d.label} className="num min-w-0 flex-1 truncate text-center text-[10px] text-mute sm:text-[11px]">{d.label}</span>)}</div>
      <figcaption className="mt-3 flex gap-4 text-xs"><span className="flex items-center gap-1.5"><i className="size-3 bg-accent" /> RC rental</span><span className="flex items-center gap-1.5"><i className="size-3 bg-[#1F8A8A]" /> Track access</span></figcaption>
    </figure>
  )
}

export default function Reports() {
  const { revenue, rentals, passes, maint, cars, customerById, carById, now, can, toast, go } = useApp()
  const [range, setRange] = useState<Range>('weekly')
  const [cFrom, setCFrom] = useState(startOfDay(now) - 13 * DAY)
  const [cTo, setCTo] = useState(startOfDay(now))
  const loading = useFakeLoad('rep' + range, 500)
  const today = startOfDay(now)

  const { from, to, buckets } = useMemo(() => {
    let from = today, to = today + DAY, n = 1, step = DAY
    if (range === 'daily') { n = 12; from = today; to = today + DAY; step = 3600000 }
    if (range === 'weekly') { from = today - 6 * DAY; to = today + DAY; n = 7 }
    if (range === 'monthly') { from = today - 29 * DAY; to = today + DAY; n = 30 }
    if (range === 'custom') { from = Math.min(cFrom, cTo); to = Math.max(cFrom, cTo) + DAY; n = Math.min(60, Math.round((to - from) / DAY)); }
    const buckets = Array.from({ length: n }, (_, i) => {
      if (range === 'daily') { const a = today + (9 + i) * 3600000; return { a, b: a + 3600000, label: `${(9 + i) % 12 || 12}${9 + i < 12 ? 'a' : 'p'}` } }
      const a = from + i * step
      return { a, b: a + step, label: new Date(a).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) }
    })
    return { from, to, buckets }
  }, [range, cFrom, cTo, today])

  if (!can('reports.view')) return <Card><Empty icon={<Lock size={22} />} title="Reports are restricted" body="Your role does not have the reports.view permission. An Admin can grant it in Settings → Permissions." action={<Button onClick={() => go('/')}>Back to dashboard</Button>} /></Card>

  const series = buckets.map((b) => ({ label: b.label, ...revenueBetween(revenue, b.a, b.b) }))
  const rev = revenueBetween(revenue, from, to)
  const inR = rentals.filter((r) => r.start >= from && r.start < to && r.status !== 'Cancelled')
  const passesIn = passes.filter((p) => p.date >= from && p.date < to)
  const mIn = maint.filter((m) => m.date >= from && m.date < to)
  const days = Math.max(1, Math.round((to - from) / DAY))
  const openH = 12
  const util = cars.map((c) => {
    const rs = inR.filter((r) => r.carId === c.id)
    const hrs = rs.reduce((s, r) => s + ((r.actualReturn ?? r.end) - (r.actualOut ?? r.start)) / 3600000, 0)
    return { c, n: rs.length, hrs, pct: Math.min(100, (hrs / (openH * days)) * 100) }
  }).sort((a, b) => b.hrs - a.hrs)
  const avgUtil = util.reduce((s, u) => s + u.pct, 0) / Math.max(1, util.length)
  const repair = mIn.reduce((s, m) => s + m.cost, 0)
  const exp = (k: string) => toast(`${k} export ready: reports-${range}.${k.toLowerCase()}`)
  const maxHrs = Math.max(1, ...util.map((u) => u.hrs))
  const passByDay = buckets.map((b) => ({ label: b.label, n: passes.filter((p) => p.date >= b.a && p.date < b.b).length }))
  const maxPass = Math.max(1, ...passByDay.map((d) => d.n))

  return (
    <>
      <PageHeader eyebrow="Insight" title="Reports" sub={`${fmtDate(from)} – ${fmtDate(to - 1)}`}>
        <Button onClick={() => exp('CSV')}><Download size={15} /> CSV</Button>
        <Button onClick={() => exp('PDF')}><FileText size={15} /> PDF</Button>
      </PageHeader>
      <Tabs value={range} onChange={setRange} tabs={[{ v: 'daily', l: 'Daily' }, { v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }, { v: 'custom', l: 'Custom range' }]} />
      {range === 'custom' && (
        <div className="mb-5 flex flex-wrap gap-3">
          <Field label="From">{(a) => <Input {...a} type="date" value={toLocalInput(cFrom).slice(0, 10)} onChange={(e) => e.target.value && setCFrom(startOfDay(new Date(e.target.value + 'T00:00').getTime()))} />}</Field>
          <Field label="To">{(a) => <Input {...a} type="date" value={toLocalInput(cTo).slice(0, 10)} onChange={(e) => e.target.value && setCTo(startOfDay(new Date(e.target.value + 'T00:00').getTime()))} />}</Field>
        </div>
      )}
      {loading ? <SkeletonCards n={4} /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="RC rental revenue" value={peso(rev.rental)} tone="orange" />
            <Stat label="Track revenue" value={peso(rev.track)} tone="teal" />
            <Stat label="Total revenue" value={peso(rev.total)} big />
            <Stat label="Net of repairs" value={peso(rev.total - repair)} sub={`${peso(repair)} maintenance`} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <SectionTitle>Revenue · RC vs Track vs Total</SectionTitle>
              {rev.total === 0 ? <Empty title="No data for this period" body="Pick a wider range, or record rentals and payments to see revenue here." /> : <Bars data={series} />}
            </Card>
            <Card>
              <SectionTitle>Summary</SectionTitle>
              <dl className="divide-y divide-line-2 text-sm">
                {[['Rentals started', inR.length], ['Car hours rented', `${util.reduce((s, u) => s + u.hrs, 0).toFixed(1)} h`], ['Avg fleet utilization', `${avgUtil.toFixed(0)}%`], ['Track passes sold', passesIn.length], ['Avg rental value', peso(inR.length ? inR.reduce((s, r) => s + r.amount, 0) / inR.length : 0)], ['Cancelled rentals', rentals.filter((r) => r.start >= from && r.start < to && r.status === 'Cancelled').length], ['Repair cost', peso(repair)]].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between py-2.5"><dt className="text-mute">{k}</dt><dd className="num font-semibold">{v}</dd></div>
                ))}
              </dl>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <SectionTitle>Car utilization & rental frequency</SectionTitle>
              {util.length === 0 && <Empty title="No data for this period" body="Add cars to the fleet to see utilization." />}
              <ul className="space-y-3">
                {util.map((u) => (
                  <li key={u.c.id} className="grid grid-cols-[110px_1fr_88px] items-center gap-3 text-sm">
                    <span className="truncate font-medium">{u.c.name}</span>
                    <span className="h-3 bg-line-2" role="img" aria-label={`${u.c.name} ${u.hrs.toFixed(1)} hours`}><span className="block h-full bg-ink" style={{ width: `${(u.hrs / maxHrs) * 100}%` }} /></span>
                    <span className="num text-right text-xs">{u.hrs.toFixed(1)}h · {u.n}×</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionTitle>Track usage (passes per period)</SectionTitle>
              {passesIn.length === 0 ? <Empty title="No data for this period" body="No track passes sold in this range." /> : <div className="flex h-40 items-end gap-1.5 border-b border-ink/40" role="img" aria-label="Track passes per period">
                {passByDay.map((d) => <div key={d.label} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.n}`}><div className="bg-[#1F8A8A]" style={{ height: `${(d.n / maxPass) * 100}%`, minHeight: d.n ? 3 : 0 }} /></div>)}
              </div>}
              <p className="num mt-2 text-xs text-mute">{passesIn.length} passes · {peso(passesIn.reduce((s, p) => s + p.price, 0))} · peak {Math.max(...passByDay.map((d) => d.n))} per period</p>
            </Card>
          </div>

          <div className="mt-6">
            <SectionTitle>Rental history in range</SectionTitle>
            {inR.length === 0 ? <Card><Empty title="No data for this period" body="No rentals started in this range." /></Card> : (
              <TableWrap>
                <thead><tr>{['Rental', 'Customer', 'Car', 'Start', 'Amount', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{inR.sort((a, b) => b.start - a.start).slice(0, 15).map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-paper/60" onClick={() => go(`/rental/${r.id}`)}>
                    <td className={cx(td, 'num')}>{r.id}</td><td className={td}>{customerById(r.customerId)?.name}</td><td className={td}>{carById(r.carId)?.name}</td>
                    <td className={cx(td, 'num whitespace-nowrap')}>{fmtDT(r.start)}</td><td className={cx(td, 'num')}>{peso(r.amount)}</td><td className={td}><StatusBadge status={r.status} /></td>
                  </tr>))}</tbody>
              </TableWrap>
            )}
          </div>
          <div className="mt-6">
            <SectionTitle>Maintenance & repair costs</SectionTitle>
            {mIn.length === 0 ? <Callout tone="slate" title="No maintenance logged in this range" /> : (
              <TableWrap>
                <thead><tr>{['Date', 'Car', 'Issue', 'Cost'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{mIn.map((m) => <tr key={m.id}><td className={cx(td, 'num')}>{fmtDate(m.date)}</td><td className={td}>{m.carId}</td><td className={td}>{m.issue}</td><td className={cx(td, 'num')}>{peso(m.cost)}</td></tr>)}</tbody>
              </TableWrap>
            )}
          </div>
        </>
      )}
    </>
  )
}

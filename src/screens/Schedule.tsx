import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, List, Rows3 } from 'lucide-react'
import { Badge, Button, Card, Drawer, Empty, Input, KV, PageHeader, Segmented, Skeleton, StatusBadge, TONE, cx, useFakeLoad, type Tone } from '../components/ui'
import { useApp } from '../lib/store'
import { DAY, fmtDT, fmtDay, fmtDur, fmtTime, peso, sameDay, startOfDay, toLocalInput, type Rental } from '../lib/data'

const H0 = 9
const H1 = 21
const HW = 96
const DW = 168
const ROW = 64
const LABEL = 148
const rTone = (s: string): Tone => ({ Upcoming: 'blue', Active: 'orange', Overdue: 'red', Returned: 'teal', Cancelled: 'slate' } as Record<string, Tone>)[s] ?? 'slate'

export default function Schedule() {
  const { cars, rentals, customerById, carStatus, now, go, payments } = useApp()
  const [mode, setMode] = useState<'day' | 'week'>('day')
  const [view, setView] = useState<'timeline' | 'agenda'>('timeline')
  const [date, setDate] = useState(startOfDay(now))
  const [open, setOpen] = useState<Rental | null>(null)
  const loading = useFakeLoad(`${date}${mode}`, 350)

  const days = mode === 'day' ? [date] : Array.from({ length: 7 }, (_, i) => date + i * DAY)
  const dayW = mode === 'day' ? (H1 - H0) * HW : DW
  const width = days.length * dayW
  const visible = rentals.filter((r) => days.some((d) => sameDay(d, r.start)))

  const xOf = (t: number, dayIdx: number) => {
    const d = days[dayIdx]
    const f = Math.min(1, Math.max(0, (t - (d + H0 * 3600000)) / ((H1 - H0) * 3600000)))
    return dayIdx * dayW + f * dayW
  }
  const nowX = days.findIndex((d) => sameDay(d, now))

  const shift = (n: number) => setDate(date + n * DAY * (mode === 'day' ? 1 : 7))

  return (
    <>
      <PageHeader eyebrow="Rentals" title="Schedule" sub="Cars as rows, time as columns. Tap a block for the full rental record.">
        <Button variant="primary" onClick={() => go('/rentals/new')}>New rental</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label="Range" value={mode} onChange={setMode} options={[{ v: 'day', l: 'Day' }, { v: 'week', l: 'Week' }]} />
        <div className="flex items-center gap-1">
          <Button aria-label="Previous" onClick={() => shift(-1)} className="!px-3"><ChevronLeft size={16} /></Button>
          <label className="sr-only" htmlFor="sched-date">Pick date</label>
          <Input id="sched-date" type="date" value={toLocalInput(date).slice(0, 10)} onChange={(e) => e.target.value && setDate(startOfDay(new Date(e.target.value + 'T00:00').getTime()))} className="!w-auto" />
          <Button aria-label="Next" onClick={() => shift(1)} className="!px-3"><ChevronRight size={16} /></Button>
          <Button variant="ghost" onClick={() => setDate(startOfDay(now))}>Today</Button>
        </div>
        <div className="ml-auto">
          <Segmented label="View" value={view} onChange={setView} options={[{ v: 'timeline', l: <span className="flex items-center gap-1.5"><Rows3 size={14} /> Timeline</span> }, { v: 'agenda', l: <span className="flex items-center gap-1.5"><List size={14} /> Agenda</span> }]} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Legend">
        {(['Upcoming', 'Active', 'Overdue', 'Returned', 'Cancelled'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className={cx('size-3 rounded-[2px]', TONE[rTone(s)].dot)} />{s}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-3 w-[2px] bg-accent" /> Now ({fmtTime(now)})</span>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading schedule" className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : view === 'timeline' ? (
        <Card pad={false} className="overflow-hidden">
          <div className="scroll-thin overflow-x-auto">
            <div style={{ width: width + LABEL }} className="relative">
              {/* header */}
              <div className="sticky top-0 z-10 flex border-b border-line bg-paper">
                <div style={{ width: LABEL }} className="sticky left-0 z-20 shrink-0 border-r border-line bg-paper px-3 py-2.5"><span className="eyebrow">Car</span></div>
                {days.map((d) => (
                  <div key={d} style={{ width: dayW }} className="shrink-0 border-r border-line-2">
                    {mode === 'week' && <p className={cx('px-2 pt-2 text-xs font-bold', sameDay(d, now) && 'text-accent')}>{fmtDay(d)}</p>}
                    <div className="flex">
                      {mode === 'day'
                        ? Array.from({ length: H1 - H0 }).map((_, i) => (
                            <span key={i} style={{ width: HW }} className="num border-l border-line-2 px-1.5 py-2.5 text-[11px] text-mute first:border-l-0">
                              {((H0 + i + 11) % 12) + 1}{H0 + i < 12 ? ' AM' : ' PM'}
                            </span>
                          ))
                        : [9, 12, 15, 18].map((h) => <span key={h} style={{ width: dayW / 4 }} className="num px-1.5 py-1.5 text-[10px] text-mute">{((h + 11) % 12) + 1}{h < 12 ? 'a' : 'p'}</span>)}
                    </div>
                  </div>
                ))}
              </div>
              {/* rows */}
              {cars.map((car) => {
                const down = ['Maintenance', 'Damaged', 'Inactive'].includes(carStatus(car))
                const mine = visible.filter((r) => r.carId === car.id)
                return (
                  <div key={car.id} style={{ height: ROW }} className="flex border-b border-line-2">
                    <button onClick={() => go(`/car/${car.id}`)} style={{ width: LABEL }} className="sticky left-0 z-10 shrink-0 border-r border-line bg-surface px-3 text-left hover:bg-paper">
                      <p className="num text-xs text-mute">{car.id}</p>
                      <p className="truncate text-sm font-bold">{car.name}</p>
                    </button>
                    <div
                      className={cx('relative', down && 'bg-[repeating-linear-gradient(135deg,#f2f2ef_0_8px,#e6e6e1_8px_16px)]')}
                      style={{
                        width,
                        backgroundImage: down ? undefined : `repeating-linear-gradient(90deg, transparent 0 ${(mode === 'day' ? HW : dayW) - 1}px, #ececE7 ${(mode === 'day' ? HW : dayW) - 1}px ${mode === 'day' ? HW : dayW}px)`,
                      }}
                    >
                      {down && <span className="eyebrow absolute left-3 top-1/2 -translate-y-1/2 bg-paper px-2 py-0.5">Not rentable · {carStatus(car)}</span>}
                      {mine.map((r) => {
                        const di = days.findIndex((d) => sameDay(d, r.start))
                        const x1 = xOf(r.start, di)
                        const x2 = Math.max(x1 + 18, xOf(r.end, di))
                        const t = TONE[rTone(r.status)]
                        return (
                          <button
                            key={r.id}
                            onClick={() => setOpen(r)}
                            title={`${r.carId} · ${customerById(r.customerId)?.name} · ${fmtTime(r.start)}–${fmtTime(r.end)} · ${r.status}`}
                            aria-label={`${r.carId}, ${customerById(r.customerId)?.name}, ${fmtTime(r.start)} to ${fmtTime(r.end)}, ${r.status}`}
                            style={{ left: x1 + 1, width: x2 - x1 - 2, top: 6, height: ROW - 13 }}
                            className={cx('absolute overflow-hidden rounded-[4px] px-2 py-1 text-left shadow-sm transition-transform hover:z-[5] hover:scale-[1.02]', t.solid, r.status === 'Cancelled' && 'opacity-50 line-through')}
                          >
                            {mode === 'day' || x2 - x1 > 60 ? (
                              <>
                                <p className="truncate text-xs font-bold leading-tight">{customerById(r.customerId)?.name}</p>
                                <p className="num truncate text-[10px] leading-tight opacity-90">{fmtTime(r.start)}–{fmtTime(r.end)}</p>
                                <p className="truncate text-[10px] leading-tight opacity-90">{r.carId} · {r.status}</p>
                              </>
                            ) : (
                              <span className="sr-only">{r.id}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {nowX >= 0 && (
                <div className="pointer-events-none absolute bottom-0 top-0 z-[8] w-[2px] bg-accent" style={{ left: LABEL + xOf(now, nowX) }}>
                  <span className="num absolute -top-0 left-1 rounded-[2px] bg-accent px-1 text-[10px] font-bold text-white">NOW</span>
                </div>
              )}
              {visible.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                  <span className="rounded-[4px] bg-ink px-3 py-1.5 text-xs font-semibold text-white">No rentals in this range</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {days.map((d) => {
            const list = visible.filter((r) => sameDay(r.start, d)).sort((a, b) => a.start - b.start)
            return (
              <div key={d}>
                <p className={cx('eyebrow mb-2', sameDay(d, now) && '!text-accent')}>{fmtDay(d)}{sameDay(d, now) && ' · Today'}</p>
                <Card pad={false}>
                  {list.length === 0 ? (
                    <Empty icon={<CalendarDays size={22} />} title="Nothing scheduled" body="No rentals start on this day." />
                  ) : (
                    <ul>
                      {list.map((r) => (
                        <li key={r.id} className="border-b border-line-2 last:border-0">
                          <button onClick={() => setOpen(r)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-paper">
                            <span className={cx('h-10 w-1 shrink-0 rounded-full', TONE[rTone(r.status)].dot)} />
                            <div className="num w-[84px] shrink-0 text-xs leading-5"><p className="font-medium">{fmtTime(r.start)}</p><p className="text-mute">{fmtTime(r.end)}</p></div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">{customerById(r.customerId)?.name}</p>
                              <p className="num truncate text-xs text-mute">{r.carId} {cars.find((c) => c.id === r.carId)?.name}</p>
                            </div>
                            <StatusBadge status={r.status} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-mute sm:hidden">Swipe the timeline sideways to see later hours.</p>

      {open && (
        <Drawer
          title={`${open.carId} · ${cars.find((c) => c.id === open.carId)?.name}`}
          sub={<div className="flex items-center gap-2"><StatusBadge status={open.status} /><span className="num text-xs text-mute">{open.id}</span></div>}
          onClose={() => setOpen(null)}
          footer={<><Button variant="primary" onClick={() => go(`/rental/${open.id}`)}>Open full record</Button><Button onClick={() => setOpen(null)}>Close</Button></>}
        >
          <dl className="divide-y divide-line-2">
            <KV k="Customer" v={customerById(open.customerId)?.name} />
            <KV k="Car" v={`${open.carId} · ${cars.find((c) => c.id === open.carId)?.name}`} />
            <KV k="Start" v={fmtDT(open.start)} />
            <KV k="Expected end" v={fmtDT(open.end)} />
            <KV k="Duration" v={fmtDur(open.end - open.start)} />
            <KV k="Rental price" v={peso(open.amount)} />
            <KV k="Payment" v={<StatusBadge status={payments.find((p) => p.id === open.paymentId)?.status ?? 'Pending'} />} />
          </dl>
          <Badge className="mt-4" tone="slate">Last update: {open.history[open.history.length - 1]?.text}</Badge>
        </Drawer>
      )}
    </>
  )
}

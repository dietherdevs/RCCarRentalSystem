import { useMemo } from 'react'
import { Clock, Flag, Plus } from 'lucide-react'
import { Button, Card, Countdown, Empty, PageHeader, SectionTitle, Skeleton, Stat, StatusBadge, useFakeLoad, TONE } from '../components/ui'
import { useApp, useLiveNow } from '../lib/store'
import { fmtDate, fmtTime, peso, sameDay, startOfDay, DAY, fmtDur } from '../lib/data'
import { revenueBetween } from '../lib/calc'

export default function Dashboard() {
  const { cars, rentals, passes, payments, revenue, carStatus, customerById, go, settings, can, now } = useApp()
  const live = useLiveNow()
  const loading = useFakeLoad('dash', 500)

  const d = useMemo(() => {
    const st = cars.map(carStatus)
    const active = rentals.filter((r) => r.status === 'Active' || r.status === 'Overdue').sort((a, b) => a.end - b.end)
    const upcoming = rentals.filter((r) => r.status === 'Upcoming' && sameDay(r.start, now)).sort((a, b) => a.start - b.start)
    const t0 = startOfDay(now)
    return {
      available: st.filter((s) => s === 'Available' || s === 'Returned').length,
      reserved: st.filter((s) => s === 'Reserved').length,
      rented: st.filter((s) => s === 'Active Rental').length,
      down: st.filter((s) => s === 'Maintenance' || s === 'Damaged').length,
      active,
      upcoming,
      soon: active.filter((r) => r.end - now <= settings.returnAlertMins * 60000),
      trackToday: passes.filter((p) => sameDay(p.date, now)),
      rev: revenueBetween(revenue, t0, t0 + DAY),
    }
  }, [cars, rentals, passes, revenue, carStatus, settings, now])

  const overdueBal = payments.filter((p) => p.status === 'Pending' || p.status === 'Partially Paid').length

  return (
    <>
      <PageHeader eyebrow={`${fmtDate(live)} · ${fmtTime(live)}`} title="Today on the track">
        <Button onClick={() => go('/track/today')}>
          <Flag size={16} /> Sell track access
        </Button>
        <Button variant="primary" disabled={!can('rentals.manage')} onClick={() => go('/rentals/new')}>
          <Plus size={16} /> New rental
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading dashboard">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))}
          </div>
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="rise space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Available cars" value={d.available} tone="green" sub={`${d.reserved} reserved soon`} onClick={() => go('/cars/available')} />
            <Stat label="Rented cars" value={d.rented} tone="orange" sub="Out on the track" onClick={() => go('/cars/rented')} />
            <Stat label="Maintenance / damaged" value={d.down} tone="red" sub="Not rentable" onClick={() => go('/cars/maintenance')} />
            <Stat label="Upcoming rentals" value={d.upcoming.length} tone="blue" sub="Later today" onClick={() => go('/rentals/today')} />
            <Stat label="Active rentals" value={d.active.length} tone="orange" sub="Checked out now" onClick={() => go('/rentals/today')} />
            <Stat label="Returning soon" value={d.soon.length} tone="amber" sub={`Within ${settings.returnAlertMins} min`} />
            <Stat label="Today's track users" value={d.trackToday.length} tone="teal" sub={`${d.trackToday.filter((p) => p.checkIn && !p.checkOut).length} on track now`} onClick={() => go('/track/today')} />
            <Stat label="Unpaid balances" value={overdueBal} tone="violet" sub="Pending or partial" onClick={() => go('/payments')} />
          </div>

          <section aria-label="Revenue today" className="grid overflow-hidden rounded-[6px] bg-ink text-white md:grid-cols-[1fr_1fr_1.2fr]">
            <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
              <p className="eyebrow !text-white/55">RC rental revenue</p>
              <p className="display num mt-3 text-4xl" style={{ fontFamily: 'var(--font-sans)' }}>{peso(d.rev.rental)}</p>
              <p className="mt-1 text-xs text-white/55">{peso(settings.carRate)} / hour / car</p>
            </div>
            <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
              <p className="eyebrow !text-white/55">Track revenue</p>
              <p className="display num mt-3 text-4xl" style={{ fontFamily: 'var(--font-sans)' }}>{peso(d.rev.track)}</p>
              <p className="mt-1 text-xs text-white/55">{peso(settings.trackPrice)} unlimited access</p>
            </div>
            <div className="bg-accent p-5">
              <p className="eyebrow !text-white/80">Total revenue · collected today</p>
              <p className="display num mt-3 text-5xl" style={{ fontFamily: 'var(--font-sans)' }}>{peso(d.rev.total)}</p>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/25" aria-hidden>
                <span style={{ width: `${d.rev.total ? (d.rev.rental / d.rev.total) * 100 : 0}%` }} className="bg-white" />
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div>
              <SectionTitle right={<Button size="sm" variant="ghost" onClick={() => go('/rentals/schedule')}>Open schedule</Button>}>Active rentals</SectionTitle>
              <Card pad={false}>
                {d.active.length === 0 ? (
                  <Empty title="No cars on the track" body="Checked-out rentals appear here with a live countdown to their return time." action={<Button variant="primary" onClick={() => go('/rentals/new')}>Start a rental</Button>} />
                ) : (
                  <>
                    <div className="hidden grid-cols-[1.2fr_1.2fr_.8fr_.8fr_1fr] gap-3 border-b border-line bg-paper/70 px-4 py-2.5 md:grid">
                      {['Car', 'Customer', 'Started', 'Expected return', 'Time remaining'].map((h) => (
                        <span key={h} className="eyebrow">{h}</span>
                      ))}
                    </div>
                    <ul>
                      {d.active.map((r) => {
                        const c = cars.find((x) => x.id === r.carId)!
                        const soon = r.end - live <= settings.returnAlertMins * 60000
                        return (
                          <li key={r.id} className="border-b border-line-2 last:border-0">
                            <button onClick={() => go(`/rental/${r.id}`)} className="grid w-full grid-cols-2 gap-x-3 gap-y-2 px-4 py-3.5 text-left transition-colors hover:bg-paper md:grid-cols-[1.2fr_1.2fr_.8fr_.8fr_1fr] md:items-center">
                              <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                                <span className={`h-9 w-1 rounded-full ${soon ? TONE.amber.dot : TONE.orange.dot}`} />
                                <div>
                                  <p className="text-sm font-semibold">{c.name}</p>
                                  <p className="num text-xs text-mute">{c.id} · {r.id}</p>
                                </div>
                              </div>
                              <p className="text-sm md:order-none"><span className="eyebrow mr-2 md:hidden">Customer</span>{customerById(r.customerId)?.name}</p>
                              <p className="num text-sm"><span className="eyebrow mr-2 md:hidden">Start</span>{fmtTime(r.start)}</p>
                              <p className="num text-sm"><span className="eyebrow mr-2 md:hidden">Ends</span>{fmtTime(r.end)}</p>
                              <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                                <Clock size={14} className="text-mute" />
                                <Countdown end={r.end} className="text-base" />
                                {soon && <StatusBadge status={r.end < live ? 'Overdue' : 'Active'} />}
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </Card>
            </div>

            <div>
              <SectionTitle>Upcoming today</SectionTitle>
              <Card pad={false}>
                {d.upcoming.length === 0 ? (
                  <Empty title="Nothing booked" body="No more bookings for today." />
                ) : (
                  <ul>
                    {d.upcoming.map((r) => (
                      <li key={r.id} className="border-b border-line-2 last:border-0">
                        <button onClick={() => go(`/rental/${r.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                          <div className="num w-[76px] shrink-0 text-xs leading-5">
                            <p className="font-medium">{fmtTime(r.start)}</p>
                            <p className="text-mute">{fmtTime(r.end)}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{customerById(r.customerId)?.name}</p>
                            <p className="num truncate text-xs text-mute">{r.carId} · {fmtDur(r.end - r.start)}</p>
                          </div>
                          <StatusBadge status="Upcoming" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

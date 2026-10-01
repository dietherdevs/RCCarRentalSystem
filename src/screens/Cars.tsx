import { useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, ArrowLeft, Camera, ImagePlus, LayoutGrid, List, Lock, Pencil, Plus, Search, Upload, Wrench } from 'lucide-react'
import {
  Badge, Button, Callout, Card, Confirm, Empty, Field, Input, KV, Modal, PageHeader, Photo, SectionTitle, Select, SkeletonCards, StatusBadge,
  Segmented, TableWrap, Textarea, TextField, cx, td, th, useFakeLoad,
} from '../components/ui'
import { useApp } from '../lib/store'
import { CAR_STATUSES, fmtDT, fmtDate, fmtTime, peso, toLocalInput, type BaseStatus, type Car, type CarStatus, type Condition } from '../lib/data'

const NOT_RENTABLE: CarStatus[] = ['Maintenance', 'Damaged', 'Inactive']
const CATS = ['Crawler', 'Buggy', 'Drift', 'Touring', 'Monster Truck', 'Short Course', 'Truck']

export function CarsList({ filter }: { filter?: string }) {
  const { cars, carStatus, go, can, now } = useApp()
  const [q, setQ] = useState('')
  const [st, setSt] = useState<'all' | CarStatus>('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const loading = useFakeLoad('cars' + filter, 450)
  if (filter === 'maintenance') return <MaintenanceView />
  const base = filter === 'available' ? ['Available', 'Returned', 'Reserved'] : filter === 'rented' ? ['Active Rental'] : null
  const list = cars.filter((c) => {
    const s = carStatus(c)
    return (!base || base.includes(s)) && (st === 'all' || s === st) && (c.name + c.id + c.brand + c.model).toLowerCase().includes(q.toLowerCase())
  })
  const title = filter === 'available' ? 'Available cars' : filter === 'rented' ? 'Rented cars' : 'All cars'
  void now
  return (
    <>
      <PageHeader eyebrow="RC Cars" title={title} sub={`${cars.length} cars in the fleet · ${peso(cars[0]?.rate ?? 200)}/hr each`}>
        {can('cars.edit') && <Button variant="primary" onClick={() => go('/cars/new')}><Plus size={16} /> Add car</Button>}
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <Input aria-label="Search cars" placeholder="Search name, asset ID or brand" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented label="Layout" value={layout} onChange={setLayout} options={[{ v: 'grid', l: <LayoutGrid size={15} aria-label="Grid" /> }, { v: 'list', l: <List size={15} aria-label="List" /> }]} />
      </div>
      {!base && (
        <div className="scroll-quiet -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by status">
          {(['all', ...CAR_STATUSES] as const).map((s) => (
            <button key={s} aria-pressed={st === s} onClick={() => setSt(s)} className={cx('min-h-10 shrink-0 rounded-full border px-4 text-[13px] font-semibold', st === s ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-surface hover:border-ink')}>
              {s === 'all' ? 'All' : s} <span className="num ml-1 opacity-60">{s === 'all' ? cars.length : cars.filter((c) => carStatus(c) === s).length}</span>
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <SkeletonCards />
      ) : list.length === 0 ? (
        <Card><Empty title="No cars match" body="Change the status filter or search term." action={<Button onClick={() => { setQ(''); setSt('all') }}>Reset filters</Button>} /></Card>
      ) : layout === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      ) : (
        <TableWrap>
          <thead><tr>{['Car', 'Asset ID', 'Category', 'Rate', 'Condition', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-paper/60" onClick={() => go(`/car/${c.id}`)}>
                <td className={td}><span className="flex items-center gap-3"><Photo src={c.photos[0]} alt={c.name} className="size-10 rounded-[4px]" /><b>{c.name}</b></span></td>
                <td className={cx(td, 'num')}>{c.id}</td><td className={td}>{c.category}</td><td className={cx(td, 'num')}>{peso(c.rate)}/hr</td><td className={td}>{c.condition}</td>
                <td className={td}><StatusBadge status={carStatus(c)} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  )
}

function CarCard({ car }: { car: Car }) {
  const { carStatus, go } = useApp()
  const s = carStatus(car)
  const bad = NOT_RENTABLE.includes(s)
  return (
    <button onClick={() => go(`/car/${car.id}`)} className="group overflow-hidden rounded-[6px] border border-line bg-surface text-left transition-colors hover:border-ink">
      <div className="relative">
        <Photo src={car.photos[0]} alt={`${car.name} ${car.brand} ${car.model}`} className={cx('aspect-[16/11] w-full', bad && 'grayscale')} />
        <div className="absolute left-2.5 top-2.5"><StatusBadge status={s} /></div>
        {bad && <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-[3px] bg-ink px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white"><Lock size={11} /> Not rentable</span>}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2"><p className="display text-lg">{car.name}</p><span className="num text-xs text-mute">{car.id}</span></div>
        <p className="text-sm text-mute">{car.brand} {car.model}</p>
        <div className="mt-3 flex items-center justify-between text-xs"><Badge>{car.category}</Badge><span className="num font-medium">{peso(car.rate)}/hr</span></div>
      </div>
    </button>
  )
}

export function CarDetail({ id }: { id: string }) {
  const { cars, rentals, customerById, carStatus, go, can, maint, now, releaseCar } = useApp()
  const [idx, setIdx] = useState(0)
  const [photoModal, setPhotoModal] = useState<null | { mode: 'replace' | 'add' }>(null)
  const [mModal, setMModal] = useState(false)
  const [release, setRelease] = useState(false)
  const [relNote, setRelNote] = useState('')
  const loading = useFakeLoad('car' + id, 350)
  const car = cars.find((c) => c.id === id)
  if (!car) return <Card><Empty title="Car not found" body={`No car with asset ID ${id}.`} action={<Button onClick={() => go('/cars')}>All cars</Button>} /></Card>
  const s = carStatus(car)
  const bad = NOT_RENTABLE.includes(s)
  const upcoming = rentals.filter((r) => r.carId === id && (r.status === 'Upcoming' || r.status === 'Active' || r.status === 'Overdue') && r.end > now).sort((a, b) => a.start - b.start)
  const down = s === 'Maintenance' || s === 'Damaged'
  if (loading) return <SkeletonCards n={2} />
  return (
    <>
      <button onClick={() => go('/cars')} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> All cars</button>
      <PageHeader eyebrow={`Asset ${car.id}`} title={car.name} sub={`${car.brand} ${car.model} · ${car.category} · ${car.scale} scale`}>
        <StatusBadge status={s} />
        {can('cars.edit') && <Button onClick={() => go(`/car/${id}/edit`)}><Pencil size={15} /> Edit</Button>}
        <Button variant="primary" disabled={bad} onClick={() => go(`/rentals/new?car=${id}`)}>{bad ? 'Not rentable' : 'Rent this car'}</Button>
      </PageHeader>
      {bad && <div className="mb-5"><Callout tone={s === 'Damaged' ? 'red' : 'amber'} title={`${s}: not rentable`} action={down && can('cars.maintenance') ? <Button size="sm" variant="primary" onClick={() => setRelease(true)}>Release car back to service</Button> : undefined}>This car cannot be selected in New Rental until it is released.</Callout></div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <Photo src={car.photos[idx]} alt={`${car.name} photo ${idx + 1}`} className={cx('aspect-[4/3] w-full rounded-[6px]', bad && 'grayscale')} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {car.photos.map((p, i) => (
              <button key={i} aria-label={`Photo ${i + 1}`} aria-pressed={i === idx} onClick={() => setIdx(i)} className={cx('overflow-hidden rounded-[4px] border-2', i === idx ? 'border-accent' : 'border-transparent')}>
                <Photo src={p} alt="" className="size-16" />
              </button>
            ))}
            {can('cars.edit') && (
              <>
                <Button size="sm" onClick={() => setPhotoModal({ mode: 'replace' })}><Camera size={14} /> Replace</Button>
                <Button size="sm" onClick={() => setPhotoModal({ mode: 'add' })}><ImagePlus size={14} /> Add photo</Button>
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <Card>
            <p className="mb-3 text-sm text-ink-2">{car.desc}</p>
            <dl className="divide-y divide-line-2">
              <KV k="Asset ID" v={<span className="num">{car.id}</span>} />
              <KV k="Brand / model" v={`${car.brand} ${car.model}`} />
              <KV k="Category" v={car.category} />
              <KV k="Hourly rate" v={<span className="num">{peso(car.rate)} / hr</span>} />
              <KV k="Condition" v={<Badge tone={car.condition === 'Good' ? 'green' : car.condition === 'Damaged' ? 'red' : 'amber'}>{car.condition}</Badge>} />
              <KV k="Status" v={<StatusBadge status={s} />} />
            </dl>
          </Card>
          <Card>
            <SectionTitle>Upcoming & active rentals</SectionTitle>
            {upcoming.length === 0 ? <p className="text-sm text-mute">No upcoming rentals for this car.</p> : (
              <ul className="divide-y divide-line-2">
                {upcoming.map((r) => (
                  <li key={r.id}><button onClick={() => go(`/rental/${r.id}`)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left"><span className="num w-[132px] shrink-0 text-xs">{fmtDate(r.start).slice(0, 6)}, {fmtTime(r.start)}–{fmtTime(r.end)}</span><span className="flex-1 truncate text-sm font-medium">{customerById(r.customerId)?.name}</span><StatusBadge status={r.status} /></button></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle right={can('cars.maintenance') && <Button size="sm" onClick={() => setMModal(true)}><Wrench size={14} /> Log maintenance</Button>}>Maintenance history</SectionTitle>
        <MaintenanceTable list={maint.filter((m) => m.carId === id)} />
      </div>

      {photoModal && <PhotoModal car={car} mode={photoModal.mode} index={idx} onClose={() => setPhotoModal(null)} />}
      {mModal && <MaintenanceModal carId={id} onClose={() => setMModal(false)} />}
      {release && (
        <Confirm title="Release car back to service?" confirmLabel="Release to service" body={`${car.id} ${car.name} will become Available and can be rented again. Confirm the repair is complete and tested.`} onConfirm={() => releaseCar(id, relNote)} onClose={() => setRelease(false)}>
          <TextField label="Release note (optional)" value={relNote} onChange={(e) => setRelNote(e.target.value)} placeholder="e.g. New servo fitted, 15 min test run OK" />
        </Confirm>
      )}
    </>
  )
}

function MaintenanceTable({ list, showCar }: { list: ReturnType<typeof useApp>['maint']; showCar?: boolean }) {
  if (list.length === 0) return <Card><Empty icon={<Wrench size={22} />} title="No maintenance records" body="Repairs and inspections will be listed here." /></Card>
  return (
    <TableWrap>
      <thead><tr>{[...(showCar ? ['Car'] : []), 'Date', 'Issue', 'Repair', 'Parts', 'Cost', 'Staff', 'State'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {list.map((m) => (
          <tr key={m.id}>
            {showCar && <td className={cx(td, 'num font-medium')}>{m.carId}</td>}
            <td className={cx(td, 'num whitespace-nowrap')}>{fmtDate(m.date)}</td>
            <td className={cx(td, 'max-w-[240px]')}>{m.issue}<span className="block text-xs text-mute">{m.notes}</span></td>
            <td className={cx(td, 'max-w-[220px]')}>{m.repair}</td>
            <td className={cx(td, 'max-w-[160px]')}>{m.parts}</td>
            <td className={cx(td, 'num')}>{peso(m.cost)}</td>
            <td className={td}>{m.staff}</td>
            <td className={td}><Badge tone={m.open ? 'amber' : 'green'} dot>{m.open ? 'Open' : 'Resolved'}</Badge></td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

function MaintenanceView() {
  const { cars, carStatus, maint, go, can, releaseCar } = useApp()
  const [rel, setRel] = useState<Car | null>(null)
  const [log, setLog] = useState(false)
  const down = cars.filter((c) => ['Maintenance', 'Damaged'].includes(carStatus(c)))
  const total = maint.reduce((s, m) => s + m.cost, 0)
  return (
    <>
      <PageHeader eyebrow="RC Cars" title="Maintenance & damage" sub={`${down.length} cars out of service · ${peso(total)} logged repair cost`}>
        {can('cars.maintenance') && <Button variant="primary" onClick={() => setLog(true)}><Wrench size={16} /> Log maintenance</Button>}
      </PageHeader>
      <SectionTitle>Out of service</SectionTitle>
      {down.length === 0 ? <Card><Empty title="Everything is rentable" body="No cars are in maintenance or damaged." /></Card> : (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {down.map((c) => (
            <Card key={c.id} className="flex gap-4">
              <Photo src={c.photos[0]} alt={c.name} className="size-24 shrink-0 rounded-[4px] grayscale" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><button onClick={() => go(`/car/${c.id}`)} className="display text-lg hover:underline">{c.name}</button><StatusBadge status={carStatus(c)} /></div>
                <p className="num text-xs text-mute">{c.id} · Not rentable</p>
                <p className="mt-1 line-clamp-2 text-sm">{maint.find((m) => m.carId === c.id && m.open)?.issue}</p>
                {can('cars.maintenance') ? <Button size="sm" className="mt-3" onClick={() => setRel(c)}>Release car back to service</Button> : <p className="mt-3 text-xs text-mute"><Lock size={11} className="mr-1 inline" />No permission to release</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <SectionTitle>History</SectionTitle>
      <MaintenanceTable list={maint} showCar />
      {rel && <Confirm title="Release car back to service?" confirmLabel="Release to service" body={`${rel.id} ${rel.name} becomes Available and rentable again.`} onConfirm={() => releaseCar(rel.id, '')} onClose={() => setRel(null)} />}
      {log && <MaintenanceModal onClose={() => setLog(false)} />}
    </>
  )
}

function MaintenanceModal({ carId, onClose }: { carId?: string; onClose: () => void }) {
  const { cars, users, logMaintenance, now, actor } = useApp()
  const [f, setF] = useState({ carId: carId ?? '', date: now, issue: '', repair: '', parts: '', cost: '', notes: '', staff: actor || users.find((u) => u.active)?.name || '', setStatus: true })
  const [tried, setTried] = useState(false)
  const e = {
    carId: !f.carId ? 'Select a car.' : '',
    issue: f.issue.trim().length < 3 ? 'Describe the issue.' : '',
    cost: f.cost !== '' && (isNaN(+f.cost) || +f.cost < 0) ? 'Cost must be 0 or more.' : '',
  }
  const bad = Object.values(e).some(Boolean)
  const set = (k: string, v: unknown) => setF({ ...f, [k]: v })
  return (
    <Modal wide title="Log maintenance / damage" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { setTried(true); if (!bad) { logMaintenance({ carId: f.carId, date: f.date, issue: f.issue, repair: f.repair || 'To be assessed', parts: f.parts || '—', cost: +f.cost || 0, notes: f.notes, staff: f.staff }, f.setStatus); onClose() } }}>Save record</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Car" error={tried ? e.carId : undefined}>{(a) => <Select {...a} disabled={!!carId} value={f.carId} onChange={(x) => set('carId', x.target.value)}><option value="">Select car…</option>{cars.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</Select>}</Field>
        <Field label="Date">{(a) => <Input {...a} type="datetime-local" value={toLocalInput(f.date)} onChange={(x) => x.target.value && set('date', new Date(x.target.value).getTime())} />}</Field>
        <TextField className="sm:col-span-2" label="Issue" value={f.issue} onChange={(x) => set('issue', x.target.value)} error={tried ? e.issue : undefined} />
        <TextField label="Repair performed / planned" value={f.repair} onChange={(x) => set('repair', x.target.value)} />
        <TextField label="Parts used" value={f.parts} onChange={(x) => set('parts', x.target.value)} />
        <TextField label="Cost (₱)" type="number" min={0} value={f.cost} onChange={(x) => set('cost', x.target.value)} error={tried ? e.cost : undefined} />
        <Field label="Staff member">{(a) => <Select {...a} value={f.staff} onChange={(x) => set('staff', x.target.value)}>{[...new Set([actor, ...users.filter((u) => u.active).map((u) => u.name)].filter(Boolean))].map((n) => <option key={n}>{n}</option>)}</Select>}</Field>
        <Field className="sm:col-span-2" label="Notes">{(a) => <Textarea {...a} value={f.notes} onChange={(x) => set('notes', x.target.value)} />}</Field>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" className="size-5 accent-[#d63a0b]" checked={f.setStatus} onChange={(x) => set('setStatus', x.target.checked)} />Take car out of service (status Maintenance, not rentable)</label>
      </div>
    </Modal>
  )
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
export function PhotoModal({ car, mode, index, onClose }: { car: Car; mode: 'replace' | 'add'; index: number; onClose: () => void }) {
  const { setCarPhoto, settings } = useApp()
  const max = settings.maxPhotoMB
  const [src, setSrc] = useState('')
  const [err, setErr] = useState<{ title: string; body: string } | null>(null)
  const [drag, setDrag] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [px, setPx] = useState(50)
  const [py, setPy] = useState(50)
  const [ratio, setRatio] = useState('4/3')
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('photo')
  const imgRef = useRef<HTMLImageElement>(null)
  const inp = useRef<HTMLInputElement>(null)

  const take = (f?: File | null) => {
    if (!f) return
    setErr(null)
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (/\.(exe|js|html?|svg|php|sh|bat|zip)$/i.test(f.name) || ['image/svg+xml', 'text/html', 'application/x-msdownload', 'application/javascript'].includes(f.type))
      return setErr({ title: 'File rejected for safety', body: `“${f.name}” can contain scripts or executable code. Only JPG, PNG and WebP images are accepted.` })
    if (!ALLOWED.includes(f.type)) return setErr({ title: 'Unsupported file type', body: `“${f.name}” is ${f.type || 'unknown'}. Use JPG, PNG or WebP.` })
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return setErr({ title: 'File extension does not match', body: `The extension .${ext} does not match an image type.` })
    if (f.size > max * 1024 * 1024) return setErr({ title: 'File is too large', body: `“${f.name}” is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${max} MB.` })
    setFileName(f.name)
    setSrc(URL.createObjectURL(f))
    setZoom(1)
    setPx(50)
    setPy(50)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    take(e.dataTransfer.files[0])
  }
  const [rw, rh] = ratio.split('/').map(Number)
  const save = async () => {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return setErr({ title: 'Image not ready', body: 'Wait for the preview to load, then try again.' })
    setBusy(true)
    const render = (W: number) => {
      const H = Math.round((W * rh) / rw)
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      const base = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom
      const dw = img.naturalWidth * base
      const dh = img.naturalHeight * base
      cv.getContext('2d')!.drawImage(img, -(dw - W) * (px / 100), -(dh - H) * (py / 100), dw, dh)
      return new Promise<Blob>((res, rej) => cv.toBlob((x) => (x ? res(x) : rej(new Error('Could not encode the image'))), 'image/webp', 0.88))
    }
    try {
      const [full, thumb] = await Promise.all([render(1200), render(320)])
      const ok = await setCarPhoto(car.id, mode === 'add' ? 'add' : index, full, thumb, fileName)
      if (ok) onClose()
    } catch (e) {
      setErr({ title: 'Upload failed', body: e instanceof Error ? e.message : 'Try again.' })
    }
    setBusy(false)
  }
  return (
    <Modal wide title={mode === 'add' ? `Add photo · ${car.id}` : `Replace photo ${index + 1} · ${car.id}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!src} loading={busy} onClick={save}>Save photo</Button></>}>
      <div className="space-y-4">
        {err && <Callout tone="red" title={err.title}>{err.body}</Callout>}
        {!src ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cx('flex flex-col items-center rounded-[6px] border-2 border-dashed px-6 py-10 text-center transition-colors', drag ? 'border-accent bg-accent-soft' : 'border-ink/30 bg-paper')}
          >
            <Upload size={26} />
            <p className="mt-3 text-sm font-semibold">Drag a photo here</p>
            <p className="text-xs text-mute">JPG, PNG or WebP · max {max} MB</p>
            <Button className="mt-4" onClick={() => inp.current?.click()}>Choose file</Button>
            <input ref={inp} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose photo file" onChange={(e) => take(e.target.files?.[0])} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <div className="relative w-full overflow-hidden rounded-[4px] bg-ink" style={{ aspectRatio: ratio.replace('/', ' / ') }}>
                <img ref={imgRef} src={src} alt="Crop preview" className="absolute max-w-none select-none" style={{ width: `${zoom * 100}%`, minHeight: `${zoom * 100}%`, left: `${-(zoom - 1) * px}%`, top: `${-(zoom - 1) * py}%`, objectFit: 'cover', height: `${zoom * 100}%` }} />
              </div>
              <button onClick={() => { setSrc(''); setErr(null) }} className="mt-2 min-h-11 text-xs font-semibold underline">Choose a different file</button>
            </div>
            <div className="space-y-3">
              <Field label="Crop ratio">{(a) => <Select {...a} value={ratio} onChange={(e) => setRatio(e.target.value)}><option value="4/3">4:3 (cards)</option><option value="1/1">1:1 (square)</option><option value="16/9">16:9 (wide)</option></Select>}</Field>
              <Field label="Zoom">{(a) => <input {...a} type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="h-11 accent-[#d63a0b]" />}</Field>
              <Field label="Horizontal">{(a) => <input {...a} type="range" min={0} max={100} value={px} onChange={(e) => setPx(+e.target.value)} className="h-11 accent-[#d63a0b]" />}</Field>
              <Field label="Vertical">{(a) => <input {...a} type="range" min={0} max={100} value={py} onChange={(e) => setPy(+e.target.value)} className="h-11 accent-[#d63a0b]" />}</Field>
              <div><p className="eyebrow mb-1">Thumbnail</p><div className="size-16 overflow-hidden rounded-[4px] bg-ink"><img src={src} alt="" className="size-full object-cover" /></div></div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function CarForm({ id }: { id?: string }) {
  const { cars, saveCar, go, settings, can } = useApp()
  const existing = cars.find((c) => c.id === id)
  const nextId = `RC-${String(Math.max(...cars.map((c) => +c.id.slice(3))) + 1).padStart(3, '0')}`
  const [f, setF] = useState({
    id: existing?.id ?? nextId, name: existing?.name ?? '', brand: existing?.brand ?? '', model: existing?.model ?? '', category: existing?.category ?? 'Buggy', scale: existing?.scale ?? '1/10',
    desc: existing?.desc ?? '', rate: String(existing?.rate ?? settings.carRate), condition: (existing?.condition ?? 'Good') as Condition, base: (existing?.base ?? 'Available') as BaseStatus,
  })
  const [tried, setTried] = useState(false)
  if (!can('cars.edit')) return <Callout tone="amber" title="You do not have permission to edit cars" />
  const e: Record<string, string> = {}
  if (!/^RC-\d{3}$/.test(f.id)) e.id = 'Use the format RC-001.'
  else if (!existing && cars.some((c) => c.id === f.id)) e.id = `${f.id} already exists.`
  if (f.name.trim().length < 2) e.name = 'Name is required.'
  if (!f.brand.trim()) e.brand = 'Brand is required.'
  if (!f.model.trim()) e.model = 'Model is required.'
  if (f.desc.trim().length < 10) e.desc = 'Add a short description (10+ characters).'
  if (!(+f.rate > 0) || +f.rate > 5000) e.rate = 'Enter a rate between ₱1 and ₱5,000.'
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  const submit = () => {
    setTried(true)
    if (Object.keys(e).length) return
    saveCar({ id: f.id, name: f.name.trim(), brand: f.brand.trim(), model: f.model.trim(), category: f.category, scale: f.scale, desc: f.desc.trim(), rate: +f.rate, condition: f.condition, base: f.base, photos: existing?.photos ?? [] }, !existing)
    go(`/car/${f.id}`)
  }
  const show = (k: string) => (tried ? e[k] : undefined)
  return (
    <>
      <button onClick={() => go(existing ? `/car/${id}` : '/cars')} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Back</button>
      <PageHeader eyebrow="RC Cars" title={existing ? `Edit ${existing.name}` : 'Add car'} />
      <Card className="max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Asset ID" value={f.id} onChange={(x) => set('id', x.target.value.toUpperCase())} disabled={!!existing} error={show('id')} hint="Printed on the car’s sticker" />
          <TextField label="Name" value={f.name} onChange={(x) => set('name', x.target.value)} error={show('name')} />
          <TextField label="Brand" value={f.brand} onChange={(x) => set('brand', x.target.value)} error={show('brand')} />
          <TextField label="Model" value={f.model} onChange={(x) => set('model', x.target.value)} error={show('model')} />
          <Field label="Category">{(a) => <Select {...a} value={f.category} onChange={(x) => set('category', x.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
          <Field label="Scale">{(a) => <Select {...a} value={f.scale} onChange={(x) => set('scale', x.target.value)}>{['1/8', '1/10', '1/16', '1/18'].map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
          <Field className="sm:col-span-2" label="Description" error={show('desc')}>{(a) => <Textarea {...a} value={f.desc} onChange={(x) => set('desc', x.target.value)} />}</Field>
          <TextField label="Hourly rate (₱)" type="number" value={f.rate} onChange={(x) => set('rate', x.target.value)} error={show('rate')} hint={`Default ${peso(settings.carRate)} from Settings → Pricing`} />
          <Field label="Condition">{(a) => <Select {...a} value={f.condition} onChange={(x) => set('condition', x.target.value)}><option>Good</option><option>Minor wear</option><option>Damaged</option></Select>}</Field>
          <Field label="Status" hint={f.base === 'Maintenance' || f.base === 'Damaged' || f.base === 'Inactive' ? 'Not rentable' : undefined}>{(a) => <Select {...a} value={f.base} onChange={(x) => set('base', x.target.value)}><option>Available</option><option>Maintenance</option><option>Damaged</option><option>Inactive</option></Select>}</Field>
        </div>
        {tried && Object.keys(e).length > 0 && <div className="mt-5"><Callout tone="red" title={`Fix ${Object.keys(e).length} field${Object.keys(e).length > 1 ? 's' : ''} to continue`} /></div>}
        <div className="mt-6 flex gap-2"><Button variant="primary" onClick={submit}>{existing ? 'Save changes' : 'Add car'}</Button><Button variant="ghost" onClick={() => go(existing ? `/car/${id}` : '/cars')}>Cancel</Button></div>
        {!existing && <p className="mt-4 flex items-center gap-2 text-xs text-mute"><AlertTriangle size={13} /> Photos can be uploaded from the car page after saving.</p>}
      </Card>
    </>
  )
}

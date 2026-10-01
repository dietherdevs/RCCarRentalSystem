import { useState, type ReactNode } from 'react'
import { Badge, Button, Callout, Card, Confirm, Countdown, Drawer, Empty, ErrorState, Field, IconButton, Input, KV, Modal, PageHeader, Segmented, Select, Skeleton, SkeletonRows, Stat, StatusBadge, Switch, TONE, STATUS_TONE, TableWrap, Tabs, Textarea, TextField, cx, td, th, type Tone } from '../components/ui'
import { MethodPicker } from './Payments'
import { useApp } from '../lib/store'
import { CAR_STATUSES, PAY_STATUSES, peso, type PayMethod } from '../lib/data'
import { Plus, Settings } from 'lucide-react'

const Sec = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="mb-10 scroll-mt-20">
    <h2 className="display mb-4 border-b border-ink pb-2 text-2xl">{title}</h2>
    {children}
  </section>
)
const COLORS = [['paper', '#f2f2ef'], ['surface', '#ffffff'], ['ink', '#0d0d0f'], ['ink-2', '#34343a'], ['mute', '#5c5c63'], ['line', '#d9d9d3'], ['accent', '#d63a0b'], ['accent-soft', '#fde6dd']]

export default function DesignSystem() {
  const { toast } = useApp()
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [tab, setTab] = useState('a')
  const [seg, setSeg] = useState('day')
  const [sw, setSw] = useState(true)
  const [m, setM] = useState<PayMethod>('Cash')
  return (
    <>
      <PageHeader eyebrow="System" title="Design system" sub="Tokens and components used across every screen. Swiss grid, ink on paper, one signal orange." />
      <nav className="mb-8 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Sections">
        {['color', 'status', 'type', 'space', 'buttons', 'forms', 'data', 'feedback', 'overlays', 'blocks'].map((s) => <a key={s} href={`#/design`} onClick={(e) => { e.preventDefault(); document.getElementById(s)?.scrollIntoView({ behavior: 'smooth' }) }} className="min-h-10 rounded-full border border-ink/25 px-4 py-2 capitalize hover:border-ink">{s}</a>)}
      </nav>

      <Sec id="color" title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map(([n, v]) => <div key={n} className="overflow-hidden rounded-[6px] border border-line"><div className="h-16" style={{ background: v }} /><div className="bg-surface p-2.5 text-xs"><b>{n}</b><p className="num text-mute">{v}</p></div></div>)}
        </div>
      </Sec>

      <Sec id="status" title="Status colors">
        {[['Car status', CAR_STATUSES], ['Rental status', ['Upcoming', 'Active', 'Overdue', 'Returned', 'Cancelled']], ['Payment status', PAY_STATUSES]].map(([t, l]) => (
          <div key={t as string} className="mb-4"><p className="eyebrow mb-2">{t as string}</p><div className="flex flex-wrap gap-2">{(l as string[]).map((s) => <StatusBadge key={s} status={s} />)}</div></div>
        ))}
        <p className="eyebrow mb-2">Tones</p>
        <div className="flex flex-wrap gap-2">{(Object.keys(TONE) as Tone[]).map((t) => <Badge key={t} tone={t} dot>{t}</Badge>)}</div>
        <p className="mt-3 text-xs text-mute">{Object.keys(STATUS_TONE).length} statuses mapped. Status is always shown with text, never color alone.</p>
      </Sec>

      <Sec id="type" title="Typography">
        <div className="space-y-3">
          <p className="display text-[56px] leading-none">Display 56</p>
          <p className="display text-[38px]">Page title 38</p>
          <p className="display text-2xl">Section 24</p>
          <p className="text-base">Body 16: Archivo, wide-width axis for headlines, normal for text.</p>
          <p className="text-sm text-mute">Secondary 14</p>
          <p className="eyebrow">Eyebrow label</p>
          <p className="num text-lg">₱1,234.00 · 13:20 · RC-004 (DM Mono, tabular)</p>
        </div>
      </Sec>

      <Sec id="space" title="Spacing & radius">
        <div className="flex flex-wrap items-end gap-4">{[4, 8, 12, 16, 24, 32, 48].map((s) => <div key={s} className="text-center text-xs"><div className="bg-accent" style={{ width: s, height: s }} /><span className="num">{s}</span></div>)}</div>
        <div className="mt-4 flex gap-4 text-xs"><div className="size-16 rounded-[4px] border border-ink grid place-items-center">4px</div><div className="size-16 rounded-[6px] border border-ink grid place-items-center">6px</div><div className="size-16 rounded-full border border-ink grid place-items-center">full</div></div>
        <p className="mt-3 text-xs text-mute">Minimum touch target 44px. Hairline borders, no shadows.</p>
      </Sec>

      <Sec id="buttons" title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button><Button>Secondary</Button><Button variant="dark">Dark</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button><Button disabled>Disabled</Button><Button size="sm">Small</Button><Button size="lg" variant="primary"><Plus size={16} /> Large</Button>
          <IconButton label="Settings"><Settings size={18} /></IconButton>
        </div>
      </Sec>

      <Sec id="forms" title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Text input" placeholder="Placeholder" />
          <TextField label="With error" defaultValue="abc" error="This field has a problem." />
          <TextField label="Disabled" disabled defaultValue="Locked" />
          <Field label="Select">{(a) => <Select {...a}><option>Option one</option><option>Option two</option></Select>}</Field>
          <Field label="Date & time picker">{(a) => <Input {...a} type="datetime-local" />}</Field>
          <Field label="Textarea">{(a) => <Textarea {...a} />}</Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-6">
          <Segmented label="Range" value={seg} onChange={setSeg} options={[{ v: 'day', l: 'Day' }, { v: 'week', l: 'Week' }]} />
          <Switch label="Switch" checked={sw} onChange={() => setSw(!sw)} />
        </div>
        <div className="mt-5"><p className="eyebrow mb-2">Payment method picker</p><MethodPicker value={m} onChange={setM} /></div>
      </Sec>

      <Sec id="data" title="Cards, stats, tabs, tables">
        <div className="mb-5 grid gap-3 sm:grid-cols-3"><Stat label="Stat card" value="₱2,400" tone="orange" sub="Helper text" /><Stat label="Clickable" value="12" onClick={() => toast('Stat clicked')} /><Card><p className="eyebrow">Card</p><dl><KV k="Key" v="Value" /><KV k="Rate" v={peso(200)} /></dl></Card></div>
        <Tabs value={tab} onChange={setTab} tabs={[{ v: 'a', l: 'First', n: 3 }, { v: 'b', l: 'Second' }]} />
        <TableWrap><thead><tr>{['Rental', 'Car', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead><tbody><tr><td className={cx(td, 'num')}>R-1042</td><td className={td}>Viper GT</td><td className={td}><StatusBadge status="Active" /></td></tr></tbody></TableWrap>
      </Sec>

      <Sec id="feedback" title="Feedback states">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card pad={false}><SkeletonRows rows={3} cols={3} /></Card>
          <Card><Empty title="Empty state" body="Explain what is missing and offer the next step." action={<Button>Primary action</Button>} /></Card>
          <ErrorState body="We could not load this. Check your connection." onRetry={() => toast('Retrying…', 'info')} />
          <div className="space-y-3">
            <Callout tone="red" title="Conflict">This car is already booked 2:00–3:00 PM.</Callout>
            <Callout tone="amber" title="Warning" /><Callout tone="green" title="Success" /><Callout tone="blue" title="Info" />
            <div className="flex flex-wrap gap-2"><Button onClick={() => toast('Saved successfully')}>Success toast</Button><Button onClick={() => toast('Something failed', 'err')}>Error toast</Button><Skeleton className="h-11 w-32" /></div>
          </div>
        </div>
      </Sec>

      <Sec id="overlays" title="Modal, drawer, confirm">
        <div className="flex flex-wrap gap-3"><Button onClick={() => setModal(true)}>Modal</Button><Button onClick={() => setDrawer(true)}>Drawer</Button><Button variant="danger" onClick={() => setConfirm(true)}>Confirm dialog</Button></div>
        {modal && <Modal title="Example modal" onClose={() => setModal(false)} footer={<><Button onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" onClick={() => setModal(false)}>Save</Button></>}><p className="text-sm">Dialogs trap focus, close on Escape, and keep actions in a footer.</p></Modal>}
        {drawer && <Drawer title="Example drawer" sub="R-1042 · Viper GT" onClose={() => setDrawer(false)}><dl><KV k="Start" v="1:00 PM" /><KV k="End" v="3:00 PM" /></dl></Drawer>}
        {confirm && <Confirm danger title="Delete this?" body="This action cannot be undone." confirmLabel="Delete" onConfirm={() => toast('Deleted')} onClose={() => setConfirm(false)} />}
      </Sec>

      <Sec id="blocks" title="Timeline block & countdown">
        <div className="overflow-x-auto"><div className="relative h-16 w-[480px] border border-line bg-[repeating-linear-gradient(90deg,transparent_0,transparent_95px,#d9d9d3_95px,#d9d9d3_96px)]">
          <div className="absolute left-24 top-2 h-12 w-48 rounded-[3px] bg-ink p-1.5 text-xs text-white"><b>Customer name</b><p className="num opacity-80">1:00–3:00 PM</p></div>
          <div className="absolute left-[310px] top-2 h-12 w-24 rounded-[3px] bg-accent-soft p-1.5 text-xs"><b>Upcoming</b></div>
          <div className="absolute inset-y-0 left-16 w-0.5 bg-accent" />
        </div></div>
        <p className="num mt-4 text-3xl"><Countdown end={Date.now() + 5400000} /></p>
      </Sec>
    </>
  )
}

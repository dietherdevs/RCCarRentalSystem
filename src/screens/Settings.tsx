import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, Lock, Plus } from 'lucide-react'
import { Badge, Button, Callout, Card, Empty, Field, Input, Modal, PageHeader, SectionTitle, Select, SkeletonRows, Switch, TableWrap, Tabs, TextField, cx, td, th, useFakeLoad } from '../components/ui'
import { useApp } from '../lib/store'
import { ACTIONS, billedMinutes, carPrice, fmtDT, peso, type Role, type Settings } from '../lib/data'

function SettingsTabs({ active }: { active: string }) {
  const { go, can } = useApp()
  const tabs = [{ v: 'pricing', l: 'Pricing' }, ...(can('users.manage') ? [{ v: 'users', l: 'Users' }, { v: 'permissions', l: 'Permissions' }] : []), { v: 'business', l: 'Business' }, ...(can('audit.view') ? [{ v: 'audit', l: 'Audit log' }] : [])]
  return <Tabs value={active} onChange={(v) => go(`/settings/${v}`)} tabs={tabs} />
}
function Locked({ children }: { children: ReactNode }) {
  return <Callout tone="amber" title="Read only for your role">{children}</Callout>
}

export function PricingSettings() {
  const { settings, saveSettings, can } = useApp()
  const edit = can('settings.pricing')
  const [f, setF] = useState({ carRate: String(settings.carRate), trackPrice: String(settings.trackPrice), minUnit: String(settings.minUnit), rounding: settings.rounding })
  const [confirm, setConfirm] = useState(false)
  const [tried, setTried] = useState(false)
  const e = {
    carRate: !(+f.carRate > 0) ? 'Enter a rate above ₱0.' : '',
    trackPrice: !(+f.trackPrice >= 0) || f.trackPrice === '' ? 'Enter 0 or more.' : '',
  }
  const next: Settings = { ...settings, carRate: +f.carRate, trackPrice: +f.trackPrice, minUnit: +f.minUnit, rounding: f.rounding }
  const dirty = JSON.stringify([settings.carRate, settings.trackPrice, settings.minUnit, settings.rounding]) !== JSON.stringify([next.carRate, next.trackPrice, next.minUnit, next.rounding])
  const ex = [60, 90, 100]
  return (
    <>
      <PageHeader eyebrow="Settings" title="Pricing" sub="Car rental and track access are separate products with separate prices." />
      <SettingsTabs active="pricing" />
      {!edit && <div className="mb-5"><Locked>Only Admins can change pricing. Current values are shown below.</Locked></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="space-y-5">
          <fieldset disabled={!edit} className="grid gap-4 sm:grid-cols-2">
            <TextField label="Car rental rate (₱ per hour, per car)" type="number" value={f.carRate} onChange={(x) => setF({ ...f, carRate: x.target.value })} error={tried ? e.carRate : undefined} />
            <TextField label="Track access price (₱, unlimited)" type="number" value={f.trackPrice} onChange={(x) => setF({ ...f, trackPrice: x.target.value })} error={tried ? e.trackPrice : undefined} />
            <Field label="Minimum rental unit">{(a) => <Select {...a} value={f.minUnit} onChange={(x) => setF({ ...f, minUnit: x.target.value })}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option></Select>}</Field>
            <Field label="Partial-hour rounding" hint="How time beyond a full unit is billed.">{(a) => <Select {...a} value={f.rounding} onChange={(x) => setF({ ...f, rounding: x.target.value as Settings['rounding'] })}><option value="up">Round up to next unit</option><option value="nearest">Round to nearest unit</option><option value="down">Round down</option></Select>}</Field>
          </fieldset>
          {edit && <Button variant="primary" disabled={!dirty} onClick={() => { setTried(true); if (!Object.values(e).some(Boolean)) setConfirm(true) }}>Save pricing</Button>}
        </Card>
        <Card className="self-start">
          <SectionTitle>Live preview</SectionTitle>
          <ul className="num space-y-2 text-sm">
            {ex.map((m) => <li key={m} className="flex justify-between"><span>{m} min rental</span><b>{peso(carPrice(m, next.carRate, next))} <span className="font-normal text-mute">({billedMinutes(m, next)} min billed)</span></b></li>)}
            <li className="flex justify-between border-t border-line pt-2"><span>+ Track access</span><b>{peso(next.trackPrice)}</b></li>
            <li className="flex justify-between"><span>2 hrs + track</span><b>{peso(carPrice(120, next.carRate, next) + next.trackPrice)}</b></li>
          </ul>
        </Card>
      </div>
      {confirm && (
        <Modal title="Apply new pricing?" onClose={() => setConfirm(false)} footer={<><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="primary" onClick={() => { saveSettings(next); setConfirm(false) }}>Apply</Button></>}>
          <p className="text-sm">New rentals use these prices. Existing bookings keep their price. The change is written to the audit log.</p>
          <p className="num mt-3 flex items-center gap-2 text-sm"><b>{peso(settings.carRate)}/hr · {peso(settings.trackPrice)}</b><ArrowRight size={14} /><b>{peso(next.carRate)}/hr · {peso(next.trackPrice)}</b></p>
        </Modal>
      )}
    </>
  )
}

export function BusinessSettings() {
  const { settings, saveSettings, can } = useApp()
  const edit = can('settings.pricing')
  const [f, setF] = useState(settings)
  return (
    <>
      <PageHeader eyebrow="Settings" title="Business" />
      <SettingsTabs active="business" />
      {!edit && <div className="mb-5"><Locked>Business settings can only be changed by an Admin.</Locked></div>}
      <Card className="max-w-3xl">
        <fieldset disabled={!edit} className="grid gap-4 sm:grid-cols-2">
          <TextField label="Business name" value={f.business} onChange={(x) => setF({ ...f, business: x.target.value })} />
          <TextField label="Opening hours" value={f.hours} onChange={(x) => setF({ ...f, hours: x.target.value })} />
          <Field label="Branch" hint="Single default branch. Reserved for future multi-branch support.">{(a) => <Select {...a} value={f.branch} onChange={(x) => setF({ ...f, branch: x.target.value })}><option>{settings.branch}</option></Select>}</Field>
          <TextField label="Return reminder (minutes before end)" type="number" value={f.returnAlertMins} onChange={(x) => setF({ ...f, returnAlertMins: +x.target.value })} />
          <TextField label="Max photo size (MB)" type="number" min={1} max={20} value={f.maxPhotoMB} onChange={(x) => setF({ ...f, maxPhotoMB: +x.target.value })} />
        </fieldset>
        {edit && <Button className="mt-5" variant="primary" onClick={() => saveSettings(f)}>Save business settings</Button>}
      </Card>
    </>
  )
}

export function UsersSettings() {
  const { users, can, addUser, toggleUser } = useApp()
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ name: '', email: '', role: 'Staff' as Role })
  const [tried, setTried] = useState(false)
  const loading = useFakeLoad('users', 400)
  if (!can('users.manage')) return <Card><Empty icon={<Lock size={22} />} title="Admins only" body="User management is hidden for your role." /></Card>
  const e = { name: f.name.trim().length < 2 ? 'Enter a name.' : '', email: !/^\S+@\S+\.\S+$/.test(f.email) ? 'Enter a valid email.' : '' }
  return (
    <>
      <PageHeader eyebrow="Settings" title="Users"><Button variant="primary" onClick={() => setAdd(true)}><Plus size={16} /> Add user</Button></PageHeader>
      <SettingsTabs active="users" />
      {loading ? <Card pad={false}><SkeletonRows rows={5} cols={5} /></Card> : (
        <TableWrap>
          <thead><tr>{['Name', 'Email', 'Role', 'Last active', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}><td className={cx(td, 'font-semibold')}>{u.name}</td><td className={td}>{u.email}</td><td className={td}><Badge tone={u.role === 'Admin' ? 'orange' : 'blue'}>{u.role}</Badge></td><td className={cx(td, 'text-mute')}>{u.last || '—'}</td>
              <td className={td}><Switch label={`${u.name} active`} checked={u.active} onChange={() => toggleUser(u.id)} /></td></tr>))}</tbody>
        </TableWrap>
      )}
      {add && (
        <Modal title="Add user" onClose={() => setAdd(false)} footer={<><Button onClick={() => setAdd(false)}>Cancel</Button><Button variant="primary" onClick={() => { setTried(true); if (Object.values(e).some(Boolean)) return; addUser(f); setAdd(false); setF({ name: '', email: '', role: 'Staff' }); setTried(false) }}>Create user</Button></>}>
          <div className="space-y-4">
            <TextField label="Full name" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} error={tried ? e.name : undefined} />
            <TextField label="Email" type="email" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} error={tried ? e.email : undefined} />
            <Field label="Role">{(a) => <Select {...a} value={f.role} onChange={(x) => setF({ ...f, role: x.target.value as Role })}><option>Admin</option><option>Staff</option></Select>}</Field>
          </div>
        </Modal>
      )}
    </>
  )
}

export function PermissionsMatrix() {
  const { perms, togglePerm, can } = useApp()
  if (!can('users.manage')) return <Card><Empty icon={<Lock size={22} />} title="Admins only" body="Permissions are hidden for your role." /></Card>
  const roles: Role[] = ['Admin', 'Staff']
  return (
    <>
      <PageHeader eyebrow="Settings" title="Permissions" sub="Changes apply to Staff accounts the next time they load the app." />
      <SettingsTabs active="permissions" />
      <TableWrap>
        <thead><tr><th className={th}>Action</th>{roles.map((r) => <th key={r} className={cx(th, 'w-28 text-center')}>{r}</th>)}</tr></thead>
        <tbody>{ACTIONS.map((a) => (
          <tr key={a.key}><td className={td}>{a.label}<span className="num block text-[11px] text-mute">{a.key}</span></td>
            {roles.map((r) => (
              <td key={r} className="px-4 py-2 text-center">
                {r === 'Admin' ? <span className="inline-flex items-center gap-1 text-xs text-mute"><Lock size={12} /><Check size={14} /></span> : <Switch label={`${r}: ${a.label}`} checked={perms[r][a.key]} onChange={() => togglePerm(r, a.key)} />}
              </td>))}</tr>))}</tbody>
      </TableWrap>
      <p className="mt-3 text-xs text-mute">Admin permissions are locked so the shop can never lock itself out.</p>
    </>
  )
}

export function AuditLog() {
  const { audit, can } = useApp()
  const [q, setQ] = useState('')
  const loading = useFakeLoad('audit', 400)
  if (!can('audit.view')) return <Card><Empty icon={<Lock size={22} />} title="Admins only" body="The audit log is hidden for your role." /></Card>
  const list = audit.filter((a) => (a.action + a.entity + a.user + a.before + a.after).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.at - a.at)
  return (
    <>
      <PageHeader eyebrow="Settings" title="Audit log" sub="Who changed what, and when. Entries cannot be edited." />
      <SettingsTabs active="audit" />
      <Input aria-label="Filter audit log" className="mb-4 max-w-md" placeholder="Filter by user, action or entity" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? <Card pad={false}><SkeletonRows rows={6} cols={5} /></Card> : list.length === 0 ? <Card><Empty title="No entries" body="Nothing matches that filter." /></Card> : (
        <TableWrap>
          <thead><tr>{['When', 'User', 'Action', 'Entity', 'Before', 'After'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id}><td className={cx(td, 'num whitespace-nowrap text-xs')}>{fmtDT(a.at)}</td><td className={td}>{a.user} <Badge>{a.role}</Badge></td><td className={cx(td, 'font-semibold')}>{a.action}</td><td className={cx(td, 'num text-xs')}>{a.entity}</td>
              <td className={cx(td, 'max-w-[200px] bg-[#FFF5F4] text-xs')}>{a.before || '—'}</td><td className={cx(td, 'max-w-[200px] bg-[#EEF9F0] text-xs')}>{a.after || '—'}</td></tr>))}</tbody>
        </TableWrap>
      )}
    </>
  )
}

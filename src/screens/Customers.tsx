import { useState } from 'react'
import { ArrowLeft, Lock, Plus, Search, Users } from 'lucide-react'
import { Badge, Button, Card, Empty, Input, KV, Modal, PageHeader, SectionTitle, SkeletonRows, Stat, StatusBadge, TableWrap, TextField, cx, td, th, useFakeLoad } from '../components/ui'
import { useApp, paymentTotals } from '../lib/store'
import { fmtDate, fmtDT, fmtTime, maskEmail, maskPhone, peso } from '../lib/data'

function AddCustomer({ onClose }: { onClose: () => void }) {
  const { addCustomer, go } = useApp()
  const [f, setF] = useState({ name: '', phone: '', email: '', notes: '' })
  const [tried, setTried] = useState(false)
  const e = {
    name: f.name.trim().length < 2 ? 'Enter the customer’s name.' : '',
    phone: !/^[+\d][\d\s-]{6,}$/.test(f.phone.trim()) ? 'Enter a valid phone number.' : '',
    email: f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? 'Email format looks wrong.' : '',
  }
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  return (
    <Modal title="Add customer" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={async () => { setTried(true); if (Object.values(e).some(Boolean)) return; const c = await addCustomer(f); if (!c) return; onClose(); go(`/customer/${c.id}`) }}>Save customer</Button></>}>
      <div className="space-y-4">
        <TextField label="Full name" value={f.name} onChange={(x) => set('name', x.target.value)} error={tried ? e.name : undefined} />
        <TextField label="Phone" type="tel" value={f.phone} onChange={(x) => set('phone', x.target.value)} error={tried ? e.phone : undefined} placeholder="0917 555 0123" />
        <TextField label="Email (optional)" type="email" value={f.email} onChange={(x) => set('email', x.target.value)} error={tried ? e.email : undefined} />
        <TextField label="Notes (optional)" value={f.notes} onChange={(x) => set('notes', x.target.value)} />
      </div>
    </Modal>
  )
}

export function CustomersList() {
  const { customers, rentals, payments, can, go } = useApp()
  const [q, setQ] = useState('')
  const [add, setAdd] = useState(false)
  const loading = useFakeLoad('cust', 450)
  const contact = can('customers.contact')
  const list = customers.filter((c) => (c.name + c.id + (contact ? c.phone + c.email : '')).toLowerCase().includes(q.toLowerCase()))
  const stats = (id: string) => ({
    n: rentals.filter((r) => r.customerId === id && r.status !== 'Cancelled').length,
    owed: payments.filter((p) => p.customerId === id).reduce((s, p) => s + (['Cancelled', 'Refunded'].includes(p.status) ? 0 : paymentTotals(p).balance), 0),
  })
  return (
    <>
      <PageHeader eyebrow="People" title="Customers" sub={`${customers.length} customers`}>
        <Button variant="primary" onClick={() => setAdd(true)}><Plus size={16} /> Add customer</Button>
      </PageHeader>
      {!contact && <div className="mb-4 flex items-center gap-2 rounded-[4px] border border-line bg-surface p-3 text-xs"><Lock size={13} /> Phone and email are masked for your role. An Admin can grant access in Settings → Permissions.</div>}
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <Input aria-label="Search customers" className="pl-9" placeholder="Search by name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? <Card pad={false}><SkeletonRows rows={8} cols={5} /></Card> : list.length === 0 ? <Card><Empty icon={<Users size={22} />} title="No customers found" body="Try another name or add a new customer." action={<Button onClick={() => setAdd(true)}>Add customer</Button>} /></Card> : (
        <>
          <div className="hidden md:block">
            <TableWrap>
              <thead><tr>{['Customer', 'ID', 'Phone', 'Email', 'Rentals', 'Balance'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {list.map((c) => { const s = stats(c.id); return (
                  <tr key={c.id} className="cursor-pointer hover:bg-paper/60" onClick={() => go(`/customer/${c.id}`)}>
                    <td className={cx(td, 'font-semibold')}>{c.name}</td><td className={cx(td, 'num')}>{c.id}</td>
                    <td className={cx(td, 'num')}>{contact ? c.phone : maskPhone(c.phone)}</td><td className={td}>{contact ? c.email : maskEmail(c.email)}</td>
                    <td className={cx(td, 'num')}>{s.n}</td><td className={cx(td, 'num', s.owed > 0 && 'font-bold text-accent')}>{s.owed ? peso(s.owed) : '—'}</td>
                  </tr>) })}
              </tbody>
            </TableWrap>
          </div>
          <ul className="space-y-2 md:hidden">
            {list.map((c) => { const s = stats(c.id); return (
              <li key={c.id}><button onClick={() => go(`/customer/${c.id}`)} className="flex min-h-16 w-full items-center gap-3 rounded-[6px] border border-line bg-surface p-3 text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <span className="min-w-0 flex-1"><b className="block truncate">{c.name}</b><span className="num text-xs text-mute">{contact ? c.phone : maskPhone(c.phone)} · {s.n} rentals</span></span>
                {s.owed > 0 && <span className="num text-sm font-bold text-accent">{peso(s.owed)}</span>}
              </button></li>) })}
          </ul>
        </>
      )}
      {add && <AddCustomer onClose={() => setAdd(false)} />}
    </>
  )
}

export function CustomerProfile({ id }: { id: string }) {
  const { customerById, rentals, passes, payments, carById, can, go } = useApp()
  const c = customerById(id)
  const contact = can('customers.contact')
  if (!c) return <Card><Empty title="Customer not found" body={`No customer with ID ${id}.`} action={<Button onClick={() => go('/customers')}>All customers</Button>} /></Card>
  const rs = rentals.filter((r) => r.customerId === id).sort((a, b) => b.start - a.start)
  const ps = passes.filter((p) => p.customerId === id).sort((a, b) => b.date - a.date)
  const pays = payments.filter((p) => p.customerId === id).sort((a, b) => b.created - a.created)
  const live = pays.filter((p) => !['Cancelled', 'Refunded'].includes(p.status)).map(paymentTotals)
  const booked = live.reduce((s, t) => s + t.booked, 0)
  const paid = live.reduce((s, t) => s + t.paid, 0)
  return (
    <>
      <button onClick={() => go('/customers')} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Customers</button>
      <PageHeader eyebrow={`Customer ${c.id}`} title={c.name} sub={`Customer since ${fmtDate(c.joined)}`}>
        <Button variant="primary" onClick={() => go(`/rentals/new?customer=${c.id}`)}>New rental</Button>
      </PageHeader>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Rentals" value={rs.filter((r) => r.status !== 'Cancelled').length} />
        <Stat label="Track passes" value={ps.length} tone="teal" />
        <Stat label="Booked" value={peso(booked)} />
        <Stat label="Paid" value={peso(paid)} tone="green" sub={booked - paid > 0 ? `${peso(booked - paid)} outstanding` : 'Settled'} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <SectionTitle>Contact</SectionTitle>
          <dl className="divide-y divide-line-2">
            <KV k="Phone" v={<span className="num">{contact ? c.phone : maskPhone(c.phone)}</span>} />
            <KV k="Email" v={contact ? c.email : maskEmail(c.email)} />
            <KV k="Notes" v={c.notes || '—'} />
          </dl>
          {!contact && <p className="mt-3 flex items-center gap-2 text-xs text-mute"><Lock size={12} /> Masked: your role cannot view full contact details.</p>}
        </Card>
        <div className="min-w-0 space-y-6">
          <div>
            <SectionTitle>Rentals</SectionTitle>
            {rs.length === 0 ? <Card><Empty title="No rentals yet" body="Start one with New rental." /></Card> : (
              <TableWrap>
                <thead><tr>{['Rental', 'Car', 'Start', 'End', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{rs.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-paper/60" onClick={() => go(`/rental/${r.id}`)}>
                    <td className={cx(td, 'num font-medium')}>{r.id}</td><td className={td}>{carById(r.carId)?.name} <span className="num text-xs text-mute">{r.carId}</span></td>
                    <td className={cx(td, 'num whitespace-nowrap')}>{fmtDT(r.start)}</td><td className={cx(td, 'num whitespace-nowrap')}>{fmtTime(r.end)}</td><td className={td}><StatusBadge status={r.status} /></td>
                  </tr>))}</tbody>
              </TableWrap>
            )}
          </div>
          <div>
            <SectionTitle>Track access</SectionTitle>
            {ps.length === 0 ? <Card><p className="text-sm text-mute">No track passes.</p></Card> : (
              <ul className="divide-y divide-line-2 rounded-[6px] border border-line bg-surface">
                {ps.map((p) => <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm"><span className="num">{p.id} · {fmtDate(p.date)}</span><Badge tone="teal">{peso(p.price)}</Badge></li>)}
              </ul>
            )}
          </div>
          <div>
            <SectionTitle>Payments</SectionTitle>
            {pays.length === 0 ? <Card><p className="text-sm text-mute">No payments.</p></Card> : (
              <TableWrap>
                <thead><tr>{['Payment', 'Booked', 'Paid', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{pays.map((p) => { const t = paymentTotals(p); return <tr key={p.id}><td className={cx(td, 'num')}>{p.id}</td><td className={cx(td, 'num')}>{peso(t.booked)}</td><td className={cx(td, 'num')}>{peso(t.paid)}</td><td className={td}><StatusBadge status={p.status} /></td></tr> })}</tbody>
              </TableWrap>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

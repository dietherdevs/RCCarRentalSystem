import { useState } from 'react'
import { Lock, Receipt, Search } from 'lucide-react'
import {
  Button, Card, Confirm, Empty, Field, Input, Modal, PageHeader, SkeletonRows, Stat, StatusBadge, Tabs, TableWrap, TextField, cx, td, th, useFakeLoad,
} from '../components/ui'
import { useApp, paymentTotals } from '../lib/store'
import { PAY_STATUSES, fmtDT, peso, type PayMethod, type Payment } from '../lib/data'

export function MethodPicker({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) {
  return (
    <div role="radiogroup" aria-label="Payment method" className="flex flex-wrap gap-2">
      {(['Cash', 'Card (terminal)', 'Bank transfer'] as PayMethod[]).map((m) => (
        <button key={m} role="radio" aria-checked={value === m} onClick={() => onChange(m)} className={cx('min-h-11 rounded-[4px] border px-4 text-sm font-semibold', value === m ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-surface hover:border-ink')}>
          {m}
        </button>
      ))}
      {['GCash', 'Maya'].map((m) => (
        <button key={m} disabled aria-disabled className="flex min-h-11 items-center gap-1.5 rounded-[4px] border border-dashed border-ink/25 px-4 text-sm font-semibold text-mute">
          <Lock size={12} /> {m} <span className="text-[10px] uppercase tracking-wide">Coming soon</span>
        </button>
      ))}
    </div>
  )
}

export function RecordPaymentModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { recordPayment, customerById } = useApp()
  const t = paymentTotals(payment)
  const [amt, setAmt] = useState(t.balance)
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const err = tried && (!(amt > 0) ? 'Enter an amount above ₱0.' : amt > t.balance ? `Cannot exceed the balance of ${peso(t.balance)}.` : '')
  return (
    <Modal
      title={`Record payment · ${payment.id}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { setTried(true); if (amt > 0 && amt <= t.balance) { recordPayment(payment.id, amt, method, note || undefined); onClose() } }}>Save payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-mute">{customerById(payment.customerId)?.name} · booked {peso(t.booked)} · paid {peso(t.paid)} · <b className="text-ink">balance {peso(t.balance)}</b></p>
        <Field label="Amount received (₱)" error={err || undefined}>{(a) => <Input {...a} type="number" min={1} value={amt} onChange={(e) => setAmt(+e.target.value)} />}</Field>
        <div><p className="mb-2 text-[13px] font-semibold">Method</p><MethodPicker value={method} onChange={setMethod} /></div>
        <TextField label="Reference / note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-xs text-mute">New status: {amt >= t.balance ? 'Paid' : 'Partially Paid'}</p>
      </div>
    </Modal>
  )
}

function RefundModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { refundPayment } = useApp()
  const t = paymentTotals(payment)
  const max = t.paid - t.refunded
  const [amt, setAmt] = useState(max)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [tried, setTried] = useState(false)
  const err = tried && (!(amt > 0) || amt > max ? `Enter between ₱1 and ${peso(max)}.` : '')
  const rErr = tried && reason.trim().length < 3 ? 'A reason is required for the audit log.' : ''
  if (confirm)
    return <Confirm danger title="Issue refund?" confirmLabel={`Refund ${peso(amt)}`} body={`${peso(amt)} will be returned to the customer for ${payment.id}. This is recorded in the audit log and cannot be undone.`} onConfirm={() => { refundPayment(payment.id, amt, reason); onClose() }} onClose={() => setConfirm(false)} />
  return (
    <Modal title={`Refund · ${payment.id}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { setTried(true); if (amt > 0 && amt <= max && reason.trim().length >= 3) setConfirm(true) }}>Review refund</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-mute">Refundable: <b className="text-ink">{peso(max)}</b></p>
        <Field label="Refund amount (₱)" error={err || undefined}>{(a) => <Input {...a} type="number" value={amt} onChange={(e) => setAmt(+e.target.value)} />}</Field>
        <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} error={rErr || undefined} placeholder="e.g. Customer cancelled, car fault" />
      </div>
    </Modal>
  )
}

export default function Payments() {
  const { payments, customerById, can } = useApp()
  const [tab, setTab] = useState<'all' | (typeof PAY_STATUSES)[number]>('all')
  const [q, setQ] = useState('')
  const [rec, setRec] = useState<Payment | null>(null)
  const [ref, setRef] = useState<Payment | null>(null)
  const loading = useFakeLoad('pay' + tab, 400)
  const list = payments
    .filter((p) => (tab === 'all' || p.status === tab) && (p.id + customerById(p.customerId)?.name + p.lines.map((l) => l.ref).join()).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.created - a.created)
  const all = payments.map(paymentTotals)
  const booked = all.reduce((s, t, i) => s + (['Cancelled', 'Refunded'].includes(payments[i].status) ? 0 : t.booked), 0)
  const paid = all.reduce((s, t) => s + t.paid - t.refunded, 0)
  const bal = all.reduce((s, t) => s + t.balance, 0)
  return (
    <>
      <PageHeader eyebrow="Money" title="Payments" sub="Booked is what the customer owes for their rentals and track access. Paid is what has actually been received." />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Booked amount" value={peso(booked)} sub="Excl. cancelled / refunded" />
        <Stat label="Amount paid" value={peso(paid)} tone="green" sub="Net of refunds" />
        <Stat label="Outstanding balance" value={peso(bal)} tone="orange" sub={`${payments.filter((p) => p.status === 'Pending' || p.status === 'Partially Paid').length} open payments`} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ v: 'all', l: 'All', n: payments.length }, ...PAY_STATUSES.map((s) => ({ v: s, l: s, n: payments.filter((p) => p.status === s).length }))]} />
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <Input aria-label="Search payments" placeholder="Search payment ID, customer or rental" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? (
        <Card pad={false}><SkeletonRows rows={7} cols={6} /></Card>
      ) : list.length === 0 ? (
        <Card><Empty icon={<Receipt size={22} />} title={`No ${tab === 'all' ? '' : tab + ' '}payments`} body="Nothing matches this filter." action={<Button onClick={() => { setTab('all'); setQ('') }}>Show all</Button>} /></Card>
      ) : (
        <>
          <div className="hidden md:block">
            <TableWrap>
              <thead><tr>{['Payment', 'Customer', 'For', 'Booked', 'Paid', 'Balance', 'Status', ''].map((h) => <th key={h} className={cx(th, ['Booked', 'Paid', 'Balance'].includes(h) && 'text-right')}>{h}</th>)}</tr></thead>
              <tbody>
                {list.map((p) => {
                  const t = paymentTotals(p)
                  const open = t.balance > 0 && p.status !== 'Cancelled' && p.status !== 'Refunded'
                  return (
                    <tr key={p.id}>
                      <td className={cx(td, 'num font-medium')}>{p.id}<span className="block text-[11px] font-normal text-mute">{fmtDT(p.created)}</span></td>
                      <td className={td}>{customerById(p.customerId)?.name}</td>
                      <td className={cx(td, 'num text-xs')}>{p.lines.map((l) => <span key={l.ref} className={cx('mr-1 inline-block rounded-[3px] px-1.5 py-0.5', l.kind === 'track' ? 'bg-[#D8F2F2]' : 'bg-line-2')}>{l.ref}</span>)}</td>
                      <td className={cx(td, 'num text-right')}>{peso(t.booked)}</td>
                      <td className={cx(td, 'num text-right')}>{peso(t.paid)}{t.refunded > 0 && <span className="block text-[11px] text-[#5A27B8]">−{peso(t.refunded)} refunded</span>}</td>
                      <td className={cx(td, 'num text-right font-semibold', open && 'text-accent')}>{peso(t.balance)}</td>
                      <td className={td}><StatusBadge status={p.status} /></td>
                      <td className={cx(td, 'whitespace-nowrap text-right')}>
                        {open && can('payments.record') && <Button size="sm" onClick={() => setRec(p)}>Record</Button>}{' '}
                        {t.paid - t.refunded > 0 && p.status !== 'Refunded' && (can('payments.refund') ? <Button size="sm" variant="danger" onClick={() => setRef(p)}>Refund</Button> : <Button size="sm" variant="ghost" disabled title="Admins only"><Lock size={12} /> Refund</Button>)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </div>
          <ul className="space-y-3 md:hidden">
            {list.map((p) => {
              const t = paymentTotals(p)
              const open = t.balance > 0 && p.status !== 'Cancelled' && p.status !== 'Refunded'
              return (
                <li key={p.id} className="rounded-[6px] border border-line bg-surface p-4">
                  <div className="flex items-start justify-between"><div><p className="num text-sm font-semibold">{p.id}</p><p className="text-sm">{customerById(p.customerId)?.name}</p></div><StatusBadge status={p.status} /></div>
                  <div className="num mt-3 grid grid-cols-3 gap-2 border-t border-line-2 pt-3 text-xs">
                    <div><p className="eyebrow">Booked</p><p className="text-sm">{peso(t.booked)}</p></div>
                    <div><p className="eyebrow">Paid</p><p className="text-sm">{peso(t.paid)}</p></div>
                    <div><p className="eyebrow">Balance</p><p className={cx('text-sm font-bold', open && 'text-accent')}>{peso(t.balance)}</p></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {open && can('payments.record') && <Button size="sm" className="flex-1" onClick={() => setRec(p)}>Record payment</Button>}
                    {t.paid - t.refunded > 0 && p.status !== 'Refunded' && can('payments.refund') && <Button size="sm" variant="danger" onClick={() => setRef(p)}>Refund</Button>}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-mute"><Lock size={12} /> Refunds are Admin-only by default. GCash and Maya are reserved for a future release.</p>
      {rec && <RecordPaymentModal payment={rec} onClose={() => setRec(null)} />}
      {ref && <RefundModal payment={ref} onClose={() => setRef(null)} />}
    </>
  )
}

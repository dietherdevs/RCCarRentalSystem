import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, ImageOff, X, Inbox } from 'lucide-react'
import { fmtClock } from '../lib/data'
import { useApp, useLiveNow } from '../lib/store'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
  size?: 'md' | 'sm' | 'lg'
  loading?: boolean
}
export function Button({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-accent text-white hover:bg-accent-hi border-accent',
    dark: 'bg-ink text-white hover:bg-ink-2 border-ink',
    secondary: 'bg-surface text-ink border-ink/25 hover:border-ink hover:bg-paper',
    ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/5',
    danger: 'bg-surface text-[#B42318] border-[#B42318]/40 hover:bg-[#FEE4E2] hover:border-[#B42318]',
  }[variant]
  const s = { sm: 'min-h-9 px-3 text-[13px]', md: 'min-h-11 px-4 text-sm', lg: 'min-h-12 px-6 text-base' }[size]
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[4px] border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        v,
        s,
        className,
      )}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}
export function IconButton({ label, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...p}
      className={cx('inline-flex size-11 items-center justify-center rounded-[4px] hover:bg-ink/5', className)}
    >
      {children}
    </button>
  )
}

/* ---------- Badges & status ---------- */
export type Tone = 'green' | 'blue' | 'orange' | 'teal' | 'amber' | 'red' | 'slate' | 'violet'
export const TONE: Record<Tone, { chip: string; solid: string; dot: string }> = {
  green: { chip: 'bg-[#DCF3E6] text-[#0A6240]', solid: 'bg-[#1F9D63] text-white', dot: 'bg-[#1F9D63]' },
  blue: { chip: 'bg-[#E2E8FF] text-[#2440B5]', solid: 'bg-[#3D5AE0] text-white', dot: 'bg-[#3D5AE0]' },
  orange: { chip: 'bg-[#FFE6DC] text-[#A32E08]', solid: 'bg-[#D63A0B] text-white', dot: 'bg-[#D63A0B]' },
  teal: { chip: 'bg-[#D8F2F2] text-[#0B5E62]', solid: 'bg-[#13878D] text-white', dot: 'bg-[#13878D]' },
  amber: { chip: 'bg-[#FFF0C7] text-[#7A4D00]', solid: 'bg-[#E3A008] text-ink', dot: 'bg-[#E3A008]' },
  red: { chip: 'bg-[#FDE0DE] text-[#A1160D]', solid: 'bg-[#C8281C] text-white', dot: 'bg-[#C8281C]' },
  slate: { chip: 'bg-[#E6E6E1] text-[#3F3F46]', solid: 'bg-[#6B6B73] text-white', dot: 'bg-[#6B6B73]' },
  violet: { chip: 'bg-[#EBE2FF] text-[#5A27B8]', solid: 'bg-[#7C4DDB] text-white', dot: 'bg-[#7C4DDB]' },
}
export const STATUS_TONE: Record<string, Tone> = {
  Available: 'green',
  Reserved: 'blue',
  'Active Rental': 'orange',
  Returned: 'teal',
  Maintenance: 'amber',
  Damaged: 'red',
  Inactive: 'slate',
  Upcoming: 'blue',
  Active: 'orange',
  Overdue: 'red',
  Cancelled: 'slate',
  Pending: 'blue',
  Paid: 'green',
  'Partially Paid': 'amber',
  Refunded: 'violet',
}
export function Badge({ tone = 'slate', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] px-2 py-[3px] text-xs font-semibold', TONE[tone].chip, className)}>
      {dot && <span className={cx('size-1.5 rounded-full', TONE[tone].dot)} />}
      {children}
    </span>
  )
}
export const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={STATUS_TONE[status] ?? 'slate'} dot>
    {status}
  </Badge>
)

/* ---------- Form fields ---------- */
const ctl =
  'w-full min-h-11 rounded-[4px] border border-ink/30 bg-surface px-3 text-sm text-ink placeholder:text-mute/80 hover:border-ink focus:border-ink focus:outline-2 focus:outline-offset-1 focus:outline-ink disabled:bg-paper disabled:text-mute aria-[invalid=true]:border-[#B42318] aria-[invalid=true]:bg-[#FFF5F4]'
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  children: (p: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  className?: string
}) {
  const id = useId()
  const dId = `${id}-d`
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || hint ? dId : undefined })}
      {(error || hint) && (
        <p id={dId} className={cx('text-xs', error ? 'font-medium text-[#B42318]' : 'text-mute')} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(ctl, className)} />
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(ctl, 'pr-8', className)} />
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(ctl, 'min-h-24 py-2.5', className)} />
)
export function TextField({ label, hint, error, className, ...p }: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(a) => <Input {...a} {...p} />}
    </Field>
  )
}
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[4px] border border-ink/30 bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cx(
            'min-h-10 rounded-[3px] px-3.5 text-[13px] font-semibold transition-colors',
            value === o.v ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/5',
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cx(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-40',
        checked ? 'border-ink bg-ink' : 'border-ink/30 bg-surface',
      )}
    >
      <span className={cx('absolute size-5 rounded-full transition-all', checked ? 'left-[24px] bg-white' : 'left-[3px] bg-ink/60')} />
    </button>
  )
}

/* ---------- Layout ---------- */
export const Card = ({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) => (
  <section className={cx('rounded-[6px] border border-line bg-surface', pad && 'p-4 sm:p-5', className)}>{children}</section>
)
export function PageHeader({ eyebrow, title, children, sub }: { eyebrow?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-[28px] sm:text-[38px]">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-sm text-mute">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.06em]">{children}</h2>
      {right}
    </div>
  )
}
export function Stat({ label, value, sub, tone, onClick, big }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; big?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'relative rounded-[6px] border border-line bg-surface p-4 text-left',
        onClick && 'transition-colors hover:border-ink',
      )}
    >
      {tone && <span className={cx('absolute left-0 top-4 h-8 w-[3px]', TONE[tone].dot)} />}
      <p className="eyebrow">{label}</p>
      <p className={cx('display num mt-2', big ? 'text-[40px]' : 'text-[32px]')} style={{ fontFamily: 'var(--font-sans)' }}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-mute">{sub}</p>}
    </Tag>
  )
}
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { v: T; l: string; n?: number }[] }) {
  return (
    <div role="tablist" className="scroll-quiet -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.v}
          role="tab"
          aria-selected={value === t.v}
          onClick={() => onChange(t.v)}
          className={cx(
            'relative min-h-11 whitespace-nowrap px-3.5 text-sm font-semibold transition-colors',
            value === t.v ? 'text-ink' : 'text-mute hover:text-ink',
          )}
        >
          {t.l}
          {t.n !== undefined && <span className="num ml-1.5 text-xs text-mute">{t.n}</span>}
          {value === t.v && <span className="absolute inset-x-0 -bottom-px h-[3px] bg-accent" />}
        </button>
      ))}
    </div>
  )
}

/* ---------- Feedback ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />
}
export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-5" />
          ))}
        </div>
      ))}
    </div>
  )
}
export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[6px] border border-line bg-surface">
          <Skeleton className="h-40 rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
export function Empty({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-dashed border-ink/40 text-ink-2">
        {icon ?? <Inbox size={22} />}
      </div>
      <h3 className="display text-lg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-mute">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export function ErrorState({ title = 'Something went wrong', body, onRetry }: { title?: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#FDE0DE] text-[#A1160D]">
        <AlertTriangle size={22} />
      </div>
      <h3 className="display text-lg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-mute">{body}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
export function Callout({ tone = 'blue', title, children, action }: { tone?: Tone; title: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = tone === 'red' || tone === 'amber' ? AlertTriangle : tone === 'green' ? CheckCircle2 : Info
  return (
    <div role={tone === 'red' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-[4px] border-l-4 p-3.5', TONE[tone].chip, tone === 'red' ? 'border-[#C8281C]' : 'border-current')}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 text-[13px] opacity-90">{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  )
}
export function Toaster() {
  const { toasts, dismissToast } = useApp()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
      {toasts.map((t) => (
        <div key={t.id} className={cx('rise pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[4px] px-4 py-3 text-sm font-medium text-white shadow-xl', t.tone === 'err' ? 'bg-[#B42318]' : 'bg-ink')}>
          {t.tone === 'err' ? <AlertTriangle size={16} /> : t.tone === 'info' ? <Info size={16} /> : <CheckCircle2 size={16} className="text-[#6EE7A8]" />}
          <span className="flex-1">{t.msg}</span>
          <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="-mr-1 flex size-8 items-center justify-center">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------- Overlays ---------- */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [onClose])
}
export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEscape(onClose)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('rise relative flex max-h-[92vh] w-full flex-col rounded-t-[10px] bg-surface outline-none sm:rounded-[6px]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="display text-lg">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2">
            <X size={18} />
          </IconButton>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
export function Drawer({ title, sub, onClose, children, footer }: { title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title} className="slidein absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="display text-xl">{title}</h2>
            {sub && <div className="mt-1.5">{sub}</div>}
          </div>
          <IconButton label="Close panel" onClick={onClose} className="-mr-2 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap gap-2 border-t border-line p-4">{footer}</div>}
      </aside>
    </div>
  )
}
export function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  children,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Keep as is</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">{body}</p>
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  )
}

/* ---------- Media ---------- */
export function Photo({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [bad, setBad] = useState(false)
  return (
    <div className={cx('relative overflow-hidden bg-[#d9d9d2]', className)}>
      {src && !bad ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} className="size-full object-cover" />
      ) : (
        <div role="img" aria-label={alt} className="flex size-full flex-col items-center justify-center gap-1 text-mute">
          <ImageOff size={22} />
          <span className="text-xs">No photo</span>
        </div>
      )}
    </div>
  )
}

/* ---------- Live ---------- */
export function Countdown({ end, className }: { end: number; className?: string }) {
  const n = useLiveNow()
  const left = end - n
  const late = left < 0
  const soon = left < 30 * 60000
  return (
    <span className={cx('num font-medium', late ? 'text-[#B42318]' : soon ? 'text-accent' : 'text-ink', className)}>
      {late ? `+${fmtClock(-left)} over` : fmtClock(left)}
    </span>
  )
}

export function useFakeLoad(_key?: string, _ms?: number) {
  return useApp().loadState === 'loading'
}

export const th = 'px-4 py-2.5 text-left eyebrow font-medium whitespace-nowrap'
export const td = 'px-4 py-3 text-sm align-middle'
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-[6px] border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-line-2 [&_thead]:bg-paper/70">{children}</table>
    </div>
  )
}
export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  )
}

import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, CheckCircle2, Gauge, ShieldCheck } from 'lucide-react'
import { Button, Callout, TextField } from '../components/ui'
import { useApp } from '../lib/store'
import * as authApi from '../lib/api/auth'

function AuthFrame({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const brand = useApp().settings.business.toUpperCase()
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-accent p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[4px] bg-ink">
            <Gauge size={24} />
          </div>
          <span className="display text-xl">{brand}</span>
        </div>
        <div>
          <p className="eyebrow !text-white/75">Rental · Inventory · Track access</p>
          <h2 className="display mt-4 text-[88px] leading-[0.9]">
            Every car.
            <br />
            Every minute.
            <br />
            Accounted.
          </h2>
        </div>
        <div className="num flex gap-8 text-sm text-white/85">
          <span>₱200 / hr / car</span>
          <span>₱300 track access</span>
        </div>
        <svg aria-hidden className="absolute -right-24 -top-24 size-[420px] opacity-20" viewBox="0 0 100 100">
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx="50" cy="50" r={6 + i * 6} fill="none" stroke="#fff" strokeWidth="0.6" />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-[4px] bg-accent text-white">
              <Gauge size={22} />
            </div>
            <span className="display text-xl">{brand}</span>
          </div>
          <h1 className="display text-4xl">{title}</h1>
          <p className="mb-7 mt-3 text-sm text-mute">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function LoginScreen() {
  const { go } = useApp()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    setInfo('')
    if (!email.includes('@')) return setErr('Enter a valid email address.')
    if (mode === 'up' && !name.trim()) return setErr('Enter your name.')
    if (mode === 'up' && pw.length < 8) return setErr('Use at least 8 characters for your password.')
    setLoading(true)
    try {
      if (mode === 'in') {
        await authApi.signIn(email.trim(), pw)
      } else {
        const r = await authApi.signUp(name.trim(), email.trim(), pw)
        if (r.needsConfirm) {
          setInfo('Account created. Check your email to confirm it, then sign in.')
          setMode('in')
        }
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthFrame title={mode === 'in' ? 'Sign in' : 'Create account'} sub="Run the counter, the fleet and the track from one place.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {info && <Callout tone="green" title="Almost there">{info}</Callout>}
        {err && <Callout tone="red" title={mode === 'in' ? 'Sign-in failed' : 'Sign-up failed'}>{err}</Callout>}
        {mode === 'up' && <TextField label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => go('/forgot')} className="min-h-11 text-sm font-semibold text-accent underline underline-offset-4">
            Forgot password?
          </button>
          <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setInfo('') }} className="min-h-11 text-sm font-semibold underline underline-offset-4">
            {mode === 'in' ? 'Create an account' : 'I have an account'}
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-[4px] border border-dashed border-ink/30 p-3 text-xs text-mute" aria-label="Two-factor authentication placeholder">
          <ShieldCheck size={18} className="shrink-0" />
          <span>Two-factor authentication slot. Reserved for a future release; not active.</span>
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {loading ? (mode === 'in' ? 'Signing in…' : 'Creating…') : mode === 'in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </AuthFrame>
  )
}

export function ForgotScreen() {
  const { go } = useApp()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return setState('error')
    setState('loading')
    try {
      await authApi.requestPasswordReset(email.trim())
      setState('sent')
    } catch {
      setState('error')
    }
  }
  return (
    <AuthFrame title="Reset access" sub="We will email a reset link if the address belongs to an account.">
      <button onClick={() => go('/login')} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
        <ArrowLeft size={16} /> Back to sign in
      </button>
      {state === 'sent' ? (
        <div className="space-y-4">
          <Callout tone="green" title="Check your inbox">
            If {email} matches an account, a reset link is on its way.
          </Callout>
          <Button variant="dark" className="w-full" onClick={() => go('/login')}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {state === 'error' && <Callout tone="red" title="Could not send the link">Check the email address and try again.</Callout>}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={state === 'loading'}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthFrame>
  )
}

export function ResetScreen() {
  const { go } = useApp()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<{ pw?: string; pw2?: string }>({})
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const strength = [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n: typeof err = {}
    if (pw.length < 8) n.pw = 'Use at least 8 characters.'
    if (pw2 !== pw) n.pw2 = 'Passwords do not match.'
    setErr(n)
    if (Object.keys(n).length) return
    setState('loading')
    try {
      await authApi.setNewPassword(pw)
      setState('done')
    } catch (e2) {
      setErr({ pw: e2 instanceof Error ? e2.message : 'Could not update the password. Open the reset link from your email again.' })
      setState('idle')
    }
  }
  return (
    <AuthFrame title="New password" sub="Choose something you have not used elsewhere.">
      {state === 'done' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[#0A6240]">
            <CheckCircle2 size={22} /> <span className="font-semibold">Password updated</span>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => go('/')}>
            Continue
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <TextField label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} />
          <div aria-label={`Password strength ${strength} of 4`} className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? (strength < 3 ? 'bg-[#E3A008]' : 'bg-[#1F9D63]') : 'bg-line'}`} />
            ))}
          </div>
          <TextField label="Confirm password" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} error={err.pw2} />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={state === 'loading'}>
            Update password
          </Button>
        </form>
      )}
    </AuthFrame>
  )
}

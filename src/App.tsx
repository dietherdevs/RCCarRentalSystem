import { useState, type ReactNode } from 'react'
import {
  Bell,
  CalendarRange,
  CarFront,
  ChevronDown,
  Flag,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Plus,
  Receipt,
  BarChart3,
  Settings as Cog,
  Users,
  X,
  Wallet,
} from 'lucide-react'
import { AppProvider, useApp } from './lib/store'
import { Button, ErrorState, Toaster, cx } from './components/ui'
import { ForgotScreen, LoginScreen, ResetScreen } from './screens/Auth'
import Dashboard from './screens/Dashboard'
import NewRental from './screens/NewRental'
import Schedule from './screens/Schedule'
import { RentalDetail, RentalHistory, ReturnFlow, TodaysRentals } from './screens/Rentals'
import { CarDetail, CarForm, CarsList } from './screens/Cars'
import { TrackHistory, TrackToday } from './screens/Track'
import { CustomerProfile, CustomersList } from './screens/Customers'
import Payments from './screens/Payments'
import Reports from './screens/Reports'
import { AuditLog, BusinessSettings, PermissionsMatrix, PricingSettings, UsersSettings } from './screens/Settings'
import Portal from './screens/Portal'
import DesignSystem from './screens/DesignSystem'

interface NavItem {
  label: string
  to: string
  perm?: 'reports.view' | 'users.manage' | 'audit.view'
}
interface NavGroup {
  label: string
  to: string
  icon: ReactNode
  items?: NavItem[]
}
const NAV: NavGroup[] = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Rentals',
    to: '/rentals/today',
    icon: <CalendarRange size={18} />,
    items: [
      { label: "Today's Rentals", to: '/rentals/today' },
      { label: 'Schedule', to: '/rentals/schedule' },
      { label: 'Rental History', to: '/rentals/history' },
    ],
  },
  {
    label: 'RC Cars',
    to: '/cars',
    icon: <CarFront size={18} />,
    items: [
      { label: 'All Cars', to: '/cars' },
      { label: 'Available', to: '/cars/available' },
      { label: 'Rented', to: '/cars/rented' },
      { label: 'Maintenance', to: '/cars/maintenance' },
    ],
  },
  {
    label: 'Track',
    to: '/track/today',
    icon: <Flag size={18} />,
    items: [
      { label: "Today's Access", to: '/track/today' },
      { label: 'History', to: '/track/history' },
    ],
  },
  { label: 'Customers', to: '/customers', icon: <Users size={18} /> },
  { label: 'Payments', to: '/payments', icon: <Wallet size={18} /> },
  { label: 'Reports', to: '/reports', icon: <BarChart3 size={18} />, items: undefined },
  {
    label: 'Settings',
    to: '/settings/pricing',
    icon: <Cog size={18} />,
    items: [
      { label: 'Pricing', to: '/settings/pricing' },
      { label: 'Users', to: '/settings/users', perm: 'users.manage' },
      { label: 'Permissions', to: '/settings/permissions', perm: 'users.manage' },
      { label: 'Business Settings', to: '/settings/business' },
      { label: 'Audit Log', to: '/settings/audit', perm: 'audit.view' },
    ],
  },
]

function Brand({ light }: { light?: boolean }) {
  const { settings } = useApp()
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-[4px] bg-accent text-white">
        <Gauge size={20} />
      </div>
      <div className="leading-none">
        <p className={cx('display text-[17px]', light && 'text-white')}>{settings.business.toUpperCase().replace(' RC TRACK', '')}</p>
        <p className={cx('eyebrow mt-1', light && '!text-white/55')}>Rental · Track Ops</p>
      </div>
    </div>
  )
}

function useActive() {
  const { path } = useApp()
  return (to: string) => (to === '/' ? path === '/' : path === to || (to === '/cars' ? false : path.startsWith(to + '/')))
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { path, go, can, role, signOut } = useApp()
  const isActive = useActive()
  const [open, setOpen] = useState<string | null>(null)
  const groupOf = (g: NavGroup) => (g.items ?? []).some((i) => isActive(i.to) || path.startsWith(i.to.split('/').slice(0, 2).join('/')))
  const nav = (to: string) => {
    go(to)
    onNavigate?.()
  }
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV.filter((g) => g.label !== 'Reports' || can('reports.view')).map((g) => {
        const expanded = open === g.label || (open === null && groupOf(g))
        const activeGroup = g.items ? groupOf(g) : isActive(g.to)
        const items = g.items?.filter((i) => !i.perm || can(i.perm))
        return (
          <div key={g.label}>
            <button
              onClick={() => {
                if (items) setOpen(expanded ? '' : g.label)
                if (!items || !expanded) nav(g.to)
              }}
              aria-expanded={items ? expanded : undefined}
              className={cx(
                'flex min-h-11 w-full items-center gap-3 rounded-[4px] px-3 text-sm font-semibold transition-colors',
                activeGroup ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
              )}
            >
              <span className={activeGroup ? 'text-accent' : ''}>{g.icon}</span>
              <span className="flex-1 text-left">{g.label}</span>
              {items && <ChevronDown size={15} className={cx('transition-transform', expanded && 'rotate-180')} />}
            </button>
            {items && expanded && (
              <div className="ml-[22px] mt-0.5 border-l border-white/15 pb-1 pl-3">
                {items.map((i) => (
                  <button
                    key={i.to}
                    onClick={() => nav(i.to)}
                    aria-current={path === i.to ? 'page' : undefined}
                    className={cx(
                      'flex min-h-10 w-full items-center rounded-[4px] px-3 text-left text-[13px] font-medium transition-colors',
                      path === i.to ? 'text-accent' : 'text-white/60 hover:text-white',
                    )}
                  >
                    {i.label}
                    {role === 'Staff' && g.label === 'Settings' && (i.label === 'Pricing' || i.label === 'Business Settings') && (
                      <span className="ml-2 rounded-[2px] bg-white/10 px-1 text-[10px] uppercase text-white/60">view</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <div className="mt-4 border-t border-white/15 pt-4">
        <button onClick={() => nav('/design')} className="flex min-h-11 w-full items-center gap-3 rounded-[4px] px-3 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white">
          <Palette size={18} /> Design system
        </button>
        <button
          onClick={() => {
            void signOut()
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-[4px] px-3 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </nav>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { go, role, can, path, actor, settings } = useApp()
  const [drawer, setDrawer] = useState(false)
  const tabs = [
    { l: 'Home', to: '/', i: <LayoutDashboard size={20} /> },
    { l: 'Rentals', to: '/rentals/today', i: <CalendarRange size={20} />, m: '/rental' },
    { l: 'Cars', to: '/cars', i: <CarFront size={20} />, m: '/car' },
    { l: 'Track', to: '/track/today', i: <Flag size={20} />, m: '/track' },
  ]
  const isTab = (t: (typeof tabs)[number]) => (t.to === '/' ? path === '/' : path.startsWith(t.to.split('/').slice(0, 2).join('/')) || (t.m ? path.startsWith(t.m) : false))
  return (
    <div className="min-h-screen lg:pl-[264px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-ink px-4 py-5 lg:flex">
        <div className="mb-6 px-1">
          <Brand light />
        </div>
        <Button variant="primary" className="mb-5 w-full" onClick={() => go('/rentals/new')} disabled={!can('rentals.manage')}>
          <Plus size={18} /> New rental
        </Button>
        <div className="scroll-thin -mx-1 flex-1 overflow-y-auto px-1">
          <SideNav />
        </div>
        <div className="mt-3 border-t border-white/15 pt-3 text-xs text-white/55" title="Multiple branches can be added later; one default branch for now.">
          <p className="eyebrow !text-white/45">Branch</p>
          <p className="mt-1 text-sm font-semibold text-white/85">{settings.branch}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur sm:px-6 lg:px-8">
        <button aria-label="Open menu" onClick={() => setDrawer(true)} className="-ml-2 flex size-11 items-center justify-center lg:hidden">
          <Menu size={22} />
        </button>
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="flex-1" />
        <button aria-label="Notifications" className="relative flex size-11 items-center justify-center rounded-[4px] hover:bg-ink/5">
          <Bell size={19} />
        </button>
        <div className="hidden items-center gap-2.5 md:flex">
          <div className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{actor.split(' ').map((s) => s[0]).join('').slice(0, 2)}</div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">{actor}</p>
            <p className="text-xs text-mute">{role}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12">{children}</main>

      {/* mobile bottom tab bar */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {tabs.slice(0, 2).map((t) => (
          <TabBtn key={t.to} active={isTab(t)} onClick={() => go(t.to)} icon={t.i} label={t.l} />
        ))}
        <button
          aria-label="New rental"
          onClick={() => go('/rentals/new')}
          disabled={!can('rentals.manage')}
          className="relative -mt-5 flex flex-col items-center justify-center gap-0.5 disabled:opacity-40"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-4 ring-surface">
            <Plus size={26} />
          </span>
        </button>
        {tabs.slice(2).map((t) => (
          <TabBtn key={t.to} active={isTab(t)} onClick={() => go(t.to)} icon={t.i} label={t.l} />
        ))}
      </nav>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/55" onClick={() => setDrawer(false)} />
          <div className="slidein absolute inset-y-0 left-0 flex w-[300px] max-w-[88vw] flex-col bg-ink p-4" style={{ animationName: 'rise' }}>
            <div className="mb-5 flex items-center justify-between">
              <Brand light />
              <button aria-label="Close menu" onClick={() => setDrawer(false)} className="flex size-11 items-center justify-center text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SideNav onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={cx('flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold', active ? 'text-accent' : 'text-mute')}>
      {icon}
      {label}
    </button>
  )
}

function Router() {
  const { path, role, authed, can, configured, authReady, loadState, loadError, retry } = useApp()
  const seg = path.split('?')[0].split('/').filter(Boolean)
  const [a, b, c] = seg

  if (path === '/forgot') return <ForgotScreen />
  if (path === '/reset') return <ResetScreen />
  if (!configured) return <SetupNeeded />
  if (!authReady) return <p role="status" className="p-10 text-center text-sm text-mute">Loading…</p>
  if (path === '/login' || !authed) return <LoginScreen />

  if (role === 'Customer') {
    if (loadState === 'error') return <Shell><ErrorState title="Couldn't load data" body={loadError} onRetry={retry} /></Shell>
    return (
      <Shell>
        <Portal sub={a === 'portal' ? b : undefined} />
      </Shell>
    )
  }

  if (loadState === 'error') {
    return (
      <Shell>
        <ErrorState title="Couldn't load data" body={loadError} onRetry={retry} />
      </Shell>
    )
  }

  let view: ReactNode
  if (!a) view = <Dashboard />
  else if (a === 'rentals' && b === 'new') view = <NewRental />
  else if (a === 'rentals' && b === 'schedule') view = <Schedule />
  else if (a === 'rentals' && b === 'history') view = <RentalHistory />
  else if (a === 'rentals') view = <TodaysRentals />
  else if (a === 'rental' && c === 'return') view = <ReturnFlow id={b} />
  else if (a === 'rental') view = <RentalDetail id={b} />
  else if (a === 'cars' && b === 'new') view = <CarForm />
  else if (a === 'cars') view = <CarsList filter={b} />
  else if (a === 'car' && c === 'edit') view = <CarForm id={b} />
  else if (a === 'car') view = <CarDetail id={b} />
  else if (a === 'track' && b === 'history') view = <TrackHistory />
  else if (a === 'track') view = <TrackToday />
  else if (a === 'customers') view = <CustomersList />
  else if (a === 'customer') view = <CustomerProfile id={b} />
  else if (a === 'payments') view = <Payments />
  else if (a === 'reports') view = can('reports.view') ? <Reports /> : <Denied what="Reports" />
  else if (a === 'settings' && b === 'users') view = can('users.manage') ? <UsersSettings /> : <Denied what="Users" />
  else if (a === 'settings' && b === 'permissions') view = can('users.manage') ? <PermissionsMatrix /> : <Denied what="Permissions" />
  else if (a === 'settings' && b === 'audit') view = can('audit.view') ? <AuditLog /> : <Denied what="Audit Log" />
  else if (a === 'settings' && b === 'business') view = <BusinessSettings />
  else if (a === 'settings') view = <PricingSettings />
  else if (a === 'design') view = <DesignSystem />
  else view = <Denied what="This page" notFound />
  return <Shell>{view}</Shell>
}

function SetupNeeded() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="eyebrow">Setup</p>
      <h1 className="display mt-3 text-3xl">Connect Supabase</h1>
      <p className="mt-3 text-sm text-mute">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment (see <code>.env.example</code>), then reload.
      </p>
    </div>
  )
}

function Denied({ what, notFound }: { what: string; notFound?: boolean }) {
  const { go, role } = useApp()
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="eyebrow">{notFound ? '404' : 'Restricted'}</p>
      <h1 className="display mt-3 text-3xl">{notFound ? 'Nothing here' : `${what} is Admin-only`}</h1>
      <p className="mt-3 text-sm text-mute">
        {notFound ? 'That page does not exist.' : `You are signed in as ${role}. Ask an Admin for access, or have them adjust permissions.`}
      </p>
      <Button className="mt-6" variant="dark" onClick={() => go('/')}>
        Back to dashboard
      </Button>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Router />
      <Toaster />
    </AppProvider>
  )
}

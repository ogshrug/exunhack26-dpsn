import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BarChart3, LogOut, Menu, ScanFace, Wallet, ShoppingCart, User, X } from 'lucide-react'
import { useCart } from '../cart/CartContext'
import Thurible from './Thurible'
import { useAuth } from '../auth/AuthContext'
import AdminCode from './AdminCode'
import { prefetch, prefetchIdle } from '../lib/prefetch'

const LINKS = [
  { to: '/market', label: 'Market' },
  { to: '/chat', label: 'Chat' },
  { to: '/board', label: 'Board' },
  { to: '/sosumi', label: 'Sosumi' },
]

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-1.5 rounded-md font-mono text-[.72rem] uppercase tracking-[.12em] whitespace-nowrap transition-colors ${
    isActive ? 'bg-crimson/15 text-white ring-1 ring-crimson/50' : 'text-mist hover:text-white'
  }`

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center min-h-12 px-4 rounded-lg font-mono text-sm uppercase tracking-[.14em] ${
    isActive ? 'bg-crimson/15 text-white ring-1 ring-crimson/50' : 'text-mist active:bg-panel2'
  }`

function MenuItems() {
  const { profile, signOut } = useAuth()
  return (
    <>
      {profile && !profile.has_face && <Link to="/enroll" className="menu-item"><ScanFace size={15} />Add face ID</Link>}
      <Link to="/wallet" className="menu-item"><Wallet size={15} />Wallet</Link>
      {profile?.role === 'admin' && <Link to="/admin/economy" className="menu-item"><BarChart3 size={15} />Economy</Link>}
      {profile?.role === 'user' && <AdminCode />}
      <button type="button" className="menu-item" onClick={signOut}><LogOut size={15} />Sign out</button>
    </>
  )
}

function CartLink() {
  const { count } = useCart()
  return (
    <Link to="/checkout" aria-label={`Cart, ${count} items`} className="relative grid place-items-center w-10 h-10 rounded-lg bg-panel2 border border-line text-mist hover:text-white">
      <ShoppingCart size={17} />
      {count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-crimson text-white text-[.65rem] grid place-items-center">{count}</span>}
    </Link>
  )
}

function AccountMenu() {
  const { profile, balance } = useAuth()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); window.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={box} className="relative">
      <button className="grid place-items-center w-10 h-10 rounded-lg bg-crimson text-white" aria-label="Account menu" aria-expanded={open} aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}><User size={18} /></button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-64 card !p-2 z-40 shadow-2xl">
          <div className="px-3 py-2 border-b border-line mb-1">
            <div className="text-white text-sm">{profile?.handle}</div>
            <div className="label !text-[.6rem]">{profile?.role}{balance != null && ` · ◈ ${balance.toLocaleString()}`}</div>
          </div>
          <MenuItems />
        </div>
      )}
    </div>
  )
}

export default function Nav() {
  useEffect(() => { prefetchIdle() }, [])
  const { profile, balance } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="border-b border-line bg-ink/95 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 md:px-8 h-16">
        <Link to="/home" aria-label="Thuribles home" className="icon-tile !w-11 !h-11 !rounded-lg !p-1"><Thurible className="h-full" /></Link>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-panel border border-line overflow-x-auto">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={desktopLink} onMouseEnter={() => prefetch(l.to)} onFocus={() => prefetch(l.to)} onTouchStart={() => prefetch(l.to)}>{l.label}</NavLink>)}
        </nav>
        <div className="hidden md:flex ml-auto items-center gap-3">
          {balance != null && <Link to="/exchange" className="chip !text-[.75rem] !py-1.5 !px-3" title="Your balance. Click to convert to bits">◈ {balance.toLocaleString()}</Link>}
          <CartLink />
          <AccountMenu />
        </div>

        <div className="md:hidden ml-auto flex items-center gap-3">
          <CartLink />
          {balance != null && <Link to="/exchange" className="chip !text-[.7rem]">◈ {balance.toLocaleString()}</Link>}
          <button className="icon-tile !w-11 !h-11" onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-line bg-ink px-4 pb-5 pt-3 space-y-1 shadow-2xl">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={mobileLink} onTouchStart={() => prefetch(l.to)}>{l.label}</NavLink>)}
          <div className="pt-3 mt-2 border-t border-line">
            <div className="label px-3 pb-1">{profile?.handle} · {profile?.role}{balance != null && ` · ◈ ${balance.toLocaleString()}`}</div>
            <MenuItems />
          </div>
        </div>
      )}
    </header>
  )
}

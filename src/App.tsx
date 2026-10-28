import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { CartProvider } from './cart/CartContext'
import { RequireAdmin, RequireAuth } from './auth/guards'
import Home from './pages/Home'
import Market from './pages/Market'
import Chat from './pages/Chat'
import Board from './pages/Board'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })))
const Checkout = lazy(() => import('./pages/Checkout'))
const Enroll = lazy(() => import('./pages/Enroll'))
const Exchange = lazy(() => import('./pages/Exchange'))
const Sosumi = lazy(() => import('./pages/Sosumi'))
const Wallet = lazy(() => import('./pages/Wallet'))
const AdminEconomy = lazy(() => import('./pages/AdminEconomy'))

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 label label-crimson">loading…</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<RequireAuth />}>
              <Route path="/home" element={<Home />} />
              <Route path="/market" element={<Market />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/board" element={<Board />} />
              <Route path="/sosumi" element={<Sosumi />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/enroll" element={<Enroll />} />
              <Route path="/exchange" element={<Exchange />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route element={<RequireAdmin />}><Route path="/admin/economy" element={<AdminEconomy />} /></Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}

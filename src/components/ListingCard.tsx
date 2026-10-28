import { Link } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { Crosshair, Eye, FlaskConical, Link2 } from 'lucide-react'

export type Listing = {
  id: number; seller_id: string; category: 'contract' | 'substance' | 'hitman' | 'enslavement'; title: string; description: string
  price: number; game: string; target_character: string | null; status: 'open' | 'claimed' | 'completed'
  image_url: string; created_at: string; resale_price: number | null; claimed_by: string | null
}

const STATUS = {
  open: { label: 'Open', cls: 'chip-ok' },
  claimed: { label: 'Hit in place', cls: 'chip-warn' },
  completed: { label: 'Completed', cls: '' },
} as const
const ICON = { contract: Eye, hitman: Crosshair, substance: FlaskConical, enslavement: Link2 }
const PRICE_LABEL = { contract: 'Reward', hitman: 'Rate', substance: 'Price', enslavement: 'Task reward' }

type Actions = { meId?: string; hasFace?: boolean; onHire?: (l: Listing) => void; onAccept?: (l: Listing) => void; onProof?: (l: Listing) => void }

export default function ListingCard({ l, seller, meId, hasFace, onHire, onAccept, onProof }: { l: Listing; seller?: string } & Actions) {
  const cart = useCart()
  const inCart = cart.lines.find((x) => x.id === l.id)?.qty ?? 0
  const mine = l.seller_id === meId
  const noFace = hasFace === false
  const job = l.category === 'contract' || l.category === 'enslavement'
  const mineClaimed = job && l.claimed_by === meId
  const Icon = ICON[l.category]
  const st = STATUS[l.status]
  return (
    <article className="card card-hover !p-0 overflow-hidden flex flex-col group">
      <div className="relative aspect-[4/3] bg-ink overflow-hidden">
        <img src={l.image_url} alt={l.title} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className={`chip absolute top-3 left-3 backdrop-blur ${st.cls}`}>{st.label}</span>
        <span className="absolute top-3 right-3 icon-tile !w-8 !h-8 backdrop-blur !bg-black/50"><Icon size={14} /></span>
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div><div className="label !text-mist">{PRICE_LABEL[l.category]}</div>
            <div className="text-xl font-semibold text-white">◈ {Number(l.price).toLocaleString()}</div></div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-white font-semibold leading-snug">{l.title}</h3>
        <p className="label">{l.category === 'enslavement' ? l.game : 'Real world'}{l.target_character ? ` · target: ${l.target_character}` : ''}</p>
        {l.category === 'enslavement' && l.resale_price != null && (
          <p className="text-sm text-white">Resold to Sosumi for <span className="text-velvet-soft">◈ {Number(l.resale_price).toLocaleString()}</span></p>
        )}
        {l.description && <p className="text-sm text-mist line-clamp-2">{l.description}</p>}
        <div className="mt-auto pt-2 border-t border-line space-y-2">
          {seller && <p className="label">Posted by {seller}</p>}
          {l.category === 'hitman' && !mine && (noFace
            ? <Link to="/enroll" className="btn w-full" title="Face ID required">Face ID required to hire</Link>
            : <button className="btn btn-primary w-full" onClick={() => onHire?.(l)}>Hire</button>)}
          {l.category === 'substance' && (
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={() => cart.add(l.id)}>Add to cart</button>
              {inCart > 0 && <Link to="/checkout" className="btn" title="View cart">In cart: {inCart}</Link>}
            </div>
          )}
          {job && !mine && l.status === 'open' && (noFace
            ? <Link to="/enroll" className="btn w-full" title="Face ID required">Face ID required to accept</Link>
            : <button className="btn btn-primary w-full" onClick={() => onAccept?.(l)}>Accept</button>)}
          {mineClaimed && l.status === 'claimed' && <button className="btn w-full !border-emerald-500/60 !text-emerald-300" onClick={() => onProof?.(l)}>Accepted · submit proof</button>}
          {mineClaimed && l.status === 'completed' && <p className="label !text-emerald-300">Completed · paid</p>}
        </div>
      </div>
    </article>
  )
}

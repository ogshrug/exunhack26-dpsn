import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CornerUpLeft, Pin, PinOff, SendHorizontal, SmilePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText } from '../lib/upload'
import { EMOJI, KEYS, type EmojiKey } from '../lib/emoji'
import PageHeader from '../components/PageHeader'

type Msg = { id: number; author_id: string; body: string; reply_to: number | null; pinned: boolean; created_at: string }
type Reaction = { message_id: number; user_id: string; emoji: string }
type Who = { handle: string; role: string }

const RECENT = 200

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s)
const time = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Chat() {
  const { session, profile } = useAuth()
  const me = session?.user.id ?? ''
  const isAdmin = profile?.role === 'admin'
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [pinned, setPinned] = useState<Msg[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [who, setWho] = useState<Record<string, Who>>({})
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [picker, setPicker] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const known = useRef(new Set<string>())

  const load = useCallback(async () => {
    const [{ data: recent }, { data: pins }] = await Promise.all([
      supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(RECENT),
      supabase.from('chat_messages').select('*').eq('pinned', true).order('created_at', { ascending: false }),
    ])
    const list = ((recent as Msg[]) ?? []).reverse()
    setMsgs(list)
    setPinned((pins as Msg[]) ?? [])
    const ids = list.map((m) => m.id)
    const { data: r } = ids.length ? await supabase.from('chat_reactions').select('*').in('message_id', ids) : { data: [] }
    setReactions((r as Reaction[]) ?? [])
    const authors = [...new Set([...list, ...((pins as Msg[]) ?? [])].map((m) => m.author_id))]
    if (authors.some((a) => !known.current.has(a))) {
      const { data: p } = await supabase.from('profile_public').select('id,handle,role')
      setWho(Object.fromEntries((p ?? []).map((x) => [x.id, { handle: x.handle, role: x.role }])))
      authors.forEach((a) => known.current.add(a))
    }
  }, [])

  useEffect(() => {
    void load()
    const ch = supabase.channel('global-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, () => void load())
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load])

  useLayoutEffect(() => {
    const el = box.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [msgs])

  const byId = useMemo(() => new Map([...pinned, ...msgs].map((m) => [m.id, m])), [msgs, pinned])
  const tally = useMemo(() => {
    const m = new Map<number, Map<string, { n: number; mine: boolean }>>()
    reactions.forEach((r) => {
      const per = m.get(r.message_id) ?? new Map()
      const cur = per.get(r.emoji) ?? { n: 0, mine: false }
      per.set(r.emoji, { n: cur.n + 1, mine: cur.mine || r.user_id === me })
      m.set(r.message_id, per)
    })
    return m
  }, [reactions, me])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setErr('')
    const { error } = await supabase.from('chat_messages').insert({ body, reply_to: replyTo?.id ?? null })
    if (error) return setErr(errText(error))
    setText(''); setReplyTo(null)
    stick.current = true
    await load()
  }

  async function react(id: number, emoji: EmojiKey) {
    setPicker(null)
    const mine = tally.get(id)?.get(emoji)?.mine
    const { error } = mine
      ? await supabase.from('chat_reactions').delete().eq('message_id', id).eq('user_id', me).eq('emoji', emoji)
      : await supabase.from('chat_reactions').insert({ message_id: id, emoji })
    if (error) setErr(errText(error))
    await load()
  }

  async function pin(m: Msg) {
    const { error } = await supabase.rpc('set_pinned', { p_id: m.id, p_pinned: !m.pinned })
    if (error) setErr(errText(error))
    await load()
  }

  const jump = (id: number) => document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const name = (id: string) => who[id]?.handle ?? '…'

  return (
    <>
      <PageHeader tag="Comms" title="Group" accent="chat" />
      <div className="card !p-0 flex flex-col h-[68vh] min-h-[26rem] overflow-hidden">
        {pinned.length > 0 && (
          <div className="border-b border-line bg-panel2/60 px-4 py-2 space-y-1 max-h-32 overflow-y-auto">
            <div className="label label-crimson flex items-center gap-1"><Pin size={11} />Pinned</div>
            {pinned.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <button className="flex-1 min-w-0 text-left truncate text-mist hover:text-white" onClick={() => jump(m.id)}>
                  <span className="text-white">{name(m.author_id)}</span> {clip(m.body, 140)}
                </button>
                {isAdmin && <button className="text-haze hover:text-crimson" aria-label="Unpin message" onClick={() => pin(m)}><PinOff size={14} /></button>}
              </div>
            ))}
          </div>
        )}

        <div ref={box} className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          onScroll={(e) => { const t = e.currentTarget; stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 80 }}>
          {msgs.length === 0 && <p className="text-sm text-haze text-center pt-10">Quiet in here. Say something.</p>}
          {msgs.map((m) => {
            const parent = m.reply_to ? byId.get(m.reply_to) : null
            const mineMsg = m.author_id === me
            const per = tally.get(m.id)
            return (
              <div key={m.id} id={`msg-${m.id}`} className={`group flex flex-col ${mineMsg ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] rounded-xl px-3 py-2 border ${m.pinned ? 'border-crimson/60' : 'border-line'} ${mineMsg ? 'bg-crimson/15' : 'bg-panel2'}`}>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="text-white font-semibold">{name(m.author_id)}</span>
                    {who[m.author_id]?.role === 'admin' && <span className="chip !py-0">admin</span>}
                    <span className="text-haze">{time(m.created_at)}</span>
                    {m.pinned && <Pin size={11} className="text-crimson" aria-label="Pinned" />}
                  </div>
                  {m.reply_to && (
                    <button className="mt-1 block w-full text-left text-xs text-haze border-l-2 border-crimson/60 pl-2 hover:text-mist" onClick={() => parent && jump(parent.id)}>
                      {parent ? <><span className="text-mist">{name(parent.author_id)}</span> {clip(parent.body)}</> : 'Original message'}
                    </button>
                  )}
                  <p className="text-sm text-white whitespace-pre-wrap break-words mt-1">{m.body}</p>
                </div>

                <div className={`flex flex-wrap items-center gap-1 mt-1 ${mineMsg ? 'justify-end' : ''}`}>
                  {per && KEYS.filter((k) => per.has(k)).map((k) => (
                    <button key={k} onClick={() => react(m.id, k)} aria-label={`${k.replace('_', ' ')} reaction, ${per.get(k)!.n}`}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${per.get(k)!.mine ? 'border-crimson bg-crimson/20 text-white' : 'border-line text-mist hover:text-white'}`}>
                      {EMOJI[k]} {per.get(k)!.n}
                    </button>
                  ))}
                  {picker === m.id ? (
                    <span className="inline-flex gap-1 rounded-full border border-line bg-panel2 px-1.5 py-0.5">
                      {KEYS.map((k) => <button key={k} className="text-base hover:scale-125 transition-transform" aria-label={k.replace('_', ' ')} onClick={() => react(m.id, k)}>{EMOJI[k]}</button>)}
                    </span>
                  ) : (
                    <button className="text-haze hover:text-white p-1 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100" aria-label="Add reaction" onClick={() => setPicker(m.id)}><SmilePlus size={15} /></button>
                  )}
                  <button className="text-haze hover:text-white p-1 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100" aria-label="Reply" onClick={() => setReplyTo(m)}><CornerUpLeft size={15} /></button>
                  {isAdmin && <button className="text-haze hover:text-crimson p-1 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100" aria-label={m.pinned ? 'Unpin message' : 'Pin message'} onClick={() => pin(m)}>{m.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>}
                </div>
              </div>
            )
          })}
        </div>

        <form onSubmit={send} className="border-t border-line p-3 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-mist border-l-2 border-crimson/60 pl-2">
              <span className="flex-1 truncate">Replying to <span className="text-white">{name(replyTo.author_id)}</span>: {clip(replyTo.body)}</span>
              <button type="button" aria-label="Cancel reply" className="text-haze hover:text-white" onClick={() => setReplyTo(null)}><X size={14} /></button>
            </div>
          )}
          {err && <p className="text-xs text-crimson-soft" role="alert">{err}</p>}
          <div className="flex gap-2">
            <input className="input" aria-label="Message" placeholder="Say something…" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary !px-4" aria-label="Send" disabled={!text.trim()}><SendHorizontal size={16} /></button>
          </div>
        </form>
      </div>
    </>
  )
}

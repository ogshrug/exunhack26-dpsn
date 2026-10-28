import { useCallback, useEffect, useMemo, useState } from 'react'
import { Film, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { errText } from '../lib/upload'
import { EMOJI, KEYS, type EmojiKey } from '../lib/emoji'
import PageHeader from '../components/PageHeader'
import VideoPlayer from '../components/VideoPlayer'

type BoardPost = { id: number; author_id: string; audience: 'admin' | 'user'; title: string; body: string; video_url: string | null; created_at: string }
type Reaction = { post_id: number; user_id: string; emoji: string }

export default function Board() {
  const { session, profile } = useAuth()
  const me = session?.user.id ?? ''
  const isAdmin = profile?.role === 'admin'
  const [tab, setTab] = useState<'user' | 'admin'>('user')
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [video, setVideo] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('board_posts').select('*').order('created_at', { ascending: false })
    setPosts((data as BoardPost[]) ?? [])
    const { data: r } = await supabase.from('board_reactions').select('*')
    setReactions((r as Reaction[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
    const ch = supabase.channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_posts' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_reactions' }, () => void load())
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [load])

  const tally = useMemo(() => {
    const m = new Map<number, Map<string, { n: number; mine: boolean }>>()
    reactions.forEach((r) => {
      const per = m.get(r.post_id) ?? new Map()
      const cur = per.get(r.emoji) ?? { n: 0, mine: false }
      per.set(r.emoji, { n: cur.n + 1, mine: cur.mine || r.user_id === me })
      m.set(r.post_id, per)
    })
    return m
  }, [reactions, me])

  async function react(id: number, emoji: EmojiKey) {
    const mine = tally.get(id)?.get(emoji)?.mine
    const { error } = mine
      ? await supabase.from('board_reactions').delete().eq('post_id', id).eq('user_id', me).eq('emoji', emoji)
      : await supabase.from('board_reactions').insert({ post_id: id, emoji })
    if (error) setErr(errText(error))
    await load()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      let video_url: string | null = null
      if (video) {
        const path = `${me}/${crypto.randomUUID()}-${video.name.replace(/[^\w.-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('board-videos').upload(path, video, { contentType: video.type })
        if (upErr) throw upErr
        video_url = supabase.storage.from('board-videos').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('board_posts').insert({ audience: tab, title: title.trim(), body: body.trim(), video_url })
      if (error) throw error
      setTitle(''); setBody(''); setVideo(null); setComposing(false)
      await load()
    } catch (e2) { setErr(errText(e2)) }
    setBusy(false)
  }

  const shown = posts.filter((p) => p.audience === tab)
  const [latest, ...older] = shown

  const Bar = ({ id, big }: { id: number; big?: boolean }) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reactions">
      {KEYS.map((k) => {
        const t = tally.get(id)?.get(k)
        return (
          <button key={k} onClick={() => react(id, k)} aria-pressed={!!t?.mine} aria-label={`${k.replace('_', ' ')}${t ? `, ${t.n}` : ''}`}
            className={`inline-flex items-center gap-2 rounded-full border transition-transform hover:scale-105 ${big ? 'px-4 py-2 text-2xl' : 'px-2.5 py-1 text-base'} ${t?.mine ? 'border-crimson bg-crimson/25 text-white' : 'border-line bg-panel2 text-mist'}`}>
            {EMOJI[k]}{t && <span className={big ? 'text-lg' : 'text-xs'}>{t.n}</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader tag="Noticeboard" title="Board" accent="posts"
        right={isAdmin ? <button className="btn btn-primary" onClick={() => setComposing((c) => !c)}>{composing ? <><X size={14} />Close</> : <><Plus size={14} />New post</>}</button> : undefined} />

      {isAdmin && (
        <div className="flex gap-2">
          <button className={`btn ${tab === 'user' ? 'btn-active' : ''}`} onClick={() => setTab('user')}>Announcements</button>
          <button className={`btn ${tab === 'admin' ? 'btn-active' : ''}`} onClick={() => setTab('admin')}>Admin board</button>
        </div>
      )}

      {isAdmin && composing && (
        <form onSubmit={submit} className="card space-y-2">
          <input className="input" required maxLength={120} placeholder="Title" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" rows={4} maxLength={2000} placeholder="Body" aria-label="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="btn cursor-pointer w-fit"><Film size={14} />{video ? video.name : 'Attach video (mp4, webm, mov, up to 50 MB)'}
            <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /></label>
          {err && <p className="text-xs text-crimson-soft" role="alert">{err}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? (video ? 'Uploading…' : 'Posting…') : `Post to ${tab === 'user' ? 'announcements' : 'the admin board'}`}</button>
        </form>
      )}
      {!composing && err && <p className="text-xs text-crimson-soft" role="alert">{err}</p>}

      {latest ? (
        <article className="card relative overflow-hidden min-h-[68vh] flex flex-col justify-between gap-8 !p-6 md:!p-12 !border-crimson/60 shadow-[0_0_80px_rgba(223,41,53,.18)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(223,41,53,.22),transparent_60%)]" />
          <div className="relative space-y-6">
            <span className="chip !text-xs">Latest news · {new Date(latest.created_at).toLocaleString()}</span>
            <h2 className="font-display uppercase text-white leading-[.95] text-[clamp(2.6rem,9vw,7rem)] break-words">{latest.title}</h2>
            {latest.body && <p className="text-white/90 font-semibold text-xl md:text-3xl leading-snug whitespace-pre-wrap break-words max-w-4xl">{latest.body}</p>}
            {latest.video_url && <VideoPlayer src={latest.video_url} className="w-full" />}
          </div>
          <div className="relative"><Bar id={latest.id} big /></div>
        </article>
      ) : (
        <div className="card text-center py-16"><p className="text-mist">No news yet.</p></div>
      )}

      {older.length > 0 && (
        <section className="space-y-3">
          <h2 className="label label-crimson">Earlier</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {older.map((p) => (
              <article key={p.id} className="card space-y-2">
                <h3 className="text-white font-semibold text-lg">{p.title}</h3>
                {p.body && <p className="text-sm text-mist whitespace-pre-wrap break-words">{p.body}</p>}
                {p.video_url && <VideoPlayer src={p.video_url} />}
                <p className="text-xs text-haze">{new Date(p.created_at).toLocaleString()}</p>
                <Bar id={p.id} />
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

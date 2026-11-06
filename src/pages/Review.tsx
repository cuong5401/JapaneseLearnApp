import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { SpeakButton } from '../components/SpeakButton'
import { ENTRY_BY_ID, deckTitle, type StudyEntry } from '../data'
import { progress } from '../lib/progress'
import { formatInterval, review } from '../lib/srs'
import { useCards, useDueIds } from '../hooks/useProgress'
import type { Quality } from '../types'

const GRADES: { q: Quality; label: string; cls: string }[] = [
  { q: 1, label: 'Quên', cls: 'border-beni text-beni hover:bg-beni-soft' },
  { q: 3, label: 'Khó', cls: 'border-line hover:bg-sunken' },
  { q: 4, label: 'Nhớ', cls: 'border-line hover:bg-sunken' },
  { q: 5, label: 'Dễ', cls: 'border-matsu text-matsu hover:bg-matsu-soft' },
]

function Front({ entry }: { entry: StudyEntry }) {
  if (entry.kind === 'kanji') return <GridCell className="size-36 text-[6rem]">{entry.item.kanji}</GridCell>
  return (
    <p lang="ja" className="font-jp text-5xl font-bold">
      {entry.item.word}
    </p>
  )
}

function Back({ entry }: { entry: StudyEntry }) {
  if (entry.kind === 'kanji') {
    const k = entry.item
    return (
      <div className="text-center">
        <p className="text-2xl font-bold tracking-wide">{k.hanViet}</p>
        <p className="text-muted">{k.meaning}</p>
        <p lang="ja" className="mt-3 font-jp">
          {[...k.onyomi, ...k.kunyomi].join('、')}
        </p>
        <p lang="ja" className="mt-2 font-jp text-sm text-muted">
          {k.compounds.map((c) => `${c.word}（${c.reading}）`).join('　')}
        </p>
      </div>
    )
  }
  const w = entry.item
  return (
    <div className="text-center">
      <p lang="ja" className="flex items-center justify-center gap-3 font-jp text-xl">
        {w.reading}
        <SpeakButton text={w.reading} size="sm" />
      </p>
      <p className="mt-2 text-2xl font-semibold">{w.meaning}</p>
      {w.example && (
        <p className="mt-3 text-sm text-muted">
          <span lang="ja" className="font-jp text-ink">
            {w.example.ja}
          </span>
          <br />
          {w.example.vi}
        </p>
      )}
    </div>
  )
}

export function Review() {
  const dueIds = useDueIds()
  const cards = useCards()
  // Chốt danh sách lúc bắt đầu phiên để thẻ không nhảy khi đang chấm.
  const [queue, setQueue] = useState<string[]>(() => dueIds.filter((id) => ENTRY_BY_ID.has(id)))
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(0)

  const id = queue[0]
  const entry = id ? ENTRY_BY_ID.get(id) : undefined
  const card = id ? cards[id] : undefined

  const previews = useMemo(
    () => (card ? GRADES.map((g) => (g.q < 3 ? 'lát nữa' : formatInterval(review(card, g.q).interval))) : []),
    [card],
  )

  const nextDue = useMemo(() => {
    const upcoming = Object.values(cards).sort((a, b) => a.due - b.due)[0]
    return upcoming ? new Date(upcoming.due) : null
  }, [cards])

  const grade = (q: Quality) => {
    if (!id) return
    progress.grade(id, q)
    setShown(false)
    // Quên thì đưa xuống cuối hàng để gặp lại trong phiên này.
    setQueue((qs) => (q < 3 ? [...qs.slice(1), qs[0]] : qs.slice(1)))
    if (q >= 3) setDone((d) => d + 1)
  }

  if (!entry || !card) {
    return (
      <div>
        <PageHeader title="Ôn tập" />
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-12 text-center">
          <GridCell className="size-24 text-6xl text-matsu">済</GridCell>
          <h2 className="mt-5 text-xl font-semibold">
            {done > 0 ? `Xong ${done} thẻ. Hết thẻ cần ôn.` : 'Chưa có thẻ nào đến hạn'}
          </h2>
          <p className="mt-2 max-w-sm text-muted">
            {nextDue
              ? `Thẻ tiếp theo đến hạn lúc ${nextDue.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}.`
              : 'Đánh dấu từ đã học trong flashcard hoặc làm quiz để tạo lịch ôn.'}
          </p>
          <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai">
            Chọn bài học
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Ôn tập">
        <span className="text-sm tabular-nums text-muted">Còn {queue.length} thẻ</span>
      </PageHeader>

      <div className="flex min-h-96 flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface p-6">
        <span className="text-xs text-muted">
          {entry.kind === 'kanji' ? 'Chữ Hán' : 'Từ vựng'}, {deckTitle(entry.deck)}
        </span>
        <Front entry={entry} />
        {shown ? <Back entry={entry} /> : <p className="text-sm text-muted">Nhớ lại cách đọc và nghĩa rồi lật thẻ.</p>}
      </div>

      {shown ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GRADES.map((g, i) => (
            <button
              key={g.q}
              type="button"
              onClick={() => grade(g.q)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 bg-surface font-semibold ${g.cls}`}
            >
              {g.label}
              <span className="text-[11px] font-normal text-muted">{previews[i]}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          autoFocus
          onClick={() => setShown(true)}
          className="mt-4 min-h-14 w-full rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90"
        >
          Lật thẻ
        </button>
      )}
    </div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Celebration } from '../components/Celebration'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { Button, ButtonLink } from '../components/Pressable'
import { STUDY_PAGE, SessionPanel, StudyLayout } from '../components/StudyLayout'
import { SpeakButton } from '../components/SpeakButton'
import { deckTitle, isCurrentId } from '../data'
import { useEntries } from '../hooks/useData'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { HanViet, WordMeta } from '../components/VocabBits'
import { speechText } from '../lib/speech'
import { isInteractiveTarget } from '../lib/keyboard'
import { progress } from '../lib/progress'
import { LEARN_AHEAD_MS, nextDue } from '../lib/reviewQueue'
import { formatDelay, preview } from '../lib/srs'
import { useSrsSettings } from '../lib/srsSettings'
import { useCards, useNow, useReviewQueue } from '../hooks/useProgress'
import { kanjiOfRadical } from '../data/radicalKanji'
import type { Grade, StudyEntry } from '../types'

/** 4 mức chấm FSRS: Quên (Again) / Khó (Hard) / Nhớ (Good) / Dễ (Easy), phím 1–4. */
const GRADES: { q: Grade; label: string; cls: string }[] = [
  { q: 1, label: 'Quên', cls: 'border-beni text-beni hover:bg-beni-soft' },
  { q: 2, label: 'Khó', cls: 'border-line hover:bg-sunken' },
  { q: 3, label: 'Nhớ', cls: 'border-line hover:bg-sunken' },
  { q: 4, label: 'Dễ', cls: 'border-matsu text-matsu hover:bg-matsu-soft' },
]

const gradeList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const gradeItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 32 } },
} as const

function Front({ entry }: { entry: StudyEntry }) {
  if (entry.kind === 'char') return <GridCell className="w-[clamp(7rem,34cqw,9.5rem)]">{entry.item.char}</GridCell>
  if (entry.kind === 'radical') return <GridCell className="w-[clamp(7rem,34cqw,9.5rem)]">{entry.item.radical}</GridCell>
  if (entry.kind === 'kanji') return <GridCell className="w-[clamp(7rem,34cqw,9.5rem)]">{entry.item.kanji}</GridCell>
  if (entry.kind === 'grammar')
    return (
      <p lang="ja" className="max-w-full text-center font-jp text-[clamp(1.5rem,8cqw,2.25rem)] leading-snug font-bold break-words">
        {entry.item.title}
      </p>
    )
  return (
    <p lang="ja" className="max-w-full text-center font-jp text-[clamp(2rem,12cqw,3.25rem)] font-bold break-words">
      {entry.item.word}
    </p>
  )
}

function Back({ entry }: { entry: StudyEntry }) {
  // Chữ ngoài kanji.json không vào lịch ôn; chỉ phòng khi có thẻ cũ.
  if (entry.kind === 'char') return <p className="text-center text-muted">Chưa có dữ liệu cho chữ này.</p>
  if (entry.kind === 'radical') {
    const r = entry.item
    const chars = kanjiOfRadical(r.no).slice(0, 8)
    return (
      <div className="text-center">
        <p className="text-2xl font-bold capitalize">Bộ {r.name}</p>
        <p className="text-muted">{r.meaning}</p>
        {chars.length > 0 && (
          <p lang="ja" className="mt-3 font-jp text-xl tracking-widest">
            {chars.join('')}
          </p>
        )}
      </div>
    )
  }
  if (entry.kind === 'kanji') {
    const k = entry.item
    return (
      <div className="text-center">
        <p className="text-2xl font-bold tracking-wide">{k.hanViet}</p>
        {k.hanVietAlt?.length ? <p className="text-sm text-muted">Âm khác: {k.hanVietAlt.join(', ')}</p> : null}
        <p className="mt-2 text-sm text-muted">{k.wordCount} từ chứa chữ này</p>
      </div>
    )
  }
  if (entry.kind === 'grammar') {
    const g = entry.item
    const ex = g.examples?.[0]
    return (
      <div className="w-full text-center">
        <p className="text-lg font-semibold">{g.meaning ?? 'Mẫu này chưa tách được ý nghĩa, mở trang chi tiết để xem.'}</p>
        {ex && (
          <p className="mt-3 text-sm text-muted">
            <span lang="ja" className="font-jp text-base text-ink">
              {ex.ja}
            </span>
            {ex.vi && (
              <>
                <br />
                {ex.vi}
              </>
            )}
          </p>
        )}
        <Link to={`/grammar/${g.level.toLowerCase()}/${g.id}`} className="mt-3 inline-block text-sm font-medium text-ai hover:underline">
          Xem giải thích đầy đủ
        </Link>
      </div>
    )
  }
  const w = entry.item
  return (
    <div className="w-full text-center">
      <p lang="ja" className="flex items-center justify-center gap-3 font-jp text-xl">
        {w.reading || <span className="font-sans text-sm text-muted">Chưa có cách đọc</span>}
        <SpeakButton text={speechText(w)} size="sm" />
      </p>
      <HanViet text={w.hanViet} className="mt-1" />
      <p className="mt-2 text-2xl font-semibold">{w.meaning}</p>
      <div className="mx-auto mt-3 w-fit max-w-full text-left">
        <WordMeta item={w} compact />
      </div>
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

const KIND_LABEL = { word: 'Từ vựng', kanji: 'Chữ Hán', grammar: 'Ngữ pháp', radical: 'Bộ thủ' } as const

function entryLabel(entry: StudyEntry) {
  if (entry.kind === 'word') return `${KIND_LABEL.word}, ${deckTitle(entry.deck)}`
  if (entry.kind === 'grammar') return `${KIND_LABEL.grammar} ${entry.item.level}`
  if (entry.kind === 'radical') return `${KIND_LABEL.radical} số ${entry.item.no}`
  if (entry.kind === 'char') return KIND_LABEL.kanji
  return entry.item.firstLevel ? `${KIND_LABEL.kanji}, xuất hiện từ ${entry.item.firstLevel}` : KIND_LABEL.kanji
}

const SHORTCUTS = [
  { keys: ['Space'], label: 'Lật thẻ' },
  { keys: ['1'], label: 'Quên' },
  { keys: ['2'], label: 'Khó' },
  { keys: ['3'], label: 'Nhớ' },
  { keys: ['4'], label: 'Dễ' },
]

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Hết thẻ đến hạn ngay nhưng còn thẻ đang học sắp đến hạn: đếm ngược, có nút ôn luôn. */
function Countdown({ due, onNow }: { due: number; onNow: () => void }) {
  const now = useNow(1000)
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-12 text-center" data-review-countdown>
      <GridCell className="size-24 text-ai">待</GridCell>
      <h2 className="mt-5 text-xl font-semibold">
        Thẻ tiếp theo sau <span className="tabular-nums">{clock(due - now)}</span>
      </h2>
      <p className="mt-2 max-w-sm text-muted">Thẻ vừa học đang ở bước nhắc lại ngắn. Chờ một chút để nhớ chắc hơn, hoặc ôn luôn.</p>
      <Button onClick={onNow} className="mt-6 min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
        Ôn luôn bây giờ
      </Button>
    </div>
  )
}

export function Review() {
  const { ids: dueIds, now, newWaiting, reviewWaiting } = useReviewQueue()
  const cards = useCards()
  const settings = useSrsSettings()
  // Thẻ được đưa lên ôn sớm ("Ôn luôn bây giờ")
  const [early, setEarly] = useState<string | null>(null)
  const order = early && !dueIds.includes(early) ? [early, ...dueIds] : dueIds
  // Nạp dữ liệu cho mọi id từng vào hàng đợi trong phiên (thẻ Quên quay lại sau 1 phút không phải tải lại).
  const [known, setKnown] = useState<string[]>(order)
  const missing = order.filter((x) => !known.includes(x))
  if (missing.length) setKnown([...known, ...missing])
  const lookup = useEntries(known)
  // Thẻ có ID không còn tồn tại (bộ mẫu cũ, từ đã xoá) bị bỏ qua.
  const queue = lookup.status === 'ready' ? order.filter((x) => lookup.entries.has(x)) : null
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(0)
  const [lapses, setLapses] = useState(0)
  // Đếm số lần đã chấm để làm key, thẻ quên quay lại vẫn có hiệu ứng chuyển.
  const [turn, setTurn] = useState(0)

  const id = queue?.[0]
  const entry = id ? lookup.entries.get(id) : undefined
  const card = id ? cards[id] : undefined

  // Nhãn thời gian tới lần ôn tiếp theo trên 4 nút (xem trước bằng scheduler.repeat)
  const previews = useMemo(() => {
    if (!card) return []
    const p = preview(card, now, settings)
    return GRADES.map((g) => formatDelay(p[g.q].due - now))
  }, [card, now, settings])

  const upcoming = useMemo(() => nextDue(cards, now, isCurrentId), [cards, now])

  const grade = (q: Grade) => {
    if (!id) return
    progress.grade(id, q)
    setShown(false)
    setTurn((t) => t + 1)
    if (id === early) setEarly(null)
    if (q === 1) setLapses((l) => l + 1)
    else setDone((d) => d + 1)
  }

  // Phím 1–4 gọi đúng hàm chấm của lần render mới nhất
  const gradeRef = useRef(grade)
  useEffect(() => {
    gradeRef.current = grade
  })
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setShown(true)
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) gradeRef.current(GRADES[Number(e.key) - 1].q)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, shown])

  if (lookup.status === 'error') return <LoadError error={lookup.error} onRetry={lookup.retry} />
  if (queue === null) return <PageSkeleton header rows={4} />

  if (!entry || !card) {
    const soon = upcoming && upcoming.due - now <= LEARN_AHEAD_MS ? upcoming : null
    const waiting = newWaiting + reviewWaiting
    return (
      <div className="mx-auto max-w-[560px]">
        {done > 0 && !soon && <Celebration />}
        <PageHeader title="Ôn tập" />
        {soon ? (
          <Countdown due={soon.due} onNow={() => setEarly(soon.id)} />
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-12 text-center" data-review-done>
            <GridCell className="size-24 text-matsu">済</GridCell>
            <h2 className="mt-5 text-xl font-semibold">
              {done > 0 ? `Xong ${done} thẻ. Hết thẻ cần ôn.` : 'Chưa có thẻ nào đến hạn'}
            </h2>
            <p className="mt-2 max-w-sm text-muted">
              {upcoming
                ? `Thẻ tiếp theo đến hạn lúc ${new Date(upcoming.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}.`
                : 'Học từ mới bằng flashcard hoặc làm quiz để tạo lịch ôn.'}
              {waiting > 0 && ` Còn ${waiting} thẻ chờ ngày mai do giới hạn mỗi ngày (đổi trong Cài đặt).`}
            </p>
            <ButtonLink to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai">
              Chọn bài học
            </ButtonLink>
          </div>
        )}
      </div>
    )
  }

  const aside = (
    <SessionPanel
      title="Phiên ôn tập"
      stats={[
        { label: 'Còn lại', value: queue.length },
        { label: 'Đã xong', value: done, tone: 'good' },
        { label: 'Quên trong phiên', value: lapses, tone: 'bad' },
      ]}
      shortcuts={SHORTCUTS}
    />
  )

  return (
    <div className={STUDY_PAGE}>
      <PageHeader title="Ôn tập">
        <span className="text-sm tabular-nums text-muted lg:hidden">Còn {queue.length} thẻ</span>
      </PageHeader>

      <StudyLayout aside={aside}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={turn}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="@container flex min-h-[clamp(22rem,58vh,27rem)] flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface p-6"
          >
            <span className="text-xs text-muted">{entryLabel(entry)}</span>
            <Front entry={entry} />
            <AnimatePresence mode="wait" initial={false}>
              {shown ? (
                <motion.div key="back" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Back entry={entry} />
                </motion.div>
              ) : (
                <motion.p key="hint" exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="text-center text-sm text-muted">
                  Nhớ lại cách đọc và nghĩa rồi lật thẻ.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 min-h-14">
          {shown ? (
            <motion.div key={`grades-${turn}`} className="grid grid-cols-4 gap-2" variants={gradeList} initial="hidden" animate="show">
              {GRADES.map((g, i) => (
                <motion.button
                  key={g.q}
                  type="button"
                  variants={gradeItem}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => grade(g.q)}
                  data-grade={g.q}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 bg-surface font-semibold ${g.cls}`}
                >
                  {g.label}
                  <span className="text-[11px] font-normal text-muted" data-grade-delay>
                    {previews[i]}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <Button
              autoFocus
              onClick={() => setShown(true)}
              className="min-h-14 w-full rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90"
            >
              Lật thẻ
            </Button>
          )}
        </div>
      </StudyLayout>
    </div>
  )
}

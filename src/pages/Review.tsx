import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Celebration } from '../components/Celebration'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { Button, ButtonLink } from '../components/Pressable'
import { STUDY_PAGE, SessionPanel, StudyLayout } from '../components/StudyLayout'
import { SpeakButton } from '../components/SpeakButton'
import { ENTRY_BY_ID, deckTitle, type StudyEntry } from '../data'
import { isInteractiveTarget } from '../lib/keyboard'
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

const gradeList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const gradeItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 32 } },
} as const

function Front({ entry }: { entry: StudyEntry }) {
  if (entry.kind === 'kanji')
    return <GridCell className="size-[clamp(7.5rem,34vw,9.5rem)] text-[clamp(5rem,23vw,6.5rem)]">{entry.item.kanji}</GridCell>
  return (
    <p lang="ja" className="text-center font-jp text-[clamp(2.5rem,11vw,3.25rem)] font-bold break-words">
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

const SHORTCUTS = [
  { keys: ['Space'], label: 'Lật thẻ' },
  { keys: ['1'], label: 'Quên' },
  { keys: ['2'], label: 'Khó' },
  { keys: ['3'], label: 'Nhớ' },
  { keys: ['4'], label: 'Dễ' },
]

export function Review() {
  const dueIds = useDueIds()
  const cards = useCards()
  // Chốt danh sách lúc bắt đầu phiên để thẻ không nhảy khi đang chấm.
  const [queue, setQueue] = useState<string[]>(() => dueIds.filter((id) => ENTRY_BY_ID.has(id)))
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(0)
  const [lapses, setLapses] = useState(0)
  // Đếm số lần đã chấm để làm key, thẻ quên quay lại vẫn có hiệu ứng chuyển.
  const [turn, setTurn] = useState(0)

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
    setTurn((t) => t + 1)
    // Quên thì đưa xuống cuối hàng để gặp lại trong phiên này.
    setQueue((qs) => (q < 3 ? [...qs.slice(1), qs[0]] : qs.slice(1)))
    if (q >= 3) setDone((d) => d + 1)
    else setLapses((l) => l + 1)
  }

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setShown(true)
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) {
        const g = GRADES[Number(e.key) - 1]
        progress.grade(id, g.q)
        setShown(false)
        setTurn((t) => t + 1)
        setQueue((qs) => (g.q < 3 ? [...qs.slice(1), qs[0]] : qs.slice(1)))
        if (g.q >= 3) setDone((d) => d + 1)
        else setLapses((l) => l + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, shown])

  if (!entry || !card) {
    return (
      <div className="mx-auto max-w-[560px]">
        {done > 0 && <Celebration />}
        <PageHeader title="Ôn tập" />
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-12 text-center">
          <GridCell className="size-24 text-6xl text-matsu">済</GridCell>
          <h2 className="mt-5 text-xl font-semibold">
            {done > 0 ? `Xong ${done} thẻ. Hết thẻ cần ôn.` : 'Chưa có thẻ nào đến hạn'}
          </h2>
          <p className="mt-2 max-w-sm text-muted">
            {nextDue
              ? `Thẻ tiếp theo đến hạn lúc ${nextDue.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}.`
              : 'Học từ mới bằng flashcard hoặc làm quiz để tạo lịch ôn.'}
          </p>
          <ButtonLink to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai">
            Chọn bài học
          </ButtonLink>
        </div>
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
            className="flex min-h-[clamp(22rem,58vh,27rem)] flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface p-6"
          >
            <span className="text-xs text-muted">
              {entry.kind === 'kanji' ? 'Chữ Hán' : 'Từ vựng'}, {deckTitle(entry.deck)}
            </span>
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
                  className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 bg-surface font-semibold ${g.cls}`}
                >
                  {g.label}
                  <span className="text-[11px] font-normal text-muted">{previews[i]}</span>
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

import { KanjiReadingsCompact } from '../components/detail/KanjiReadings'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { GridCell } from '../components/GridCell'
import { LoadError, Skeleton } from '../components/LoadState'
import { ButtonLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { SpeakButton } from '../components/SpeakButton'
import { DECK_ID_PREFIX, deckTitle, isCurrentId } from '../data'
import { useEntries, useKanjiIndex, useVocab } from '../hooks/useData'
import { useDetailStack } from '../hooks/useDetailStack'
import { useCards, useDueIds, useNow } from '../hooks/useProgress'
import { dueForecast } from '../lib/forecast'
import { continueLesson, lessonProgress, splitLessons } from '../lib/lessons'
import { useLessonSize } from '../lib/settings'
import { fetchKanjiWords } from '../lib/kanjiWordsApi'
import { kanjiPool, mergeKanjiWords, pickRandom, pushRecent, readRecent, type CardWord } from '../lib/randomKanji'
import { speechText } from '../lib/speech'
import { webWords } from '../lib/webWords'
import type { KanjiEntry, SrsCard, VocabDeckKey } from '../types'
import { t } from '../i18n'
import { tRich } from '../i18n/rich'

/**
 * Trang chủ gọn: desktop 1280×800 nằm trong một màn hình (không cuộn), điện thoại tối đa ~2 màn.
 *  1. Ôn tập hôm nay | Học tiếp (cùng chiều cao)
 *  2. Chữ Hán ngẫu nhiên: chữ, Hán Việt, On / Kun, 5 từ ví dụ (mỗi từ 1 dòng: chữ, cách đọc, nghĩa cắt "…", nút nghe)
 * Không có khối lối tắt: các bộ học ở trang Học (/learn), vào bằng điều hướng chính.
 */

const CARD = 'flex h-full flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5'

/** Số từ ví dụ của chữ Hán ngẫu nhiên: luôn giữ đủ ngần ấy hàng (hàng trống cùng chiều cao) để khối không đổi chiều cao. */
const MAX_WORDS = 5

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

/**
 * Từ đi kèm chữ: lấy từ dữ liệu có sẵn (cấp thấp trước); có mạng mà chưa đủ MAX_WORDS thì tra thêm
 * qua Mazii. Con số "x từ chứa chữ này" và danh sách hiện ra lấy từ CÙNG một danh sách gộp
 * (mergeKanjiWords): từ Mazii về thì số tăng theo đúng số từ thêm vào danh sách.
 */
function useKanjiWords(kanji: KanjiEntry) {
  const localIds = useMemo(() => kanji.words.slice(0, MAX_WORDS), [kanji.words])
  const local = useEntries(localIds)
  const localWords = useMemo<CardWord[]>(
    () =>
      localIds.flatMap((id) => {
        const e = local.entries.get(id)
        return e?.kind === 'word' ? [{ id, word: e.item.word, reading: e.item.reading, meaning: e.item.meaning, speak: speechText(e.item) }] : []
      }),
    [localIds, local.entries],
  )
  const localReady = local.status !== 'loading'
  const need = localReady ? MAX_WORDS - localWords.length : 0
  const [online, setOnline] = useState<{ ch: string; words: CardWord[] } | null>(null)

  useEffect(() => {
    if (need <= 0 || !isOnline()) return
    const ctrl = new AbortController()
    const known = new Set(localWords.map((w) => w.word))
    fetchKanjiWords(kanji.kanji, ctrl.signal).then((found) => {
      if (ctrl.signal.aborted) return
      const extra = found.filter((w) => !known.has(w.word))
      const ids = webWords.addAll(extra)
      setOnline({ ch: kanji.kanji, words: extra.map((w, i) => ({ id: ids[i], word: w.word, reading: w.reading, meaning: w.meaning, speak: w.reading || w.word })) })
    })
    return () => ctrl.abort()
  }, [kanji.kanji, need, localWords])

  const extra = online?.ch === kanji.kanji ? online.words : []
  const fetching = need > 0 && online?.ch !== kanji.kanji && isOnline()
  const merged = mergeKanjiWords(localWords, kanji.wordCount, extra)
  // Luôn giữ đủ MAX_WORDS hàng (hàng trống cùng chiều cao) để từ về không làm thẻ đổi chiều cao.
  return { words: merged.items.slice(0, MAX_WORDS), total: merged.total, loading: !localReady || fetching }
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ───────────── Hàng 2: chữ Hán ngẫu nhiên + 5 từ ví dụ ───────────── */

function RandomKanji({ kanji, onOpenKanji, onOpenWord }: { kanji: KanjiEntry; onOpenKanji: () => void; onOpenWord: (id: string) => void }) {
  const { words, total, loading } = useKanjiWords(kanji)
  return (
    <div data-random-kanji={kanji.kanji} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <button
        type="button"
        onClick={onOpenKanji}
        aria-label={t('home.xemChiTietChu', { kanji: kanji.kanji, hanViet: kanji.hanViet })}
        data-open-kanji
        className="flex min-w-0 items-center gap-4 rounded-xl text-left sm:w-[19rem] sm:shrink-0"
      >
        <GridCell className="size-20 sm:size-24">{kanji.kanji}</GridCell>
        <span className="min-w-0">
          <span className="block truncate text-[clamp(1.375rem,6cqw,2rem)] leading-tight font-bold tracking-wide">{kanji.hanViet}</span>
          <KanjiReadingsCompact ch={kanji.kanji} truncate className="mt-0.5" />
          <span className="mt-0.5 block text-sm text-muted" data-word-total={total}>
            {t('common.unitCount', { n: total, unit: 'word' })}{kanji.firstLevel && t('home.tu2', { firstLevel: kanji.firstLevel })}
          </span>
        </span>
      </button>
      <ul className="min-w-0 flex-1 space-y-0.5 border-t border-cell-line/60 pt-2 text-sm sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5" aria-label={t('home.tuCoChu', { kanji: kanji.kanji })} data-kanji-words>
        {words.map((w) => (
          <li key={w.id} data-kanji-word={w.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenWord(w.id)}
              className="-mx-2 flex min-h-11 min-w-0 flex-1 items-baseline gap-x-3 overflow-hidden rounded-lg px-2 text-left hover:bg-surface/60"
            >
              <span lang="ja" className="max-w-full shrink-0 truncate font-jp text-base font-semibold">
                {w.word}
              </span>
              {w.reading && w.reading !== w.word && (
                <span lang="ja" className="max-w-[45%] shrink-0 truncate font-jp text-sm text-muted">
                  {w.reading}
                </span>
              )}
              <span className="min-w-0 truncate text-muted">{w.meaning}</span>
            </button>
            <SpeakButton text={w.speak} size="sm" label={t('common.listenTo', { text: w.word })} />
          </li>
        ))}
        {Array.from({ length: Math.max(0, MAX_WORDS - words.length) }, (_, i) => (
          <li key={`s${i}`} className="flex min-h-11 items-center" {...(loading ? { role: 'status', 'aria-label': t('home.dangTaiTuDi') } : { 'aria-hidden': true })}>
            {loading && <Skeleton className="h-5 w-2/3 bg-surface/60" />}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Chữ Hán ngẫu nhiên: chọn mới mỗi lần vào trang chủ (component mount lại), khi app trở lại
 * foreground, hoặc bấm "Chữ khác". Không lặp lại 5 chữ vừa hiện (lưu trong sessionStorage).
 */
function RandomKanjiCard() {
  const index = useKanjiIndex()
  const stack = useDetailStack()
  const pool = useMemo(() => kanjiPool(index.data ?? []), [index.data])
  const [kanjiId, setKanjiId] = useState<string | null>(null)
  const kanji = useMemo(() => (kanjiId ? pool.find((k) => k.id === kanjiId) : undefined), [pool, kanjiId])

  const choose = useCallback(() => {
    const k = pickRandom(pool, readRecent())
    if (k) setKanjiId(k.id)
  }, [pool])

  // Mount mới (vào trang chủ, quay lại từ trang khác): chọn ngay khi dữ liệu có, không chờ effect.
  if (!kanjiId && pool.length) {
    const k = pickRandom(pool, readRecent())
    if (k) setKanjiId(k.id)
  }

  useEffect(() => {
    if (kanjiId) pushRecent(kanjiId)
  }, [kanjiId])

  // Trở lại app (foreground): đổi chữ, trừ khi đang xem chi tiết.
  const detailOpen = useRef(false)
  const hasDetail = stack.frames.length > 0
  useEffect(() => {
    detailOpen.current = hasDetail
  }, [hasDetail])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !detailOpen.current) choose()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [choose])

  return (
    <section aria-labelledby="random-kanji" className="@container min-w-0 rounded-2xl bg-ai-soft p-4 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="random-kanji" className="text-sm font-medium text-ai">{t('home.chuHanNgauNhien')}</h2>
        {kanji && (
          <button
            type="button"
            onClick={choose}
            data-next-kanji
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ai hover:bg-surface/60 active:scale-95"
          >
            <DiceIcon />{t('home.chuKhac')}</button>
        )}
      </div>
      {index.status === 'error' ? (
        <div className="mt-3">
          <LoadError error={index.error} onRetry={index.retry} />
        </div>
      ) : kanji ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={kanji.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <RandomKanji kanji={kanji} onOpenKanji={() => stack.open({ t: 'k', ch: kanji.kanji })} onOpenWord={(id) => stack.open({ t: 'w', id })} />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6" role="status" aria-busy="true" aria-label={t('home.dangTaiChuHan')}>
          <div className="flex items-center gap-4 sm:w-[19rem]">
            <Skeleton className="size-20 shrink-0 bg-surface/60 sm:size-24" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-28 bg-surface/60" />
              <Skeleton className="h-4 w-40 bg-surface/60" />
            </div>
          </div>
          <div className="flex-1 space-y-0.5">
            {Array.from({ length: MAX_WORDS }, (_, i) => (
              <Skeleton key={i} className="h-11 bg-surface/60" />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ───────────── Hàng 1: Ôn tập hôm nay | Học tiếp ───────────── */

function ReviewToday() {
  const due = useDueIds().length
  const cards = useCards()
  const now = useNow()
  const current = useMemo(() => Object.values(cards).filter((c) => isCurrentId(c.id)), [cards])
  const tomorrow = useMemo(() => dueForecast(current, now)[1] ?? 0, [current, now])
  return (
    <section aria-labelledby="due" className={CARD} data-due-card>
      <h2 id="due" className="text-sm font-medium text-muted">{t('home.onTapHomNay')}</h2>
      <p className="mt-1 flex items-baseline gap-2">
        {tRich('home.dueCount', { n: due }, {
          n: () => <AnimatedNumber value={due} className={`text-4xl font-bold tabular-nums ${due > 0 ? 'text-ai' : 'text-muted'}`} />,
        })}
      </p>
      <p className="mt-1 min-h-5 text-sm text-muted" data-due-tomorrow>
        {due > 0 ? t('home.onXongDeGiu') : current.length > 0 ? t('home.ngayMaiThe', { tomorrow }) : t('home.hocBaiMoiThe')}
      </p>
      <ButtonLink
        to="/review"
        className={`mt-auto inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold ${due > 0 ? 'bg-ai text-on-ai hover:opacity-90' : 'border border-line text-muted hover:bg-sunken hover:text-ink'}`}
      >
        {due > 0 ? t('home.batDau') : t('home.xemLichOn')}
      </ButtonLink>
    </section>
  )
}

type Activity = { kind: 'vocab'; deck: VocabDeckKey } | { kind: 'kanji' }

/** Bộ của thẻ ôn gần nhất (từ vựng hoặc chữ Hán); chưa học gì thì N5. */
function lastActivity(cards: Record<string, SrsCard>): Activity {
  let best: SrsCard | undefined
  const prefixes = new Set([...Object.values(DECK_ID_PREFIX), 'kj'])
  for (const c of Object.values(cards)) {
    if (!c.last_review || !isCurrentId(c.id) || !prefixes.has(c.id.split('-')[0])) continue
    if (!best || c.last_review > best.last_review) best = c
  }
  const prefix = best?.id.split('-')[0]
  if (prefix === 'kj') return { kind: 'kanji' }
  const deck = (Object.keys(DECK_ID_PREFIX) as VocabDeckKey[]).find((k) => DECK_ID_PREFIX[k] === prefix)
  return { kind: 'vocab', deck: deck ?? 'n5' }
}

/** Học tiếp: bài dở dang gần nhất (tên bài, tiến độ, nút Tiếp tục). */
function ContinueCard() {
  const cards = useCards()
  const size = useLessonSize()
  const activity = lastActivity(cards)
  const deck: VocabDeckKey = activity.kind === 'vocab' ? activity.deck : 'n5'
  const vocab = useVocab({ kind: 'vocab', key: deck })
  const kanji = useKanjiIndex()
  const items: readonly { id: string }[] | undefined = activity.kind === 'kanji' ? kanji.data : vocab.data
  const lesson = useMemo(() => {
    if (!items) return null
    const prog = splitLessons(items, size).map((l) => lessonProgress(l.map((w) => w.id), cards))
    const i = continueLesson(prog)
    return { i, ...prog[i] }
  }, [items, size, cards])

  const name = activity.kind === 'kanji' ? t('common.chuHan') : deckTitle({ kind: 'vocab', key: deck })
  const unit = activity.kind === 'kanji' ? 'char' : 'word'
  const href = lesson ? (activity.kind === 'kanji' ? `/kanji?bai=${lesson.i + 1}` : `/vocab/${deck}/${lesson.i + 1}`) : '/learn'
  const started = Boolean(lesson && lesson.learned > 0)
  return (
    <section aria-labelledby="continue" className={CARD} data-continue-card>
      <h2 id="continue" className="text-sm font-medium text-muted">{t('home.hocTiep')}</h2>
      {lesson ? (
        <>
          <p className="mt-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-2" data-continue-title>
            <span className="text-xl font-bold">{t('common.bai', { v: lesson.i + 1 })}</span>
            <span className="truncate text-sm font-medium text-muted sm:text-base">{name}</span>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar total={lesson.total} learned={lesson.learned} mastered={lesson.mastered} label={t('home.tienDoBai', { v: lesson.i + 1 })} />
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {t('common.progressOf', { learned: lesson.learned, total: lesson.total, unit })}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-1 space-y-2" role="status" aria-busy="true" aria-label={t('home.dangTaiBaiHoc')}>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4" />
        </div>
      )}
      <ButtonLink to={href} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-ai px-4 font-semibold text-ai hover:bg-ai-soft">
        {started ? t('home.tiepTuc') : t('home.batDauHoc')}
      </ButtonLink>
    </section>
  )
}

export function Home() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <h1 className="sr-only">{t('home.kotonohaTrangChu')}</h1>
      <div className="grid grid-cols-2 gap-3 lg:gap-5">
        <ReviewToday />
        <ContinueCard />
      </div>
      <RandomKanjiCard />
    </div>
  )
}

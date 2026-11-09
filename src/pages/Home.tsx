import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { GridCell } from '../components/GridCell'
import { LoadError, Skeleton } from '../components/LoadState'
import { ButtonLink, CardLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { SpeakButton } from '../components/SpeakButton'
import { BookmarkButton } from '../components/notebook/BookmarkButton'
import { Stagger, StaggerItem } from '../components/Stagger'
import { DECK_ID_PREFIX, EXTRA_DECKS, LEVEL_DECKS, TERM_INFO, VOCAB_DECK_INFO, getTerms, isCurrentId } from '../data'
import { useEntries, useKanjiIndex, useManifest, useVocab } from '../hooks/useData'
import { useDetailStack } from '../hooks/useDetailStack'
import { useCards, useDueIds, useNow, usePrefixStats } from '../hooks/useProgress'
import { dueForecast, forecastLabels } from '../lib/forecast'
import { continueLesson, lessonProgress, splitLessons } from '../lib/lessons'
import { useLessonSize } from '../lib/settings'
import { fetchKanjiWords } from '../lib/kanjiWordsApi'
import { kanjiPool, mergeKanjiWords, pickRandom, pushRecent, readRecent, type CardWord } from '../lib/randomKanji'
import { speechText } from '../lib/speech'
import { webWords } from '../lib/webWords'
import { PUBLIC_BUILD, PUBLIC_GRAMMAR_NOTE } from '../lib/edition'
import { TERM_CATEGORIES, type DataManifest, type KanjiEntry, type SrsCard, type TermCategory, type VocabDeckKey } from '../types'

const CARD = 'flex h-full rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ai sm:p-5'

const fileCount = (m: DataManifest | undefined, path: string) => m?.files.find((f) => f.path === path)?.count

/** Số từ đi kèm tối đa trên thẻ. */
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
  // Số hàng giữ chỗ: biết trước nếu dữ liệu có đủ MAX_WORDS từ (hoặc mất mạng); còn chờ Mazii thì giữ đủ MAX_WORDS.
  const slots = kanji.wordCount >= MAX_WORDS || !isOnline() ? Math.min(kanji.wordCount, MAX_WORDS) : MAX_WORDS
  return { words: merged.items.slice(0, MAX_WORDS), total: merged.total, slots, loading: !localReady || fetching, error: local.status === 'error' }
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

function RandomKanji({ kanji, onOpenWord }: { kanji: KanjiEntry; onOpenWord: (id: string) => void }) {
  const { words, total, slots, loading } = useKanjiWords(kanji)
  return (
    <div data-random-kanji={kanji.kanji}>
      <div className="mt-4 flex items-center gap-[clamp(1rem,5cqw,1.75rem)]">
        <GridCell className="w-[clamp(6rem,32cqw,10rem)]">{kanji.kanji}</GridCell>
        <div className="min-w-0">
          <p className="text-[clamp(1.5rem,8cqw,2.5rem)] leading-tight font-bold tracking-wide">{kanji.hanViet}</p>
          {kanji.hanVietAlt?.length ? <p className="mt-1 text-muted">Âm khác: {kanji.hanVietAlt.join(', ')}</p> : null}
          <p className="mt-2 text-sm text-muted" data-word-total={total}>
            <span className="inline-block min-w-[2ch] text-right tabular-nums">{total}</span> từ chứa chữ này
            {kanji.firstLevel && `, xuất hiện từ ${kanji.firstLevel}`}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <Link to={`/kanji?k=${encodeURIComponent(kanji.kanji)}`} className="mr-2 inline-block text-sm font-medium text-ai hover:underline">
              Xem các từ
            </Link>
            <BookmarkButton itemRef={kanji.id} label={`chữ ${kanji.kanji}`} size="sm" />
          </div>
        </div>
      </div>
      {(words.length > 0 || loading) && (
        <ul className="mt-5 space-y-1 border-t border-cell-line/60 pt-3 text-sm" aria-label={`Từ có chữ ${kanji.kanji}`} data-kanji-words>
          {words.map((w) => (
            <li key={w.id} data-kanji-word={w.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenWord(w.id)}
                className="-mx-2 flex min-h-11 min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface/60"
              >
                <span lang="ja" className="font-jp text-base font-semibold">
                  {w.word}
                </span>
                {w.reading && w.reading !== w.word && (
                  <span lang="ja" className="font-jp text-sm text-muted">
                    {w.reading}
                  </span>
                )}
                <span className="text-muted">{w.meaning}</span>
              </button>
              <SpeakButton text={w.speak} size="sm" label={`Nghe ${w.word}`} />
            </li>
          ))}
          {/* Giữ đúng số hàng sẽ hiện (cao bằng hàng thật, min-h-11) để từ về không làm thẻ đổi chiều cao. */}
          {loading &&
            Array.from({ length: Math.max(0, slots - words.length) }, (_, i) => (
              <li key={`s${i}`} role="status" aria-label="Đang tải từ đi kèm" className="flex min-h-11 items-center">
                <Skeleton className="h-5 w-2/3 bg-surface/60" />
              </li>
            ))}
        </ul>
      )}
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

  // Ghi chữ đang hiện vào danh sách gần đây (sessionStorage) để lần chọn sau không lặp lại.
  useEffect(() => {
    if (kanjiId) pushRecent(kanjiId)
  }, [kanjiId])

  // Trở lại app (foreground): đổi chữ, trừ khi đang xem chi tiết một từ.
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
    <section aria-labelledby="random-kanji" className="@container min-w-0 rounded-2xl bg-ai-soft p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h1 id="random-kanji" className="text-sm font-medium text-ai">
          Chữ Hán ngẫu nhiên
        </h1>
        {kanji && (
          <button
            type="button"
            onClick={choose}
            data-next-kanji
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ai hover:bg-surface/60 active:scale-95"
          >
            <DiceIcon />
            Chữ khác
          </button>
        )}
      </div>
      {index.status === 'error' ? (
        <div className="mt-4">
          <LoadError error={index.error} onRetry={index.retry} />
        </div>
      ) : kanji ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={kanji.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <RandomKanji kanji={kanji} onOpenWord={(id) => stack.open({ t: 'w', id })} />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="mt-4 flex items-center gap-6" role="status" aria-label="Đang tải chữ Hán ngẫu nhiên">
          <Skeleton className="size-28 shrink-0 bg-surface/60" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-32 bg-surface/60" />
            <Skeleton className="h-4 w-48 bg-surface/60" />
          </div>
        </div>
      )}
    </section>
  )
}

/** Biểu đồ cột nhỏ: số thẻ đến hạn 7 ngày tới (từ `due` của thẻ, không cần lịch sử). */
function Forecast({ counts, labels }: { counts: number[]; labels: string[] }) {
  const max = Math.max(1, ...counts)
  return (
    <figure className="w-full" data-due-forecast>
      <figcaption className="mb-2 text-sm text-muted">Thẻ đến hạn 7 ngày tới</figcaption>
      <ol className="grid h-20 grid-cols-7 items-end gap-1.5">
        {counts.map((n, i) => (
          <li key={i} className="flex h-full flex-col items-center justify-end gap-1" aria-label={`${labels[i]}: ${n} thẻ`}>
            <span className="text-[11px] leading-none tabular-nums text-muted">{n || ''}</span>
            <span className={`w-full rounded-t ${i === 0 ? 'bg-ai' : 'bg-ai-soft'}`} style={{ height: `${Math.max(4, (n / max) * 80)}%` }} />
          </li>
        ))}
      </ol>
      <div className="mt-1 grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted" aria-hidden>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </figure>
  )
}

/** Bộ từ đang học: bộ của thẻ ôn gần nhất (mặc định N5). */
function activeDeck(cards: Record<string, SrsCard>): VocabDeckKey {
  let best: SrsCard | undefined
  for (const c of Object.values(cards)) if (isCurrentId(c.id) && (!best || c.lastReviewed > best.lastReviewed)) best = c
  const prefix = best?.id.split('-')[0]
  return (Object.keys(DECK_ID_PREFIX) as VocabDeckKey[]).find((k) => DECK_ID_PREFIX[k] === prefix) ?? 'n5'
}

/** 3 bài gợi ý tiếp theo của bộ đang học: bắt đầu từ bài "học tiếp", bỏ bài đã thuộc hết. */
function NextLessons({ cards }: { cards: Record<string, SrsCard> }) {
  const deck = activeDeck(cards)
  const vocab = useVocab({ kind: 'vocab', key: deck })
  const size = useLessonSize()
  const next = useMemo(() => {
    if (!vocab.data) return []
    const prog = splitLessons(vocab.data, size).map((l) => lessonProgress(l.map((w) => w.id), cards))
    const from = continueLesson(prog)
    return prog
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.i >= from && p.state !== 'mastered')
      .slice(0, 3)
  }, [vocab.data, size, cards])
  const info = VOCAB_DECK_INFO[deck]
  return (
    <div className="w-full" data-next-lessons>
      <p className="mb-2 text-sm text-muted">Bài tiếp theo · {info.level ?? info.name}</p>
      <ul className="space-y-1.5">
        {vocab.data
          ? next.map((l) => (
              <li key={l.i}>
                <Link to={`/vocab/${deck}/${l.i + 1}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line px-3 hover:border-ai">
                  <span className="font-medium">Bài {l.i + 1}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {l.learned}/{l.total} từ
                  </span>
                </Link>
              </li>
            ))
          : Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-11" />
              </li>
            ))}
      </ul>
    </div>
  )
}

function DueCard() {
  const due = useDueIds().length
  const cards = useCards()
  const now = useNow()
  // Thẻ của dữ liệu hiện tại (bỏ id cũ không còn) để số "đang chờ" khớp với trang Ôn tập.
  const current = useMemo(() => Object.values(cards).filter((c) => isCurrentId(c.id)), [cards])
  const counts = useMemo(() => dueForecast(current, now), [current, now])
  const labels = useMemo(() => forecastLabels(now), [now])
  return (
    <section aria-labelledby="due" className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 lg:p-6" data-due-card>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="due" className="font-semibold lg:text-sm lg:font-medium lg:text-muted">
            {due > 0 ? (
              <>
                <span className="lg:hidden">{due} thẻ cần ôn hôm nay</span>
                <span className="hidden lg:inline">Cần ôn hôm nay</span>
              </>
            ) : (
              'Không có thẻ nào đến hạn'
            )}
          </h2>
          <p className="hidden lg:mt-1 lg:block">
            <AnimatedNumber value={due > 0 ? due : current.length} className={`text-5xl font-bold ${due > 0 ? 'text-ai' : 'text-muted'}`} />
            <span className="ml-2 text-muted">{due > 0 ? 'thẻ' : 'thẻ đang chờ trong lịch ôn'}</span>
          </p>
        </div>
        <ButtonLink
          to={due > 0 ? '/review' : '/vocab/n5'}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90"
        >
          {due > 0 ? 'Ôn tập ngay' : 'Học từ N5'}
        </ButtonLink>
      </div>
      {current.length > 0 ? (
        <Forecast counts={counts} labels={labels} />
      ) : (
        <p className="text-sm text-muted">Học từ mới bằng flashcard hoặc quiz, chúng sẽ tự vào lịch ôn.</p>
      )}
      <NextLessons cards={cards} />
    </section>
  )
}

function DeckCard({ deckKey, manifest }: { deckKey: VocabDeckKey; manifest?: DataManifest }) {
  const info = VOCAB_DECK_INFO[deckKey]
  const total = fileCount(manifest, info.path)
  const stats = usePrefixStats(DECK_ID_PREFIX[deckKey], total ?? 0)
  const lessons = total !== undefined && manifest ? Math.ceil(total / manifest.pageSize) : undefined
  return (
    <CardLink to={`/vocab/${deckKey}`} className={`${CARD} flex-col gap-3 md:gap-4`}>
      <div className="flex items-center gap-4">
        <GridCell fit={info.level ? 0.36 : undefined} className="size-12 font-bold text-ai md:size-14">
          {info.level ?? info.ja.slice(0, 1)}
        </GridCell>
        <div className="min-w-0">
          <p className="font-semibold">{info.name}</p>
          <p lang="ja" className="font-jp text-sm text-muted">
            {info.ja}
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <div className="h-5 text-sm text-muted">{total !== undefined ? `${total} từ, ${lessons} bài` : <Skeleton className="h-4 w-28" />}</div>
        <div className="mt-2.5 flex items-center gap-3">
          <ProgressBar {...stats} label={`Tiến độ ${info.name}`} />
          <span className="shrink-0 text-xs text-muted">
            <AnimatedNumber value={stats.learned} />/{total ?? '…'}
          </span>
        </div>
      </div>
    </CardLink>
  )
}

function TermCard({ category }: { category: TermCategory }) {
  const info = TERM_INFO[category]
  const stats = usePrefixStats(info.prefix, getTerms(category).length, '\\d{3}')
  return (
    <CardLink to={`/terms/${category}`} className={`${CARD} flex-col`}>
      <span lang="ja" className="font-jp text-2xl font-bold tracking-wide text-ai">
        {info.ja}
      </span>
      <span className="mt-3 font-semibold">{info.name}</span>
      <span className="mt-0.5 text-sm text-muted">{info.note}</span>
      <span className="mt-auto flex items-center gap-3 pt-4">
        <ProgressBar {...stats} label={`Tiến độ ${info.name}`} />
        <span className="shrink-0 text-xs text-muted">
          <AnimatedNumber value={stats.learned} />/{stats.total}
        </span>
      </span>
    </CardLink>
  )
}

function StudyMore({ manifest }: { manifest?: DataManifest }) {
  const kanji = fileCount(manifest, 'kanji/kanji.json')
  const radicals = fileCount(manifest, 'kanji/radicals.json')
  const grammar = manifest?.files.filter((f) => f.kind === 'grammar').reduce((n, f) => n + f.count, 0)
  const items = [
    { to: '/kanji', glyph: '漢', title: 'Chữ Hán', detail: kanji !== undefined ? `${kanji} chữ, ${radicals} bộ thủ, quiz âm Hán Việt` : '' },
    { to: '/grammar', glyph: '文', title: 'Ngữ pháp', detail: PUBLIC_BUILD ? PUBLIC_GRAMMAR_NOTE : grammar !== undefined ? `${grammar} mẫu từ N4 đến N1` : '' },
    { to: '/kana', glyph: 'あ', title: 'Luyện kana', detail: 'Hiragana, katakana, gõ romaji' },
  ]
  return (
    <Stagger as="ul" className="grid gap-3 md:grid-cols-3 lg:gap-4">
      {items.map((it) => (
        <StaggerItem as="li" key={it.to}>
          <CardLink to={it.to} className={`${CARD} items-center gap-4`}>
            <GridCell className="size-14 text-ai">{it.glyph}</GridCell>
            <span className="min-w-0">
              <span className="block font-semibold">{it.title}</span>
              <span className="block min-h-5 text-sm text-muted">{it.detail}</span>
            </span>
          </CardLink>
        </StaggerItem>
      ))}
    </Stagger>
  )
}

export function Home() {
  const manifest = useManifest()
  const m = manifest.data

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <RandomKanjiCard />
        <DueCard />
      </div>

      {manifest.status === 'error' && <LoadError error={manifest.error} onRetry={manifest.retry} />}

      <section aria-labelledby="levels">
        <h2 id="levels" className="mb-4 text-xl font-bold tracking-tight">
          Từ vựng JLPT
        </h2>
        <Stagger as="ol" className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {LEVEL_DECKS.map((k) => (
            <StaggerItem as="li" key={k}>
              <DeckCard deckKey={k} manifest={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="extra">
        <h2 id="extra" className="mb-4 text-xl font-bold tracking-tight">
          Bộ từ khác
        </h2>
        <Stagger as="ul" className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {EXTRA_DECKS.map((k) => (
            <StaggerItem as="li" key={k}>
              <DeckCard deckKey={k} manifest={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="more">
        <h2 id="more" className="mb-4 text-xl font-bold tracking-tight">
          Chữ Hán, ngữ pháp, kana
        </h2>
        <StudyMore manifest={m} />
      </section>

      <section aria-labelledby="terms">
        <h2 id="terms" className="text-xl font-bold tracking-tight">
          Thuật ngữ chuyên ngành
        </h2>
        <p className="mt-1 text-sm text-muted">Từ vựng dùng hằng ngày ở công ty Nhật.</p>
        <Stagger as="ul" className="mt-4 grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {TERM_CATEGORIES.map((c) => (
            <StaggerItem as="li" key={c}>
              <TermCard category={c} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </div>
  )
}

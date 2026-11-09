import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { KANA_BY_ID } from '../../data/kana'
import { kanaMatches } from '../../lib/answer'
import { kanaProgress, type KanaStat } from '../../lib/kanaProgress'
import { kanaExamples } from '../../lib/kanaExamples'
import { useFiles } from '../../hooks/useData'
import { FlashcardSession, type FlashcardGrader } from '../study/FlashcardSession'
import { kanaFaces } from '../study/faces'
import { STUDY_PAGE } from '../StudyLayout'
import {
  advance,
  answer,
  buildOptions,
  createSession,
  isFinished,
  type CountChoice,
  type ModeChoice,
  type QuestionMode,
  type SessionState,
} from '../../lib/kanaSession'
import { isInteractiveTarget } from '../../lib/keyboard'
import { speak, useJapaneseVoice } from '../../lib/speech'
import { readJSON, writeJSON } from '../../lib/storage'
import type { KanaChar, VocabItem } from '../../types'
import { AnimatedNumber } from '../AnimatedNumber'
import { Celebration } from '../Celebration'
import { GridCell } from '../GridCell'
import { Button } from '../Pressable'
import { Segmented } from '../Segmented'
import { useDockQuiet } from '../../lib/ai/dock'

/* ───────────── Cài đặt (nhớ lựa chọn lần trước) ───────────── */

/** 'flashcard': lật thẻ, vuốt Nhớ / Chưa nhớ (không phải câu hỏi) */
type PracticeMode = ModeChoice | 'flashcard'

interface PracticeSettings {
  mode: PracticeMode
  count: CountChoice
}

const MODES: { value: PracticeMode; label: string; detail: string; sample: string }[] = [
  { value: 'flashcard', label: 'Flashcard', detail: 'Lật thẻ, tự chấm Nhớ / Chưa nhớ', sample: 'か ↔ ka' },
  { value: 'typing', label: 'Gõ romaji', detail: 'Nhìn chữ, gõ cách đọc', sample: 'か → ka' },
  { value: 'choice', label: 'Trắc nghiệm', detail: 'Nhìn chữ, chọn cách đọc', sample: 'か → ka' },
  { value: 'reverse', label: 'Ngược lại', detail: 'Nhìn romaji, chọn chữ', sample: 'ka → か' },
  { value: 'listen', label: 'Nghe', detail: 'Nghe phát âm, chọn chữ', sample: '🔊 → か' },
  { value: 'mixed', label: 'Trộn', detail: 'Mỗi câu một kiểu ngẫu nhiên', sample: '' },
]

const DEFAULT_SETTINGS: PracticeSettings = { mode: 'typing', count: 'each' }

function loadSettings(): PracticeSettings {
  const s = readJSON<Partial<PracticeSettings>>('kana-practice', {})
  return {
    mode: MODES.some((m) => m.value === s.mode) ? (s.mode as PracticeMode) : DEFAULT_SETTINGS.mode,
    count: s.count === 20 || s.count === 50 || s.count === 'each' ? s.count : DEFAULT_SETTINGS.count,
  }
}

const SPRING = { type: 'spring', stiffness: 500, damping: 30 } as const
const SHAKE = { x: [0, -10, 10, -8, 8, -4, 4, 0] }
const SHAKE_T = { duration: 0.35 }
const BOUNCE = { scale: [1, 1.08, 1] }

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  )
}

function Setup({
  chars,
  title,
  initial,
  voice,
  onStart,
  onExit,
}: {
  chars: KanaChar[]
  title: string
  initial: PracticeSettings
  voice: boolean | null
  onStart: (s: PracticeSettings) => void
  onExit: () => void
}) {
  const [mode, setMode] = useState<PracticeMode>(initial.mode === 'listen' && voice !== true ? 'choice' : initial.mode)
  const [count, setCount] = useState<CountChoice>(initial.count)
  const modes = MODES.filter((m) => m.value !== 'listen' || voice === true)
  const effectiveMode = mode === 'listen' && voice !== true ? 'choice' : mode

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <CloseButton onClick={onExit} label="Về bảng chữ cái" />
      </div>
      <p lang="ja" className="line-clamp-2 font-jp text-lg tracking-wider text-muted">
        {chars.map((k) => k.kana).join(' ')}
      </p>

      <fieldset className="mt-6">
        <legend className="mb-2 font-semibold">Kiểu câu hỏi</legend>
        <div role="radiogroup" aria-label="Kiểu câu hỏi" className="grid gap-2 sm:grid-cols-2">
          {modes.map((m) => {
            const on = effectiveMode === m.value
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m.value)}
                className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 px-4 py-2.5 text-left transition-colors ${
                  on ? 'border-ai bg-ai-soft' : 'border-line bg-surface hover:border-ai'
                }`}
              >
                <span>
                  <span className="block font-semibold">{m.label}</span>
                  <span className="block text-sm text-muted">{m.detail}</span>
                </span>
                {m.sample && (
                  <span lang="ja" className="shrink-0 font-jp text-sm text-muted">
                    {m.sample}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {voice === false && (
          <p className="mt-2 text-sm text-muted">
            Không có kiểu Nghe: máy này chưa có giọng đọc tiếng Nhật (ja-JP). Cài thêm giọng tiếng Nhật trong cài đặt ngôn ngữ của hệ thống rồi mở lại
            trang.
          </p>
        )}
        {voice === null && <p className="mt-2 text-sm text-muted">Đang kiểm tra giọng đọc tiếng Nhật…</p>}
      </fieldset>

      {effectiveMode !== 'flashcard' && (
      <fieldset className="mt-6">
        <legend className="mb-2 font-semibold">Số câu</legend>
        <Segmented<CountChoice>
          label="Số câu"
          value={count}
          onChange={setCount}
          options={[
            { value: 'each', label: `Mỗi chữ 1 lần (${chars.length})` },
            { value: 20, label: '20 câu' },
            { value: 50, label: '50 câu' },
          ]}
        />
      </fieldset>
      )}

      <Button
        onClick={() => onStart({ mode: effectiveMode, count })}
        className="mt-8 min-h-14 w-full rounded-xl bg-ai text-lg font-semibold text-on-ai hover:opacity-90"
      >
        Bắt đầu
      </Button>
      <p className="mt-3 text-center text-sm text-muted">
        {effectiveMode === 'flashcard'
          ? 'Mỗi chữ một thẻ: Space lật, ← Chưa nhớ, → Đã nhớ, Z hoàn tác.'
          : 'Trả lời sai thì chữ đó được hỏi lại sau vài câu. Phiên kết thúc khi mọi chữ đều đúng.'}
      </p>
    </div>
  )
}

/* ───────────── Câu hỏi ───────────── */

type Verdict = null | boolean

const PROMPT: Record<QuestionMode, string> = {
  typing: 'Gõ romaji của chữ này',
  choice: 'Chữ này đọc là gì?',
  reverse: 'Chọn chữ đúng',
  listen: 'Nghe và chọn chữ đúng',
}

/** Giữ ô nhập trong vùng nhìn thấy khi bàn phím ảo bật lên (visualViewport co lại). */
function useKeepInView(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport
    const el = ref.current
    if (!el) return
    const center = () => {
      if (document.activeElement !== el) return
      const r = el.getBoundingClientRect()
      const height = vv?.height ?? window.innerHeight
      const top = vv?.offsetTop ?? 0
      // Chỉ cuộn khi ô nhập (và nút bên dưới) bị che.
      if (r.bottom + 72 > top + height || r.top < top) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    el.addEventListener('focus', center)
    vv?.addEventListener('resize', center)
    return () => {
      el.removeEventListener('focus', center)
      vv?.removeEventListener('resize', center)
    }
  }, [ref])
}

function Question({
  k,
  mode,
  verdict,
  onAnswer,
  onNext,
}: {
  k: KanaChar
  mode: QuestionMode
  verdict: Verdict
  onAnswer: (correct: boolean, picked?: string) => void
  onNext: () => void
}) {
  // Đáp án lập một lần cho mỗi câu (component được tạo mới theo key = step).
  const [options] = useState(() => (mode === 'typing' ? [] : buildOptions(k)))
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Câu đang trượt ra (hiệu ứng chuyển câu): không tương tác, không giữ id của ô nhập.
  const present = useIsPresent()
  const answered = verdict !== null || !present
  useKeepInView(inputRef)

  // Kiểu nghe: tự đọc khi hiện câu.
  useEffect(() => {
    if (mode === 'listen') speak(k.kana, 0.8)
  }, [mode, k.kana])

  const choose = useCallback(
    (o: KanaChar) => {
      if (answered) return
      setPicked(o.id)
      onAnswer(o.romaji === k.romaji, o.id)
    },
    [answered, k.romaji, onAnswer],
  )

  // Phím: 1–4 chọn đáp án, R nghe lại.
  useEffect(() => {
    if (mode === 'typing') return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) choose(options[n - 1])
      else if (e.key.toLowerCase() === 'r' && mode === 'listen') speak(k.kana, 0.8)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, options, choose, k.kana])

  const onType = (value: string) => {
    if (answered) return
    setTyped(value)
    // Gõ đúng thì tự chấm; gõ sai thì chờ Enter (không tự chấm sai giữa chừng).
    if (kanaMatches(value, k.kana)) onAnswer(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (answered) return onNext()
    if (!typed.trim()) return
    onAnswer(kanaMatches(typed, k.kana))
  }

  const tone = verdict === null ? 'default' : verdict ? 'correct' : 'wrong'
  const feedback = answered ? (verdict ? BOUNCE : SHAKE) : { scale: 1, x: 0 }
  const feedbackT = answered && !verdict ? SHAKE_T : { duration: 0.3 }

  // Ô hiển thị câu hỏi: chữ (gõ, trắc nghiệm), romaji (ngược lại), loa (nghe).
  const prompt =
    mode === 'reverse' ? (
      <div
        className={`grid aspect-square w-[clamp(8.5rem,38vw,11rem)] place-items-center rounded-[3px] border-2 text-[clamp(2.5rem,12vw,3.5rem)] font-bold tracking-wide ${
          tone === 'default' ? 'border-cell-line bg-surface' : tone === 'correct' ? 'border-matsu bg-matsu-soft' : 'border-beni bg-beni-soft'
        }`}
      >
        {k.romaji}
      </div>
    ) : mode === 'listen' ? (
      <button
        type="button"
        onClick={() => speak(k.kana, 0.8)}
        aria-label="Nghe lại"
        className={`grid aspect-square w-[clamp(8.5rem,38vw,11rem)] place-items-center rounded-full border-2 text-ai transition-colors hover:bg-ai-soft ${
          tone === 'default' ? 'border-cell-line bg-surface' : tone === 'correct' ? 'border-matsu bg-matsu-soft' : 'border-beni bg-beni-soft'
        }`}
      >
        {answered ? (
          <span lang="ja" className="font-jp text-6xl text-ink">
            {k.kana}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" className="size-1/2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        )}
      </button>
    ) : (
      <GridCell tone={tone} className="w-[clamp(8.5rem,38vw,11rem)]">
        {k.kana}
      </GridCell>
    )

  return (
    <div className="flex flex-col items-center" inert={!present} aria-hidden={!present || undefined}>
      <p className="mb-4 text-sm text-muted">
        {PROMPT[mode]}
        {mode === 'listen' && <span className="hidden lg:inline"> (phím R nghe lại)</span>}
      </p>
      <motion.div animate={feedback} transition={feedbackT} data-kana-question={present ? mode : undefined}>
        {prompt}
      </motion.div>

      {mode === 'typing' ? (
        <form onSubmit={onSubmit} className="mt-6 w-full max-w-xs">
          <label htmlFor="kana-answer" className="sr-only">
            Gõ romaji
          </label>
          <input
            id={present ? 'kana-answer' : undefined}
            ref={inputRef}
            autoFocus={present}
            value={typed}
            onChange={(e) => onType(e.target.value)}
            readOnly={answered}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={answered ? 'next' : 'go'}
            placeholder="Gõ romaji, ví dụ: ka"
            className={`h-14 w-full rounded-xl border-2 bg-surface px-4 text-center text-xl tracking-wider outline-none placeholder:text-base placeholder:tracking-normal placeholder:text-muted/70 ${
              tone === 'correct' ? 'border-matsu' : tone === 'wrong' ? 'border-beni' : 'border-line focus:border-ai'
            }`}
          />
          {!answered && (
            <Button type="submit" className="mt-3 min-h-12 w-full rounded-xl bg-ai font-semibold text-on-ai hover:opacity-90">
              Kiểm tra
            </Button>
          )}
        </form>
      ) : (
        <ul className="mt-6 grid w-full grid-cols-2 gap-2.5 sm:gap-3">
          {options.map((o, i) => {
            const isAnswer = o.romaji === k.romaji
            const state = !answered ? 'idle' : isAnswer ? 'right' : picked === o.id ? 'wrong' : 'dim'
            const cls = {
              idle: 'border-line bg-surface hover:border-ai',
              right: 'border-matsu bg-matsu-soft text-matsu',
              wrong: 'border-beni bg-beni-soft text-beni',
              dim: 'border-line bg-surface opacity-50',
            }[state]
            const showKana = mode === 'reverse' || mode === 'listen'
            return (
              <li key={o.id}>
                <motion.button
                  type="button"
                  disabled={answered}
                  data-option={showKana ? o.kana : o.romaji}
                  onClick={() => choose(o)}
                  whileTap={answered ? undefined : { scale: 0.97 }}
                  animate={state === 'right' ? { scale: 1.03, x: 0 } : state === 'wrong' ? SHAKE : { scale: 1, x: 0 }}
                  transition={state === 'wrong' ? SHAKE_T : SPRING}
                  className={`relative flex min-h-16 w-full items-center justify-center rounded-xl border-2 px-3 py-3 font-semibold transition-colors sm:min-h-20 ${cls}`}
                >
                  <span className="absolute left-2.5 top-2 hidden text-xs font-normal opacity-60 lg:block">{i + 1}</span>
                  {showKana ? (
                    <span lang="ja" className="font-jp text-3xl font-normal sm:text-4xl">
                      {o.kana}
                    </span>
                  ) : (
                    <span className="text-2xl tracking-wide sm:text-3xl">{o.romaji}</span>
                  )}
                </motion.button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ───────────── Màn kết thúc ───────────── */

function formatTime(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Result({
  s,
  ms,
  onRetryWrong,
  onRestart,
  onExit,
}: {
  s: SessionState
  ms: number
  onRetryWrong?: () => void
  onRestart: () => void
  onExit: () => void
}) {
  const perfect = s.firstTry === s.planned
  const accuracy = s.answers ? Math.round((s.correct / s.answers) * 100) : 0
  const wrong = Object.entries(s.mistakes)
    .map(([id, n]) => ({ k: KANA_BY_ID.get(id)!, n }))
    .filter((x) => x.k)
    .sort((a, b) => b.n - a.n)

  return (
    <div className="mx-auto max-w-[560px]" data-kana-result>
      {perfect && <Celebration />}
      <section className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-sm font-medium text-muted">{perfect ? 'Hoàn hảo, đúng hết ngay lần đầu' : 'Hoàn thành phiên luyện'}</p>
        <p className="mt-2 text-5xl font-bold tabular-nums">
          <AnimatedNumber value={s.firstTry} />
          <span className="text-2xl font-semibold text-muted">/{s.planned}</span>
        </p>
        <p className="mt-1 text-sm text-muted">câu đúng ngay lần đầu</p>
        <dl className="mt-6 grid grid-cols-3 divide-x divide-line">
          <div>
            <dt className="text-xs text-muted">Chính xác</dt>
            <dd className="text-xl font-bold tabular-nums">{accuracy}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Thời gian</dt>
            <dd className="text-xl font-bold tabular-nums">{formatTime(ms)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Chuỗi đúng dài nhất</dt>
            <dd className="text-xl font-bold tabular-nums">{s.bestStreak}</dd>
          </div>
        </dl>
      </section>

      {wrong.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold">Các chữ đã sai</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
            {wrong.map(({ k, n }) => (
              <li key={k.id}>
                <button
                  type="button"
                  onClick={() => speak(k.kana)}
                  aria-label={`${k.kana}, ${k.romaji}, sai ${n} lần, nghe phát âm`}
                  className="flex w-full flex-col items-center gap-1 rounded-xl border border-line bg-surface p-2 hover:border-ai"
                >
                  <GridCell tone="wrong" className="w-full max-w-16">
                    {k.kana}
                  </GridCell>
                  <span className="font-semibold">{k.romaji}</span>
                  <span className="text-xs text-beni">sai {n} lần</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {onRetryWrong && (
          <Button onClick={onRetryWrong} className="min-h-12 rounded-xl bg-ai px-5 font-semibold text-on-ai hover:opacity-90 sm:col-span-2">
            Luyện lại các chữ sai ({wrong.length})
          </Button>
        )}
        <Button
          onClick={onRestart}
          className={`min-h-12 rounded-xl px-5 font-semibold ${
            onRetryWrong ? 'border-2 border-ai text-ai hover:bg-ai-soft' : 'bg-ai text-on-ai hover:opacity-90'
          }`}
        >
          Luyện lại phiên này
        </Button>
        <Button onClick={onExit} className="min-h-12 rounded-xl border border-line px-5 font-semibold hover:bg-sunken">
          Về bảng chữ cái
        </Button>
      </div>
    </div>
  )
}

/* ───────────── Hộp xác nhận thoát ───────────── */

function ConfirmExit({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    stayRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onStay()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStay])
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kana-exit-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id="kana-exit-title" className="text-lg font-bold">
          Thoát phiên luyện?
        </h2>
        <p className="mt-1 text-sm text-muted">Mức thuộc của các chữ đã trả lời vẫn được lưu. Phiên này sẽ không có màn tổng kết.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button ref={stayRef} type="button" onClick={onStay} className="min-h-12 rounded-xl bg-ai font-semibold text-on-ai hover:opacity-90">
            Luyện tiếp
          </button>
          <button type="button" onClick={onLeave} className="min-h-12 rounded-xl border border-beni font-semibold text-beni hover:bg-beni-soft">
            Thoát
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

/* ───────────── Flashcard ───────────── */

const KANA_WORD_FILES = ['vocab/n5.json', 'vocab/n4.json']

/** Flashcard kana: chấm Nhớ = đúng ngay lần đầu, Chưa nhớ = sai (cùng quy tắc mức thuộc với phiên luyện). */
const kanaGrader: FlashcardGrader = {
  grade: (id, known) => {
    const prev = kanaProgress.getSnapshot()[id]
    kanaProgress.record(id, known, true)
    return prev
  },
  restore: (id, prev) => kanaProgress.restore(id, prev as KanaStat | undefined),
}

function KanaFlashcards({ chars, title, onExit }: { chars: KanaChar[]; title: string; onExit: () => void }) {
  const files = useFiles(KANA_WORD_FILES)
  const loaded = files.data.filter(Boolean).length
  const examples = useMemo(
    () => kanaExamples(chars, files.data.flatMap((d) => (Array.isArray(d) ? (d as VocabItem[]) : []))),
    // files.data là mảng mới mỗi lần render; số file đã tải đủ để biết khi nào tính lại.
    [chars, loaded], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const faces = useMemo(() => kanaFaces(examples), [examples])
  // "Về bảng chữ cái" ở màn tổng kết là link /kana (bỏ ?luyen=1) nên trang tự về bảng chữ.
  return (
    <div className={STUDY_PAGE} data-kana-flashcards>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <CloseButton onClick={onExit} label="Về bảng chữ cái" />
      </div>
      <FlashcardSession
          items={chars}
          faces={faces}
          label={(k) => `chữ ${k.kana}`}
          grader={kanaGrader}
          bookmark={false}
          back={{ to: '/kana', label: 'Về bảng chữ cái' }}
        />
    </div>
  )
}

/* ───────────── Phiên luyện ───────────── */

interface Run {
  ids: string[]
  settings: PracticeSettings
  /** Tăng mỗi lần bắt đầu lại để dựng phiên mới */
  round: number
}

function Runner({ run, available, onRetryWrong, onRestart, onExit }: {
  run: Run
  available: QuestionMode[]
  onRetryWrong: (ids: string[]) => void
  onRestart: () => void
  onExit: () => void
}) {
  const mode = run.settings.mode as ModeChoice
  const [s, setS] = useState(() => createSession(run.ids, run.settings.count, mode, available))
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const nextRef = useRef<HTMLButtonElement>(null)

  const head = s.queue[0]
  const k = head ? KANA_BY_ID.get(head.id) : undefined

  const onAnswer = useCallback(
    (correct: boolean) => {
      if (verdict !== null || !head) return
      const r = answer(s, correct)
      setS(r.state)
      setVerdict(correct)
      kanaProgress.record(head.id, correct, r.firstAttempt)
    },
    [verdict, head, s],
  )

  const onNext = useCallback(() => {
    if (verdict === null) return
    const next = advance(s, verdict, mode, available)
    setS(next)
    setVerdict(null)
    if (isFinished(next)) setElapsed(Date.now() - startedAt)
  }, [verdict, s, mode, available, startedAt])

  // Đúng thì tự chuyển câu sau một nhịp ngắn; sai thì chờ Enter / nút "Tiếp".
  useEffect(() => {
    if (verdict !== true) return
    const t = setTimeout(onNext, 650)
    return () => clearTimeout(t)
  }, [verdict, onNext])

  // Sai ở kiểu trắc nghiệm: đưa focus vào nút "Tiếp" để Enter hoạt động ngay.
  useEffect(() => {
    if (verdict === false && head?.mode !== 'typing') nextRef.current?.focus()
  }, [verdict, head?.mode])

  const exit = useCallback(() => (s.answers >= 3 && !isFinished(s) ? setConfirming(true) : onExit()), [s, onExit])

  // Enter sang câu (khi focus không ở ô nhập/nút), Esc thoát.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) {
        e.preventDefault()
        exit()
        return
      }
      if (e.key === 'Enter' && verdict === false && !isInteractiveTarget(e)) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [verdict, onNext, exit, confirming])

  if (isFinished(s)) {
    const wrongIds = Object.keys(s.mistakes)
    return (
      <Result
        s={s}
        ms={elapsed}
        onRetryWrong={wrongIds.length ? () => onRetryWrong(wrongIds) : undefined}
        onRestart={onRestart}
        onExit={onExit}
      />
    )
  }
  if (!head || !k) return null

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-6 flex items-center gap-3">
        <CloseButton onClick={exit} label="Thoát phiên luyện" />
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
          <motion.div
            className="absolute inset-0 origin-left rounded-full bg-ai"
            initial={false}
            animate={{ scaleX: s.done / s.planned }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
          />
        </div>
        <span className="min-w-[4.5rem] text-right text-sm font-semibold tabular-nums" aria-live="polite" data-kana-progress>
          {s.done} / {s.planned}
        </span>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={s.step}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Question k={k} mode={head.mode} verdict={verdict} onAnswer={onAnswer} onNext={onNext} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div aria-live="polite" className="mt-5 flex min-h-14 flex-col items-center gap-3">
        {verdict === true && (
          <p className="font-semibold text-matsu">
            Đúng: <span className="tracking-wide">{k.romaji}</span>
          </p>
        )}
        {verdict === false && (
          <>
            <p className="font-semibold text-beni">
              Đáp án:{' '}
              <span lang="ja" className="font-jp text-xl text-ink">
                {k.kana}
              </span>{' '}
              = <span className="text-xl tracking-wide text-ink">{k.romaji}</span>
            </p>
            <Button ref={nextRef} onClick={onNext} className="min-h-12 w-full max-w-xs rounded-xl bg-ai font-semibold text-on-ai hover:opacity-90">
              Tiếp
            </Button>
            <p className="text-xs text-muted">Chữ này sẽ được hỏi lại sau vài câu. Bấm Enter để tiếp.</p>
          </>
        )}
      </div>

      {confirming && <ConfirmExit onStay={() => setConfirming(false)} onLeave={onExit} />}
    </div>
  )
}

/**
 * Phiên luyện kana: cài đặt → câu hỏi → kết thúc.
 * `chars`: các chữ được chọn từ bảng (hoặc chữ yếu, ôn ngẫu nhiên).
 */
export function KanaSession({ chars, title, onExit }: { chars: KanaChar[]; title: string; onExit: () => void }) {
  const voice = useJapaneseVoice()
  const [settings, setSettings] = useState(loadSettings)
  const [run, setRun] = useState<Run | null>(null)
  useDockQuiet(run !== null)
  const available: QuestionMode[] = voice ? ['typing', 'choice', 'reverse', 'listen'] : ['typing', 'choice', 'reverse']

  const start = (ids: string[], next: PracticeSettings) => {
    setRun((r) => ({ ids, settings: next, round: (r?.round ?? 0) + 1 }))
    window.scrollTo(0, 0)
  }

  if (!run)
    return (
      <Setup
        chars={chars}
        title={title}
        initial={settings}
        voice={voice}
        onExit={onExit}
        onStart={(next) => {
          setSettings(next)
          writeJSON('kana-practice', next)
          start(
            chars.map((c) => c.id),
            next,
          )
        }}
      />
    )

  if (run.settings.mode === 'flashcard')
    return <KanaFlashcards key={run.round} chars={run.ids.map((id) => KANA_BY_ID.get(id)!)} title={title} onExit={onExit} />

  return (
    <Runner
      key={run.round}
      run={run}
      available={available}
      // Luyện lại chữ sai: mỗi chữ một lần, cùng kiểu câu hỏi.
      onRetryWrong={(ids) => start(ids, { ...run.settings, count: 'each' })}
      onRestart={() => start(run.ids, run.settings)}
      onExit={onExit}
    />
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toHiragana } from 'wanakana'
import { AnimatedNumber } from '../AnimatedNumber'
import { Celebration } from '../Celebration'
import { GridCell } from '../GridCell'
import { Button } from '../Pressable'
import { Segmented } from '../Segmented'
import { SessionPanel, StudyLayout } from '../StudyLayout'
import { SpeakButton } from '../SpeakButton'
import { NumberPlusCounter } from './counterFaces'
import { normalizeReading, shuffle } from '../../lib/answer'
import {
  acceptedReadings,
  blankSentences,
  cellsOf,
  counterChoiceDistractors,
  counterRef,
  numberLabel,
  pickPairs,
  readingDistractors,
  shouldTrack,
  type BlankSentence,
  type CounterPair,
} from '../../lib/counters'
import { isInteractiveTarget } from '../../lib/keyboard'
import { progress } from '../../lib/progress'
import { quizGrade } from '../../lib/srs'
import type { CounterEntry } from '../../types'
import { useLeaveGuard, useStudySession } from '../../hooks/useStudySession'
import { ResumePrompt } from './ResumePrompt'

const LENGTH = 10
const SHAKE = { x: [0, -8, 8, -8, 8, -8, 8, 0] }

export type CounterQuizKind = 'mix' | 'reading' | 'choose' | 'type'

export const QUIZ_KINDS: { value: CounterQuizKind; label: string }[] = [
  { value: 'mix', label: 'Trộn' },
  { value: 'reading', label: 'Chọn cách đọc' },
  { value: 'choose', label: 'Chọn trợ số từ' },
  { value: 'type', label: 'Gõ cách đọc' },
]

type Question =
  | { t: 'reading'; pair: CounterPair; options: string[] }
  | { t: 'type'; pair: CounterPair }
  | { t: 'choose'; counter: CounterEntry; sentence: BlankSentence; options: string[] }

/**
 * 10 câu. Cặp số + trợ số từ lấy theo `pickPairs` (đến hạn → bất quy tắc → hay sai). Câu "chọn trợ số từ" lấy câu ví dụ
 * đục lỗ của trợ số từ đang luyện (có câu dùng được), nhiễu lấy từ cả bộ `pool`.
 */
export function buildCounterQuiz(counters: readonly CounterEntry[], pool: readonly CounterEntry[], kind: CounterQuizKind, now = Date.now()): Question[] {
  const pairs = pickPairs(counters, progress.getSnapshot(), now, LENGTH)
  const withSentence = shuffle(counters.filter((c) => blankSentences(c).length > 0))
  const choose = (i: number): Question | null => {
    const c = withSentence[i % Math.max(1, withSentence.length)]
    if (!c) return null
    const sentence = shuffle(blankSentences(c))[0]
    return { t: 'choose', counter: c, sentence, options: shuffle([c.counter, ...counterChoiceDistractors(c, pool)]) }
  }
  const reading = (p: CounterPair): Question => ({ t: 'reading', pair: p, options: shuffle([p.readings[0], ...readingDistractors(p.counter, p.key)]) })
  if (kind === 'choose') return Array.from({ length: Math.min(LENGTH, withSentence.length * 2) }, (_, i) => choose(i)).filter((q): q is Question => q !== null)
  return pairs.map((p, i) => {
    if (kind === 'reading') return reading(p)
    if (kind === 'type') return { t: 'type', pair: p }
    const slot = i % 3
    if (slot === 1) return choose(i) ?? reading(p)
    return slot === 0 ? reading(p) : { t: 'type', pair: p }
  })
}

/** Ghi lịch ôn theo quy tắc của Cách đếm: chỉ cặp sai, ô bất quy tắc hoặc mục đã có thẻ. */
function grade(id: string, correct: boolean, irregular: boolean) {
  if (shouldTrack({ correct, irregular, hasCard: Boolean(progress.getSnapshot()[id]) })) progress.grade(id, quizGrade(correct, false))
}

function correctOf(q: Question): string {
  return q.t === 'choose' ? q.counter.counter : q.pair.readings[0]
}

function Prompt({ q }: { q: Question }) {
  if (q.t === 'choose')
    return (
      <>
        <p className="text-sm text-muted">Chọn trợ số từ phù hợp</p>
        <p lang="ja" className="mt-4 font-jp text-[clamp(1.375rem,7cqw,2rem)] leading-snug font-semibold break-words" data-blank-sentence>
          {q.sentence.before}
          <span className="mx-1 inline-block min-w-[2.2em] border-b-2 border-ai align-baseline text-ai">＿＿</span>
          {q.sentence.after}
        </p>
        <p className="mt-3 text-muted">{q.sentence.example.vi}</p>
      </>
    )
  return (
    <>
      <p className="text-sm text-muted">{q.t === 'type' ? 'Gõ cách đọc (romaji hoặc kana)' : 'Đọc thế nào?'}</p>
      <div className="mt-4 flex justify-center">
        <NumberPlusCounter n={q.pair.key} counter={q.pair.counter.counter} size="md" />
      </div>
      <p className="mt-3 line-clamp-1 text-sm text-muted">{q.pair.counter.usage}</p>
    </>
  )
}

/** Sau khi trả lời: cách đọc đúng, nghe, lý do biến âm (cặp số) hoặc cách đọc cả câu (chọn trợ số từ). */
function Feedback({ q, correct }: { q: Question; correct: boolean }) {
  if (q.t === 'choose')
    return (
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${correct ? 'text-matsu' : 'text-beni'}`}>
          {correct ? 'Chính xác' : 'Chưa đúng'}:{' '}
          <span lang="ja" className="font-jp">
            {q.counter.counter} ({q.counter.reading})
          </span>
        </p>
        <p lang="ja" className="flex items-center gap-2 font-jp text-sm text-muted">
          {q.sentence.example.kana}
          <SpeakButton text={q.sentence.example.kana} size="sm" label="Nghe câu" />
        </p>
      </div>
    )
  const cell = cellsOf(q.pair.counter).find((c) => c.key === q.pair.key)
  return (
    <div className="min-w-0 flex-1">
      <p className={`flex flex-wrap items-center gap-x-2 font-semibold ${correct ? 'text-matsu' : 'text-beni'}`}>
        {correct ? 'Chính xác' : 'Chưa đúng'}:
        <span lang="ja" className="font-jp text-ink">
          {numberLabel(q.pair.key)}
          {q.pair.counter.counter} {q.pair.readings.join('／')}
        </span>
        <SpeakButton text={q.pair.readings[0]} size="sm" />
      </p>
      {cell && (
        <p className={`text-sm ${cell.irregular ? 'text-beni' : 'text-muted'}`} data-quiz-reason>
          {cell.reason}
        </p>
      )}
    </div>
  )
}

export function CounterQuiz({ counters, pool }: { counters: CounterEntry[]; pool: CounterEntry[] }) {
  const [kind, setKind] = useState<CounterQuizKind>('mix')
  const [questions, setQuestions] = useState(() => buildCounterQuiz(counters, pool, 'mix'))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  // Câu hỏi là dữ liệu thuần (cặp số + trợ số từ, câu ví dụ): lưu nguyên vào sessionStorage.
  const memory = useStudySession<{ kind: CounterQuizKind; questions: Question[]; results: boolean[] }>(
    'counter-quiz',
    counters.map((c) => c.id),
  )

  const q = questions[index]
  const finished = index >= questions.length
  const answered = picked !== null
  const lastCorrect = results[index] ?? false
  const right = results.filter(Boolean).length

  const restart = (k = kind) => {
    memory.clear()
    setKind(k)
    setQuestions(buildCounterQuiz(counters, pool, k))
    setIndex(0)
    setPicked(null)
    setTyped('')
    setResults([])
  }

  const answer = (choice: string) => {
    if (!q || answered) return
    const ok =
      q.t === 'choose'
        ? choice === q.counter.counter
        : q.t === 'reading'
          ? choice === q.pair.readings[0] || acceptedReadings(q.pair.counter, q.pair.key).has(choice)
          : acceptedReadings(q.pair.counter, q.pair.key).has(normalizeReading(choice))
    setPicked(choice)
    const nextResults = [...results, ok]
    setResults(nextResults)
    memory.save({ kind, questions, results: nextResults }, nextResults.length, questions.length)
    if (q.t === 'choose') grade(counterRef(q.counter.id), ok, false)
    else grade(q.pair.id, ok, q.pair.irregular)
  }
  const next = () => {
    setPicked(null)
    setTyped('')
    setIndex((i) => i + 1)
  }
  const resume = () => {
    const saved = memory.offer?.state
    if (!saved || !Array.isArray(saved.questions) || !Array.isArray(saved.results)) return memory.restart()
    setKind(saved.kind)
    setQuestions(saved.questions)
    setResults(saved.results)
    setIndex(saved.results.length)
    setPicked(null)
    setTyped('')
    memory.dismiss()
  }
  const leaveGuard = useLeaveGuard(!finished && results.length >= 3, { answered: results.length, total: questions.length })

  useEffect(() => {
    if (finished || !q || q.t === 'type' || memory.offer) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= q.options.length) answer(q.options[n - 1])
      else if (answered && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (memory.offer)
    return <ResumePrompt answered={memory.offer.answered} total={memory.offer.total} onResume={resume} onRestart={memory.restart} />

  const kindPicker = (
    <div className="mb-4">
      <Segmented size="sm" label="Dạng câu hỏi" value={kind} onChange={(k) => restart(k)} options={QUIZ_KINDS} />
    </div>
  )

  if (questions.length === 0)
    return (
      <>
        {kindPicker}
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">Chưa có câu ví dụ để làm dạng câu này. Chọn dạng khác.</p>
      </>
    )

  if (finished) {
    const perfect = right === questions.length
    return (
      <>
        {kindPicker}
        <div className="mx-auto max-w-[560px] rounded-2xl border border-line bg-surface p-6 text-center" data-quiz-result>
          {perfect && <Celebration />}
          <h2 className="text-lg font-semibold text-muted">Kết quả</h2>
          <p className="mt-1 text-6xl font-bold">
            <AnimatedNumber value={right} className={perfect ? 'text-matsu' : ''} />
            <span className="text-2xl text-muted">/{questions.length}</span>
          </p>
          <p className="mt-2 text-muted">Cặp số + trợ số từ trả lời sai và ô bất quy tắc đã vào lịch ôn.</p>
          <Button onClick={() => restart()} className="mt-6 min-h-12 rounded-lg bg-ai px-6 font-semibold text-on-ai hover:opacity-90">
            Làm lượt mới
          </Button>
        </div>
      </>
    )
  }

  const correct = correctOf(q)
  const isLast = index + 1 === questions.length
  const onType = (e: FormEvent) => {
    e.preventDefault()
    if (answered) return next()
    if (typed.trim()) answer(typed)
  }

  return (
    <>
      {kindPicker}
      {leaveGuard}
      <StudyLayout
        aside={
          <SessionPanel
            title="Quiz cách đếm"
            stats={[
              { label: 'Câu hiện tại', value: index + 1, total: questions.length },
              { label: 'Đúng', value: right, tone: 'good' },
              { label: 'Sai', value: results.length - right, tone: 'bad' },
            ]}
            shortcuts={[
              { keys: ['1–4'], label: 'Chọn đáp án' },
              { keys: ['Enter'], label: 'Kiểm tra / câu tiếp theo' },
            ]}
          />
        }
      >
        <p className="mb-4 text-sm text-muted lg:hidden">
          Câu {index + 1}/{questions.length}
        </p>
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => inputRef.current?.focus()}>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="@container"
            data-quiz-kind={q.t}
          >
            <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center" data-quiz-question={q.t === 'choose' ? counterRef(q.counter.id) : q.pair.id}>
              <Prompt q={q} />
            </div>
            {q.t === 'type' ? (
              <form onSubmit={onType}>
                <label htmlFor="counter-answer" className="sr-only">
                  Cách đọc
                </label>
                <motion.div animate={answered && !lastCorrect ? SHAKE : { x: 0 }} transition={{ duration: 0.3 }}>
                  <input
                    id="counter-answer"
                    ref={inputRef}
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    readOnly={answered}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="romaji hoặc kana"
                    className={`mt-4 h-14 w-full rounded-xl border-2 bg-surface px-4 text-center text-xl outline-none focus:border-ai ${
                      !answered ? 'border-line' : lastCorrect ? 'border-matsu' : 'border-beni'
                    }`}
                  />
                </motion.div>
                <p lang="ja" className="mt-2 h-6 text-center font-jp text-muted" aria-live="polite">
                  {typed && !answered ? toHiragana(typed) : ''}
                </p>
                <Button type="submit" className="mt-2 min-h-12 w-full rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90">
                  {answered ? (isLast ? 'Xem kết quả' : 'Câu tiếp theo') : 'Kiểm tra'}
                </Button>
              </form>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {q.options.map((o, i) => {
                  const state = !answered ? 'idle' : o === correct ? 'right' : o === picked ? 'wrong' : 'dim'
                  return (
                    <li key={o}>
                      <motion.button
                        type="button"
                        disabled={answered}
                        data-option={o}
                        data-correct={answered && o === correct ? true : undefined}
                        onClick={() => answer(o)}
                        whileTap={answered ? undefined : { scale: 0.97 }}
                        animate={state === 'right' ? { scale: 1.03, x: 0 } : state === 'wrong' ? SHAKE : { scale: 1, x: 0 }}
                        transition={state === 'wrong' ? { duration: 0.3 } : { type: 'spring', stiffness: 500, damping: 28 }}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-2 text-left transition-colors ${
                          {
                            idle: 'border-line bg-surface hover:border-ai',
                            right: 'border-matsu bg-matsu-soft text-matsu',
                            wrong: 'border-beni bg-beni-soft text-beni',
                            dim: 'border-line bg-surface opacity-50',
                          }[state]
                        }`}
                      >
                        <span className="hidden size-6 shrink-0 place-items-center rounded-md border border-current/30 text-xs opacity-70 lg:grid">{i + 1}</span>
                        {q.t === 'choose' ? (
                          <GridCell className="size-11">{o}</GridCell>
                        ) : (
                          <span lang="ja" className="min-w-0 font-jp text-xl break-all">
                            {o}
                          </span>
                        )}
                      </motion.button>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
        <div aria-live="polite" className="mt-4 flex min-h-14 flex-wrap items-center gap-3" data-quiz-feedback>
          {answered && (
            <>
              <Feedback q={q} correct={lastCorrect} />
              {q.t !== 'type' && (
                <Button onClick={next} autoFocus className="ml-auto min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
                  {isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
                </Button>
              )}
            </>
          )}
        </div>
      </StudyLayout>
    </>
  )
}

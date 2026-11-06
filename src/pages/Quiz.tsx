import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toHiragana } from 'wanakana'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Celebration } from '../components/Celebration'
import { PageHeader } from '../components/PageHeader'
import { Button, ButtonLink } from '../components/Pressable'
import { STUDY_PAGE, SessionPanel, StudyLayout } from '../components/StudyLayout'
import { SpeakButton } from '../components/SpeakButton'
import { Stagger, StaggerItem } from '../components/Stagger'
import { deckPath, deckTitle, getDeckWords } from '../data'
import { readingMatches, shuffle } from '../lib/answer'
import { isInteractiveTarget } from '../lib/keyboard'
import { progress } from '../lib/progress'
import { useDeck } from '../hooks/useDeck'
import type { Deck, VocabItem } from '../types'
import { NotFound } from './NotFound'

type Mode = 'choice' | 'typing'
const LENGTH = 10
const SHAKE = { x: [0, -8, 8, -8, 8, -8, 8, 0] }
const SHAKE_T = { duration: 0.3, ease: 'linear' } as const

interface Question {
  item: VocabItem
  /** Trắc nghiệm: hỏi từ tiếng Nhật chọn nghĩa, hoặc ngược lại */
  direction: 'ja-vi' | 'vi-ja'
  options: VocabItem[]
}

function buildQuestions(words: VocabItem[]): Question[] {
  return shuffle(words)
    .slice(0, LENGTH)
    .map((item, i) => ({
      item,
      direction: i % 2 === 0 ? 'ja-vi' : 'vi-ja',
      options: shuffle([item, ...shuffle(words.filter((w) => w.id !== item.id)).slice(0, 3)]),
    }))
}

function Setup({ deck, onStart }: { deck: Deck; onStart: (m: Mode) => void }) {
  const modes: { mode: Mode; title: string; detail: string; glyph: string }[] = [
    { mode: 'choice', glyph: '選', title: 'Trắc nghiệm', detail: 'Chọn 1 trong 4 đáp án, xen kẽ Nhật → Việt và Việt → Nhật.' },
    { mode: 'typing', glyph: '打', title: 'Gõ cách đọc', detail: 'Xem từ và nghĩa, gõ cách đọc bằng romaji hoặc kana.' },
  ]
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title="Quiz" back={{ to: deckPath(deck), label: deckTitle(deck) }} />
      <p className="text-muted">Mỗi lượt {LENGTH} câu. Kết quả được đưa vào lịch ôn tập: câu sai sẽ quay lại sớm hơn.</p>
      <Stagger as="ul" className="mt-6 grid gap-3 md:grid-cols-2">
        {modes.map((m) => (
          <StaggerItem as="li" key={m.mode}>
            <Button
              onClick={() => onStart(m.mode)}
              whileHover={{ y: -3 }}
              className="flex h-full w-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition-colors hover:border-ai"
            >
              <span lang="ja" className="grid size-12 shrink-0 place-items-center rounded-[3px] border-2 border-cell-line font-jp text-2xl text-ai">
                {m.glyph}
              </span>
              <span>
                <span className="block font-semibold">{m.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{m.detail}</span>
              </span>
            </Button>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

function Result({
  deck,
  answers,
  onRestart,
}: {
  deck: Deck
  answers: { item: VocabItem; correct: boolean }[]
  onRestart: () => void
}) {
  const right = answers.filter((a) => a.correct).length
  const wrong = answers.filter((a) => !a.correct)
  const perfect = right === answers.length
  return (
    <div className="mx-auto max-w-[560px]">
      {perfect && <Celebration />}
      <PageHeader title="Kết quả" back={{ to: deckPath(deck), label: deckTitle(deck) }} />
      <p className="text-6xl font-bold">
        <AnimatedNumber value={right} className={perfect ? 'text-matsu' : ''} />
        <span className="text-2xl text-muted">/{answers.length}</span>
      </p>
      <p className="mt-2 text-muted">
        {perfect ? 'Đúng hết. Các từ này sẽ được giãn lịch ôn.' : 'Các câu sai đã được đưa vào lịch ôn ngày mai.'}
      </p>

      {wrong.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold">Cần xem lại</h2>
          <Stagger as="ul" className="divide-y divide-line rounded-xl border border-line bg-surface px-4">
            {wrong.map(({ item }) => (
              <StaggerItem as="li" key={item.id} className="flex items-center gap-3 py-3">
                <span lang="ja" className="font-jp text-lg font-medium">
                  {item.word}
                </span>
                <span lang="ja" className="font-jp text-sm text-muted">
                  {item.reading !== item.word && item.reading}
                </span>
                <span className="ml-auto text-right text-sm">{item.meaning}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Button onClick={onRestart} className="min-h-12 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90">
          Làm lượt mới
        </Button>
        <ButtonLink to="/review" className="grid min-h-12 place-items-center rounded-lg border border-line font-medium hover:bg-sunken">
          Đi tới ôn tập
        </ButtonLink>
      </div>
    </div>
  )
}

function QuizInner({ deck }: { deck: Deck }) {
  const words = getDeckWords(deck)
  const [mode, setMode] = useState<Mode | null>(null)
  const [questions, setQuestions] = useState(() => buildQuestions(words))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [answers, setAnswers] = useState<{ item: VocabItem; correct: boolean }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const finished = index >= questions.length
  const q = questions[index]
  const answered = picked !== null
  const right = answers.filter((a) => a.correct).length

  const record = (correct: boolean, choice: string) => {
    if (!q || answered) return
    setPicked(choice)
    setAnswers((a) => [...a, { item: q.item, correct }])
    progress.grade(q.item.id, correct ? 4 : 1)
  }

  const next = () => {
    setIndex((i) => i + 1)
    setPicked(null)
    setTyped('')
  }

  // Phím tắt trắc nghiệm: 1–4 chọn, Enter sang câu.
  useEffect(() => {
    if (mode !== 'choice' || finished) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= q.options.length) {
        const o = q.options[n - 1]
        setPicked(o.id)
        setAnswers((a) => [...a, { item: q.item, correct: o.id === q.item.id }])
        progress.grade(q.item.id, o.id === q.item.id ? 4 : 1)
      } else if (answered && e.key === 'Enter') {
        e.preventDefault()
        setIndex((i) => i + 1)
        setPicked(null)
        setTyped('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, finished, answered, q])

  if (!mode) return <Setup deck={deck} onStart={setMode} />

  const restart = () => {
    setQuestions(buildQuestions(words))
    setIndex(0)
    setPicked(null)
    setTyped('')
    setAnswers([])
    setMode(null)
  }

  if (finished) return <Result deck={deck} answers={answers} onRestart={restart} />

  const onType = (e: FormEvent) => {
    e.preventDefault()
    if (answered) return next()
    if (!typed.trim()) return
    record(readingMatches(typed, q.item.reading), typed)
  }

  const lastCorrect = answered && answers[answers.length - 1]?.correct
  const preview = mode === 'typing' && typed && !answered ? toHiragana(typed) : ''
  const isLast = index + 1 === questions.length

  const aside = (
    <SessionPanel
      title={mode === 'choice' ? 'Trắc nghiệm' : 'Gõ cách đọc'}
      stats={[
        { label: 'Câu hiện tại', value: index + 1, total: questions.length },
        { label: 'Đúng', value: right, tone: 'good' },
        { label: 'Sai', value: answers.length - right, tone: 'bad' },
      ]}
      shortcuts={
        mode === 'choice'
          ? [
              { keys: ['1', '2', '3', '4'], label: 'Chọn đáp án' },
              { keys: ['Enter'], label: 'Câu tiếp theo' },
            ]
          : [
              { keys: ['Enter'], label: 'Kiểm tra' },
              { keys: ['Enter'], label: 'Câu tiếp theo' },
            ]
      }
    />
  )

  return (
    <div className={STUDY_PAGE}>
      <PageHeader title="Quiz" back={{ to: deckPath(deck), label: deckTitle(deck) }} />
      <StudyLayout aside={aside}>
        <div className="mb-5 flex items-center gap-3 text-sm text-muted">
          <span className="tabular-nums lg:hidden">
            Câu {index + 1}/{questions.length}
          </span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <motion.div
              className="absolute inset-0 origin-left rounded-full bg-ai"
              initial={false}
              animate={{ scaleX: (index + (answered ? 1 : 0)) / questions.length }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false} onExitComplete={() => inputRef.current?.focus()}>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {mode === 'choice' ? (
              <>
                <div className="rounded-2xl border border-line bg-surface p-6 text-center">
                  <p className="text-sm text-muted">{q.direction === 'ja-vi' ? 'Từ này nghĩa là gì?' : 'Chọn từ tiếng Nhật đúng nghĩa'}</p>
                  {q.direction === 'ja-vi' ? (
                    <p lang="ja" className="mt-3 font-jp text-[clamp(2.5rem,11vw,3.25rem)] font-bold break-words">
                      {q.item.word}
                    </p>
                  ) : (
                    <p className="mt-3 text-[clamp(1.5rem,6vw,1.875rem)] font-semibold">{q.item.meaning}</p>
                  )}
                  <p lang="ja" className="mt-3 flex min-h-9 items-center justify-center gap-3 font-jp text-muted">
                    {answered && (
                      <>
                        {q.item.word}【{q.item.reading}】
                        <SpeakButton text={q.item.reading} size="sm" />
                      </>
                    )}
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, i) => {
                    const isAnswer = o.id === q.item.id
                    const state = !answered ? 'idle' : isAnswer ? 'right' : picked === o.id ? 'wrong' : 'dim'
                    const cls = {
                      idle: 'border-line bg-surface hover:border-ai',
                      right: 'border-matsu bg-matsu-soft text-matsu',
                      wrong: 'border-beni bg-beni-soft text-beni',
                      dim: 'border-line bg-surface opacity-50',
                    }[state]
                    return (
                      <li key={o.id}>
                        <motion.button
                          type="button"
                          disabled={answered}
                          onClick={() => record(isAnswer, o.id)}
                          whileTap={answered ? undefined : { scale: 0.97 }}
                          animate={state === 'right' ? { scale: 1.03, x: 0 } : state === 'wrong' ? SHAKE : { scale: 1, x: 0 }}
                          transition={state === 'wrong' ? SHAKE_T : { type: 'spring', stiffness: 500, damping: 28 }}
                          className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition-colors ${cls}`}
                        >
                          <span className="hidden size-6 shrink-0 place-items-center rounded-md border border-current/30 text-xs opacity-70 lg:grid">
                            {i + 1}
                          </span>
                          {q.direction === 'ja-vi' ? (
                            o.meaning
                          ) : (
                            <span lang="ja" className="font-jp text-xl">
                              {o.word}
                            </span>
                          )}
                        </motion.button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <form onSubmit={onType}>
                <div className="rounded-2xl border border-line bg-surface p-6 text-center">
                  <p className="text-sm text-muted">Gõ cách đọc của từ</p>
                  <p lang="ja" className="mt-3 font-jp text-[clamp(2.5rem,11vw,3.25rem)] font-bold break-words">
                    {q.item.word}
                  </p>
                  <p className="mt-3 text-muted">{q.item.meaning}</p>
                </div>
                <label htmlFor="quiz-answer" className="sr-only">
                  Cách đọc
                </label>
                <motion.div animate={answered && !lastCorrect ? SHAKE : { x: 0 }} transition={SHAKE_T}>
                  <input
                    id="quiz-answer"
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
                  {preview}
                </p>
                <Button type="submit" className="mt-2 min-h-12 w-full rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90">
                  {answered ? (isLast ? 'Xem kết quả' : 'Câu tiếp theo') : 'Kiểm tra'}
                </Button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <div aria-live="polite" className="mt-4 flex min-h-12 flex-wrap items-center gap-3">
          {answered && (
            <>
              <p className={`font-semibold ${lastCorrect ? 'text-matsu' : 'text-beni'}`}>
                {lastCorrect ? 'Chính xác' : 'Chưa đúng'}
                {mode === 'typing' && (
                  <span lang="ja" className="ml-2 font-jp font-normal text-ink">
                    {q.item.reading}
                  </span>
                )}
              </p>
              {mode === 'typing' && <SpeakButton text={q.item.reading} size="sm" />}
              {mode === 'choice' && (
                <Button
                  onClick={next}
                  autoFocus
                  className="ml-auto min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90"
                >
                  {isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
                </Button>
              )}
            </>
          )}
        </div>
      </StudyLayout>
    </div>
  )
}

export function Quiz() {
  const deck = useDeck()
  if (!deck) return <NotFound />
  return <QuizInner key={deckPath(deck)} deck={deck} />
}

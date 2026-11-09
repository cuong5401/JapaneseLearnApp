import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toHiragana } from 'wanakana'
import { AnimatedNumber } from '../AnimatedNumber'
import { Celebration } from '../Celebration'
import { Button, ButtonLink } from '../Pressable'
import { SessionPanel, StudyLayout } from '../StudyLayout'
import { SpeakButton } from '../SpeakButton'
import { Stagger, StaggerItem } from '../Stagger'
import { readingMatches, shuffle } from '../../lib/answer'
import { isInteractiveTarget } from '../../lib/keyboard'
import { progress } from '../../lib/progress'
import { quizGrade } from '../../lib/srs'
import { speechText } from '../../lib/speech'
import type { VocabItem } from '../../types'
import type { SessionLink } from './FlashcardSession'

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

/** Từ dùng được cho chế độ gõ: phải có cách đọc. */
const typeable = (w: VocabItem) => Boolean(w.reading)

/**
 * Câu hỏi lấy từ `items` (bài đang học); đáp án nhiễu lấy từ `pool` (cả bộ) và bỏ các từ
 * trùng chữ hoặc trùng nghĩa với đáp án đúng để không có hai lựa chọn cùng đúng.
 */
function buildQuestions(items: VocabItem[], pool: VocabItem[], mode: Mode): Question[] {
  const source = mode === 'typing' ? items.filter(typeable) : items
  return shuffle(source)
    .slice(0, LENGTH)
    .map((item, i) => {
      const seen = new Set([item.meaning, item.word])
      const distractors: VocabItem[] = []
      for (const w of shuffle(pool.length >= 4 ? pool : items)) {
        if (distractors.length === 3) break
        if (seen.has(w.meaning) || seen.has(w.word)) continue
        seen.add(w.meaning)
        seen.add(w.word)
        distractors.push(w)
      }
      return { item, direction: i % 2 === 0 ? 'ja-vi' : 'vi-ja', options: shuffle([item, ...distractors]) }
    })
}

function Setup({ items, onStart }: { items: VocabItem[]; onStart: (m: Mode) => void }) {
  const total = Math.min(LENGTH, items.length)
  const typing = Math.min(LENGTH, items.filter(typeable).length)
  const modes: { mode: Mode; title: string; detail: string; glyph: string; disabled?: boolean }[] = [
    { mode: 'choice', glyph: '選', title: 'Trắc nghiệm', detail: `${total} câu, chọn 1 trong 4 đáp án, xen kẽ Nhật → Việt và Việt → Nhật.` },
    {
      mode: 'typing',
      glyph: '打',
      title: 'Gõ cách đọc',
      detail: typing
        ? `${typing} câu, gõ cách đọc bằng romaji hoặc kana.${typing < total ? ' Từ thiếu cách đọc được bỏ qua.' : ''}`
        : 'Các từ ở đây chưa có cách đọc nên không gõ được.',
      disabled: typing === 0,
    },
  ]
  return (
    <div>
      <p className="text-muted">Kết quả được đưa vào lịch ôn tập: câu sai sẽ quay lại sớm hơn.</p>
      <Stagger as="ul" className="mt-6 grid gap-3 md:grid-cols-2">
        {modes.map((m) => (
          <StaggerItem as="li" key={m.mode}>
            <Button
              onClick={() => onStart(m.mode)}
              disabled={m.disabled}
              whileHover={m.disabled ? undefined : { y: -3 }}
              className="flex h-full w-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition-colors hover:border-ai disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line"
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
  answers,
  onRestart,
  back,
  next,
}: {
  answers: { item: VocabItem; correct: boolean; hinted?: boolean }[]
  onRestart: () => void
  back: SessionLink
  next?: SessionLink
}) {
  const right = answers.filter((a) => a.correct).length
  const wrong = answers.filter((a) => !a.correct)
  const perfect = right === answers.length
  return (
    <div className="max-w-[560px]">
      {perfect && <Celebration />}
      <h2 className="text-lg font-semibold text-muted">Kết quả</h2>
      <p className="mt-1 text-6xl font-bold">
        <AnimatedNumber value={right} className={perfect ? 'text-matsu' : ''} />
        <span className="text-2xl text-muted">/{answers.length}</span>
      </p>
      <p className="mt-2 text-muted">
        {perfect ? 'Đúng hết. Các từ này sẽ được giãn lịch ôn.' : 'Các câu sai sẽ quay lại sớm trong lịch ôn.'}
        {answers.some((a) => a.hinted) && ` ${answers.filter((a) => a.hinted).length} câu có dùng gợi ý (chấm "Khó").`}
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
                  {item.reading && item.reading !== item.word && item.reading}
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
        {next ? (
          <ButtonLink to={next.to} className="grid min-h-12 place-items-center rounded-lg border-2 border-ai font-semibold text-ai hover:bg-ai-soft">
            {next.label}
          </ButtonLink>
        ) : (
          <ButtonLink to="/review" className="grid min-h-12 place-items-center rounded-lg border border-line font-medium hover:bg-sunken">
            Đi tới ôn tập
          </ButtonLink>
        )}
      </div>
      <ButtonLink to={back.to} className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-ai hover:underline">
        {back.label}
      </ButtonLink>
    </div>
  )
}

/** Phiên quiz cho một danh sách từ; `pool` (mặc định = items) cung cấp đáp án nhiễu. */
export function QuizSession({
  items,
  pool = items,
  back,
  next: nextLesson,
}: {
  items: VocabItem[]
  pool?: VocabItem[]
  back: SessionLink
  next?: SessionLink
}) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [answers, setAnswers] = useState<{ item: VocabItem; correct: boolean; hinted?: boolean }[]>([])
  // Gợi ý: trắc nghiệm bỏ 2 đáp án sai, gõ cách đọc hiện chữ đầu; đúng sau khi xem gợi ý thì chấm Khó (Hard)
  const [hinted, setHinted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const finished = index >= questions.length
  const q = questions[index]
  const answered = picked !== null
  const right = answers.filter((a) => a.correct).length

  const record = (correct: boolean, choice: string) => {
    if (!q || answered) return
    setPicked(choice)
    setAnswers((a) => [...a, { item: q.item, correct, hinted }])
    progress.grade(q.item.id, quizGrade(correct, hinted))
  }

  const next = () => {
    setIndex((i) => i + 1)
    setPicked(null)
    setTyped('')
    setHinted(false)
  }

  // Trắc nghiệm: 2 đáp án sai đầu tiên bị bỏ khi đã dùng gợi ý
  const removed = mode === 'choice' && hinted && q ? q.options.filter((o) => o.id !== q.item.id).slice(0, Math.max(0, q.options.length - 2)).map((o) => o.id) : []

  // Phím tắt trắc nghiệm: 1–4 chọn, Enter sang câu.
  useEffect(() => {
    if (mode !== 'choice' || finished) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= q.options.length && !removed.includes(q.options[n - 1].id)) {
        const o = q.options[n - 1]
        record(o.id === q.item.id, o.id)
      } else if (!answered && e.key.toLowerCase() === 'h') setHinted(true)
      else if (answered && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!mode)
    return (
      <Setup
        items={items}
        onStart={(m) => {
          setQuestions(buildQuestions(items, pool, m))
          setMode(m)
        }}
      />
    )

  const restart = () => {
    setQuestions([])
    setIndex(0)
    setPicked(null)
    setTyped('')
    setAnswers([])
    setMode(null)
  }

  if (finished) return <Result answers={answers} onRestart={restart} back={back} next={nextLesson} />

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
              { keys: ['1–4'], label: 'Chọn đáp án' },
              { keys: ['H'], label: 'Gợi ý (bỏ 2 đáp án sai)' },
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
            className="@container"
          >
            {mode === 'choice' ? (
              <>
                <div className="@container rounded-2xl border border-line bg-surface p-6 text-center">
                  <p className="text-sm text-muted">{q.direction === 'ja-vi' ? 'Từ này nghĩa là gì?' : 'Chọn từ tiếng Nhật đúng nghĩa'}</p>
                  {q.direction === 'ja-vi' ? (
                    <p lang="ja" className="mt-3 font-jp text-[clamp(2rem,12cqw,3.25rem)] font-bold break-words">
                      {q.item.word}
                    </p>
                  ) : (
                    <p className="mt-3 text-[clamp(1.375rem,7cqw,1.875rem)] font-semibold">{q.item.meaning}</p>
                  )}
                  <p lang="ja" className="mt-3 flex min-h-9 items-center justify-center gap-3 font-jp text-muted">
                    {answered && (
                      <>
                        {q.item.word}
                        {q.item.reading && q.item.reading !== q.item.word && `【${q.item.reading}】`}
                        <SpeakButton text={speechText(q.item)} size="sm" />
                      </>
                    )}
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 @md:grid-cols-2">
                  {q.options.map((o, i) => {
                    const isAnswer = o.id === q.item.id
                    const out = removed.includes(o.id)
                    const state = !answered ? (out ? 'dim' : 'idle') : isAnswer ? 'right' : picked === o.id ? 'wrong' : 'dim'
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
                          disabled={answered || out}
                          data-option={o.id}
                          data-removed={out || undefined}
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
                <div className="@container rounded-2xl border border-line bg-surface p-6 text-center">
                  <p className="text-sm text-muted">Gõ cách đọc của từ</p>
                  <p lang="ja" className="mt-3 font-jp text-[clamp(2rem,12cqw,3.25rem)] font-bold break-words">
                    {q.item.word}
                  </p>
                  <p className="mt-3 text-muted">{q.item.meaning}</p>
                  {hinted && !answered && (
                    <p className="mt-2 text-sm text-muted" data-hint-text>
                      Gợi ý: bắt đầu bằng{' '}
                      <span lang="ja" className="font-jp text-lg text-ink">
                        {[...q.item.reading][0]}
                      </span>
                    </p>
                  )}
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
          {!answered && (
            <button
              type="button"
              onClick={() => setHinted(true)}
              disabled={hinted}
              data-quiz-hint
              className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-muted hover:border-ai hover:text-ink disabled:opacity-50"
            >
              {hinted ? 'Đã dùng gợi ý (đúng sẽ tính "Khó")' : 'Gợi ý'}
            </button>
          )}
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
              {mode === 'typing' && <SpeakButton text={speechText(q.item)} size="sm" />}
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
  )
}

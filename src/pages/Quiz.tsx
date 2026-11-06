import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toHiragana } from 'wanakana'
import { PageHeader } from '../components/PageHeader'
import { SpeakButton } from '../components/SpeakButton'
import { deckPath, deckTitle, getDeckWords } from '../data'
import { readingMatches, shuffle } from '../lib/answer'
import { progress } from '../lib/progress'
import { useDeck } from '../hooks/useDeck'
import type { Deck, VocabItem } from '../types'
import { NotFound } from './NotFound'

type Mode = 'choice' | 'typing'
const LENGTH = 10

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
  const modes: { mode: Mode; title: string; detail: string }[] = [
    { mode: 'choice', title: 'Trắc nghiệm', detail: 'Chọn 1 trong 4 đáp án, xen kẽ Nhật → Việt và Việt → Nhật.' },
    { mode: 'typing', title: 'Gõ cách đọc', detail: 'Xem từ và nghĩa, gõ cách đọc bằng romaji hoặc kana.' },
  ]
  return (
    <div>
      <PageHeader title="Quiz" back={{ to: deckPath(deck), label: deckTitle(deck) }} />
      <p className="text-muted">
        Mỗi lượt {LENGTH} câu. Kết quả được đưa vào lịch ôn tập: câu sai sẽ quay lại sớm hơn.
      </p>
      <ul className="mt-6 space-y-3">
        {modes.map((m) => (
          <li key={m.mode}>
            <button
              type="button"
              onClick={() => onStart(m.mode)}
              className="w-full rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-ai"
            >
              <span className="block font-semibold">{m.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{m.detail}</span>
            </button>
          </li>
        ))}
      </ul>
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
  return (
    <div>
      <PageHeader title="Kết quả" back={{ to: deckPath(deck), label: deckTitle(deck) }} />
      <p className="text-5xl font-bold tabular-nums">
        {right}
        <span className="text-2xl text-muted">/{answers.length}</span>
      </p>
      <p className="mt-2 text-muted">
        {right === answers.length ? 'Đúng hết. Các từ này sẽ được giãn lịch ôn.' : 'Các câu sai đã được đưa vào lịch ôn ngày mai.'}
      </p>

      {wrong.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold">Cần xem lại</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-4">
            {wrong.map(({ item }) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span lang="ja" className="font-jp text-lg font-medium">
                  {item.word}
                </span>
                <span lang="ja" className="font-jp text-sm text-muted">
                  {item.reading !== item.word && item.reading}
                </span>
                <span className="ml-auto text-right text-sm">{item.meaning}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8 grid grid-cols-2 gap-2">
        <button type="button" onClick={onRestart} className="min-h-12 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90">
          Làm lượt mới
        </button>
        <Link to="/review" className="grid min-h-12 place-items-center rounded-lg border border-line font-medium hover:bg-sunken">
          Đi tới ôn tập
        </Link>
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

  if (!mode) return <Setup deck={deck} onStart={setMode} />

  const restart = () => {
    setQuestions(buildQuestions(words))
    setIndex(0)
    setPicked(null)
    setTyped('')
    setAnswers([])
    setMode(null)
  }

  if (index >= questions.length) return <Result deck={deck} answers={answers} onRestart={restart} />

  const q = questions[index]
  const answered = picked !== null

  const record = (correct: boolean, choice: string) => {
    setPicked(choice)
    setAnswers((a) => [...a, { item: q.item, correct }])
    progress.grade(q.item.id, correct ? 4 : 1)
  }

  const next = () => {
    setIndex((i) => i + 1)
    setPicked(null)
    setTyped('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const onType = (e: FormEvent) => {
    e.preventDefault()
    if (answered) return next()
    if (!typed.trim()) return
    record(readingMatches(typed, q.item.reading), typed)
  }

  const lastCorrect = answered && answers[answers.length - 1]?.correct
  const preview = mode === 'typing' && typed && !answered ? toHiragana(typed) : ''

  return (
    <div>
      <PageHeader title="Quiz" back={{ to: deckPath(deck), label: deckTitle(deck) }} />

      <div className="mb-5 flex items-center gap-3 text-sm text-muted">
        <span className="tabular-nums">
          Câu {index + 1}/{questions.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-ai transition-[width]" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </div>

      {mode === 'choice' ? (
        <>
          <div className="rounded-2xl border border-line bg-surface p-6 text-center">
            <p className="text-sm text-muted">{q.direction === 'ja-vi' ? 'Từ này nghĩa là gì?' : 'Chọn từ tiếng Nhật đúng nghĩa'}</p>
            {q.direction === 'ja-vi' ? (
              <p lang="ja" className="mt-3 font-jp text-5xl font-bold">
                {q.item.word}
              </p>
            ) : (
              <p className="mt-3 text-3xl font-semibold">{q.item.meaning}</p>
            )}
            {answered && (
              <p lang="ja" className="mt-3 flex items-center justify-center gap-3 font-jp text-muted">
                {q.item.word}【{q.item.reading}】
                <SpeakButton text={q.item.reading} size="sm" />
              </p>
            )}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((o) => {
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
                  <button
                    type="button"
                    disabled={answered}
                    onClick={() => record(isAnswer, o.id)}
                    className={`min-h-14 w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition-colors ${cls}`}
                  >
                    {q.direction === 'ja-vi' ? (
                      o.meaning
                    ) : (
                      <span lang="ja" className="font-jp text-xl">
                        {o.word}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <form onSubmit={onType}>
          <div className="rounded-2xl border border-line bg-surface p-6 text-center">
            <p className="text-sm text-muted">Gõ cách đọc của từ</p>
            <p lang="ja" className="mt-3 font-jp text-5xl font-bold">
              {q.item.word}
            </p>
            <p className="mt-3 text-muted">{q.item.meaning}</p>
          </div>
          <label htmlFor="quiz-answer" className="sr-only">
            Cách đọc
          </label>
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
          <p lang="ja" className="mt-2 h-6 text-center font-jp text-muted" aria-live="polite">
            {preview}
          </p>
          <button type="submit" className="mt-2 min-h-12 w-full rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90">
            {answered ? (index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo') : 'Kiểm tra'}
          </button>
        </form>
      )}

      {answered && (
        <div aria-live="polite" className="mt-4 flex flex-wrap items-center gap-3">
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
            <button type="button" onClick={next} autoFocus className="ml-auto min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
              {index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Quiz() {
  const deck = useDeck()
  if (!deck) return <NotFound />
  return <QuizInner key={deckPath(deck)} deck={deck} />
}

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { GridCell } from '../components/GridCell'
import { Button } from '../components/Pressable'
import { PageHeader } from '../components/PageHeader'
import { KANA, KANA_GROUP_LABELS } from '../data/kana'
import { kanaMatches } from '../lib/answer'
import { readJSON, writeJSON } from '../lib/storage'
import type { KanaChar, KanaGroup, KanaScript } from '../types'

type ScriptChoice = KanaScript | 'both'
interface Settings {
  script: ScriptChoice
  groups: KanaGroup[]
}

const SCRIPT_OPTIONS: { value: ScriptChoice; label: string; sample: string }[] = [
  { value: 'hiragana', label: 'Hiragana', sample: 'あ' },
  { value: 'katakana', label: 'Katakana', sample: 'ア' },
  { value: 'both', label: 'Cả hai', sample: 'あア' },
]

function pickNext(pool: KanaChar[], prev?: KanaChar): KanaChar {
  if (pool.length === 1) return pool[0]
  let next = prev
  while (!next || next === prev) next = pool[Math.floor(Math.random() * pool.length)]
  return next
}

const poolFor = (s: Settings) =>
  KANA.filter((k) => (s.script === 'both' || k.script === s.script) && s.groups.includes(k.group))

export function Kana() {
  const [settings, setSettingsState] = useState<Settings>(() =>
    readJSON<Settings>('kana-settings', { script: 'hiragana', groups: ['basic'] }),
  )
  const pool = useMemo(() => poolFor(settings), [settings])

  const [current, setCurrent] = useState<KanaChar>(() => pickNext(pool))
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'asking' | 'correct' | 'wrong'>('asking')
  const [score, setScore] = useState({ right: 0, wrong: 0, streak: 0, best: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => writeJSON('kana-settings', settings), [settings])

  const next = useCallback(() => {
    setCurrent((prev) => pickNext(pool, prev))
    setInput('')
    setStatus('asking')
    inputRef.current?.focus()
  }, [pool])

  /** Đổi bộ chữ: lưu lại và đổi câu hỏi nếu chữ hiện tại không còn trong bộ. */
  const setSettings = (update: (s: Settings) => Settings) => {
    const nextSettings = update(settings)
    const nextPool = poolFor(nextSettings)
    setSettingsState(nextSettings)
    if (!nextPool.includes(current)) {
      setCurrent(pickNext(nextPool))
      setInput('')
      setStatus('asking')
    }
    inputRef.current?.focus()
  }

  // Đúng thì tự chuyển câu sau một nhịp ngắn.
  useEffect(() => {
    if (status !== 'correct') return
    const t = setTimeout(next, 450)
    return () => clearTimeout(t)
  }, [status, next])

  const onChange = (value: string) => {
    if (status !== 'asking') return
    setInput(value)
    if (kanaMatches(value, current.kana)) {
      setStatus('correct')
      setScore((s) => {
        const streak = s.streak + 1
        return { ...s, right: s.right + 1, streak, best: Math.max(s.best, streak) }
      })
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (status === 'wrong') return next()
    if (status !== 'asking' || !input.trim()) return
    setStatus('wrong')
    setScore((s) => ({ ...s, wrong: s.wrong + 1, streak: 0 }))
  }

  const reveal = () => {
    if (status !== 'asking') return
    setStatus('wrong')
    setScore((s) => ({ ...s, wrong: s.wrong + 1, streak: 0 }))
  }

  const toggleGroup = (g: KanaGroup) =>
    setSettings((s) => {
      const groups = s.groups.includes(g) ? s.groups.filter((x) => x !== g) : [...s.groups, g]
      return { ...s, groups: groups.length ? groups : s.groups }
    })

  return (
    <div className="@container mx-auto max-w-[640px]">
      <PageHeader title="Luyện kana" back={{ to: '/', label: 'Trang chủ' }} />

      <div className="space-y-3">
        <div role="radiogroup" aria-label="Bảng chữ" className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
          {SCRIPT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={settings.script === o.value}
              onClick={() => setSettings((s) => ({ ...s, script: o.value }))}
              className={`min-h-11 rounded-lg text-sm font-medium transition-colors ${
                settings.script === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <span lang="ja" className="mr-1.5 font-jp">
                {o.sample}
              </span>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KANA_GROUP_LABELS) as KanaGroup[]).map((g) => {
            const on = settings.groups.includes(g)
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGroup(g)}
                className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
                  on ? 'border-ai bg-ai-soft font-medium text-ai' : 'border-line text-muted hover:text-ink'
                }`}
              >
                {KANA_GROUP_LABELS[g]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <GridCell
          key={current.kana + status}
          tone={status === 'asking' ? 'default' : status}
          className={`w-[clamp(10rem,46cqw,13rem)] ${status !== 'asking' ? 'animate-stamp' : ''}`}
        >
          {current.kana}
        </GridCell>

        <p aria-live="polite" className="mt-4 h-6 text-center font-medium">
          {status === 'correct' && <span className="text-matsu">Đúng: {current.romaji}</span>}
          {status === 'wrong' && (
            <span className="text-beni">
              Đáp án: <strong className="text-lg">{current.romaji}</strong>
            </span>
          )}
        </p>

        <form onSubmit={onSubmit} className="mt-4 w-full max-w-xs">
          <label htmlFor="kana-answer" className="sr-only">
            Gõ romaji của chữ trên
          </label>
          <input
            id="kana-answer"
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => onChange(e.target.value)}
            readOnly={status !== 'asking'}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="Gõ romaji, ví dụ: ka"
            className="h-14 w-full rounded-xl border-2 border-line bg-surface px-4 text-center text-xl tracking-wider outline-none placeholder:text-base placeholder:tracking-normal placeholder:text-muted/70 focus:border-ai"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={reveal}
              disabled={status !== 'asking'}
              className="min-h-11 rounded-lg border border-line text-sm font-medium text-muted hover:text-ink disabled:opacity-40"
            >
              Xem đáp án
            </button>
            <Button type="submit" className="min-h-11 rounded-lg bg-ai text-sm font-semibold text-on-ai hover:opacity-90">
              {status === 'wrong' ? 'Chữ tiếp theo' : 'Kiểm tra'}
            </Button>
          </div>
        </form>

        <dl className="mt-8 grid w-full max-w-xs grid-cols-3 text-center">
          <div>
            <dt className="text-xs text-muted">Đúng</dt>
            <dd className="text-xl font-bold tabular-nums text-matsu">{score.right}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Sai</dt>
            <dd className="text-xl font-bold tabular-nums text-beni">{score.wrong}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Chuỗi đúng</dt>
            <dd className="text-xl font-bold tabular-nums">
              {score.streak}
              {score.best > 0 && <span className="ml-1 text-xs font-normal text-muted">/ {score.best}</span>}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

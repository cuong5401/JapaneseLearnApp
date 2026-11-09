import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GrammarUnavailable } from '../components/GrammarUnavailable'
import { PUBLIC_BUILD } from '../lib/edition'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Pressable'
import { SpeakButton } from '../components/SpeakButton'
import { AutoBadge } from '../components/grammar/AutoBadge'
import { AskAiLink } from '../components/ai/AskAiLink'
import { grammarQuestion } from '../lib/ai/questions'
import { BookmarkButton } from '../components/notebook/BookmarkButton'
import { useGrammar } from '../hooks/useData'
import { useCards } from '../hooks/useProgress'
import { parseLevel } from '../lib/levels'
import { grammarChecked, useGrammarChecked } from '../lib/grammarChecked'
import { progress } from '../lib/progress'
import { hasJapanese } from '../lib/search'
import type { GrammarEntry, Level } from '../types'
import { NotFound } from './NotFound'

/** Bỏ furigana trong ngoặc ("後ろ（うしろ）") để giọng đọc không đọc lặp. */
const forSpeech = (ja: string) => ja.replace(/[（(][぀-ヿー\s・]+[）)]/g, '')

const MARKERS = /^(意味|接続|用例|注意|参考|例|＊|※|\*|Ý nghĩa|Cách (dùng|cấu tạo|kết nối)|Chú ý)/

/** Toàn bộ nội dung gốc: giữ từng dòng, dòng có chữ Nhật đánh lang="ja". */
function Body({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, i) => {
        const ja = hasJapanese(line)
        const marker = MARKERS.test(line.trim())
        const numbered = /^[①-⑳❶-❿]/.test(line.trim())
        return (
          <p
            key={i}
            lang={ja ? 'ja' : undefined}
            className={`break-words whitespace-pre-wrap ${ja ? 'font-jp' : ''} ${marker ? 'pt-2 font-semibold' : ''} ${numbered ? 'pt-1.5' : ''} ${
              !ja && !marker ? 'text-muted' : ''
            }`}
          >
            {line}
          </p>
        )
      })}
    </div>
  )
}

function Detail({ g, list, level }: { g: GrammarEntry; list: GrammarEntry[]; level: Level }) {
  const learned = Boolean(useCards()[g.id])
  const checked = g.id in useGrammarChecked()
  const parsedPoorly = !g.auto && (!g.meaning || !g.examples?.length)
  // Liên kết hai chiều: mẫu này trỏ tới + các mẫu khác trỏ về mẫu này (chương Excel thấy mẫu tự soạn liên quan).
  const related = [
    ...(g.related ?? []).map((id) => list.find((x) => x.id === id)).filter((x): x is GrammarEntry => Boolean(x)),
    ...list.filter((x) => x.related?.includes(g.id) && !g.related?.includes(x.id)),
  ]
  const [open, setOpen] = useState(parsedPoorly)
  const i = list.findIndex((x) => x.id === g.id)
  const prev = list[i - 1]
  const next = list[i + 1]
  const base = `/grammar/${level.toLowerCase()}`

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader title={`${level}${g.lesson ? `, Bài ${g.lesson}` : ''}, mẫu ${g.no}`} back={{ to: base, label: `Ngữ pháp ${level}` }} />

      <article className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h2 lang="ja" className="min-w-0 font-jp text-[clamp(1.5rem,5vw,2.25rem)] leading-snug font-bold break-words">
            {g.title}
          </h2>
          <BookmarkButton itemRef={g.id} label={`mẫu ${g.title}`} className="-mt-1 -mr-2" />
        </div>
        {(g.group || g.auto) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {g.group && <span className="rounded-full bg-ai-soft px-2 py-0.5 text-xs font-medium text-ai">{g.group}</span>}
            <AutoBadge g={g} />
          </div>
        )}
        {g.meaning && <p className="mt-3 text-lg">{g.meaning}</p>}
        {g.connection && (
          <div className="mt-4 rounded-xl bg-sunken px-4 py-3">
            <p className="text-xs font-semibold text-muted">Cách nối</p>
            <p lang="ja" className="mt-0.5 font-jp">
              {g.connection}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <Button
            onClick={() => (learned ? progress.forget(g.id) : progress.markLearned(g.id))}
            className={`min-h-11 rounded-lg px-5 font-semibold ${learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'bg-ai text-on-ai hover:opacity-90'}`}
          >
            {learned ? 'Đã hiểu, bỏ đánh dấu' : 'Đã hiểu'}
          </Button>
          <span className="text-sm text-muted">{learned ? 'Mẫu này đang trong lịch ôn tập.' : 'Đánh dấu để đưa mẫu này vào lịch ôn tập.'}</span>
          <AskAiLink question={grammarQuestion(g)} className="ml-auto" />
        </div>
        {g.auto && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-sunken px-4 py-3">
            <p className="min-w-0 flex-1 basis-60 text-sm text-muted">
              {checked
                ? 'Bạn đã kiểm tra mẫu này.'
                : 'Mẫu này do Kotonoha tự soạn (giải thích và câu ví dụ), chưa có người kiểm tra. Đọc kỹ rồi bấm "Đã kiểm tra" nếu thấy đúng.'}
            </p>
            <Button
              onClick={() => grammarChecked.toggle(g.id)}
              aria-pressed={checked}
              className={`min-h-11 rounded-lg px-4 font-semibold ${checked ? 'border border-line bg-surface text-muted hover:text-ink' : 'border-2 border-matsu text-matsu hover:bg-matsu-soft'}`}
            >
              {checked ? 'Bỏ đánh dấu kiểm tra' : 'Đã kiểm tra'}
            </Button>
          </div>
        )}
      </article>

      {g.examples && g.examples.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 font-semibold">Ví dụ</h3>
          <ol className="space-y-3">
            {g.examples.map((ex, n) => (
              <li key={n} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="w-5 shrink-0 pt-0.5 text-sm tabular-nums text-muted">{n + 1}</span>
                <span className="min-w-0 flex-1">
                  <span lang="ja" className="block font-jp text-lg leading-relaxed break-words">
                    {ex.ja}
                  </span>
                  {ex.vi ? <span className="mt-1 block text-muted">{ex.vi}</span> : <span className="mt-1 block text-xs text-muted">Chưa tách được câu dịch, xem phần giải thích đầy đủ.</span>}
                </span>
                <SpeakButton text={forSpeech(ex.ja)} label="Nghe câu ví dụ" size="sm" />
              </li>
            ))}
          </ol>
        </section>
      )}

      {g.notes && g.notes.length > 0 && (
        <section className="mt-8" aria-labelledby="grammar-notes">
          <h3 id="grammar-notes" className="mb-3 font-semibold">
            Lưu ý
          </h3>
          <ul className="space-y-2 rounded-xl border border-line bg-surface p-4">
            {g.notes.map((n, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-kihada" />
                <span className="min-w-0 break-words">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-8" aria-labelledby="grammar-related">
          <h3 id="grammar-related" className="mb-3 font-semibold">
            Xem thêm
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link to={`${base}/${r.id}`} data-related={r.id} className="block min-h-11 rounded-xl border border-line bg-surface px-4 py-2.5 hover:border-ai">
                  <span lang="ja" className="block font-jp font-medium break-words">
                    {r.title}
                  </span>
                  {r.meaning && <span className="line-clamp-1 block text-sm text-muted">{r.meaning}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.body.length > 0 && (
      <section className="mt-8">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-line bg-surface px-4 font-semibold hover:bg-sunken"
        >
          {open ? 'Ẩn giải thích đầy đủ' : 'Xem toàn bộ giải thích'}
          <svg viewBox="0 0 24 24" className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-line bg-surface p-5">
                {parsedPoorly && (
                  <p className="mb-4 rounded-lg bg-kihada-soft px-3 py-2 text-sm">
                    Mục này chưa tách được đủ ý nghĩa và ví dụ từ file gốc nên hiển thị nguyên văn.
                  </p>
                )}
                <Body lines={g.body} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      )}

      <nav aria-label="Mẫu trước và sau" className="mt-8 grid grid-cols-2 gap-3">
        {prev ? (
          <Link to={`${base}/${prev.id}`} className="min-w-0 rounded-xl border border-line bg-surface p-3 hover:border-ai">
            <span className="block text-xs text-muted">Mẫu trước</span>
            <span lang="ja" className="block truncate font-jp font-medium">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`${base}/${next.id}`} className="min-w-0 rounded-xl border border-line bg-surface p-3 text-right hover:border-ai">
            <span className="block text-xs text-muted">Mẫu tiếp theo</span>
            <span lang="ja" className="block truncate font-jp font-medium">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </div>
  )
}

export function GrammarDetail() {
  return PUBLIC_BUILD ? <GrammarUnavailable /> : <GrammarDetailPage />
}

function GrammarDetailPage() {
  const { level: param, gid = '' } = useParams()
  const level = parseLevel(param)
  const data = useGrammar(level ?? 'N4')
  if (!level) return <NotFound />
  return (
    <Loaded state={data} skeleton={<PageSkeleton header rows={5} />}>
      {(list) => {
        const g = list.find((x) => x.id === gid)
        return g ? <Detail key={g.id} g={g} list={list} level={level} /> : <NotFound />
      }}
    </Loaded>
  )
}

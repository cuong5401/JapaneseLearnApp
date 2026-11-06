import { useRef, useState } from 'react'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { SpeakButton } from '../components/SpeakButton'
import { deckPath, deckTitle, getKanji } from '../data'
import { progress } from '../lib/progress'
import { useCards } from '../hooks/useProgress'
import { useDeck } from '../hooks/useDeck'
import type { KanjiItem, Level } from '../types'
import { NotFound } from './NotFound'

function Readings({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd lang="ja" className="mt-0.5 font-jp text-lg">
        {values.length ? values.join('、') : <span className="font-sans text-sm text-muted">Không có</span>}
      </dd>
    </div>
  )
}

function Detail({ item }: { item: KanjiItem }) {
  const cards = useCards()
  const learned = Boolean(cards[item.id])
  return (
    <article className="rounded-2xl border border-line bg-surface p-5" aria-label={`Chi tiết chữ ${item.kanji}`}>
      <div className="flex gap-5">
        <GridCell className="size-32 text-[5.5rem]">{item.kanji}</GridCell>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-wide">{item.hanViet}</p>
          <p className="mt-0.5 text-muted">{item.meaning}</p>
          {item.strokes && <p className="mt-2 text-sm text-muted">{item.strokes} nét</p>}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <Readings label="Âm On" values={item.onyomi} />
        <Readings label="Âm Kun" values={item.kunyomi} />
      </dl>
      <h3 className="mt-5 text-sm font-semibold text-muted">Từ ghép</h3>
      <ul className="mt-2 divide-y divide-line">
        {item.compounds.map((c) => (
          <li key={c.word} className="flex items-center gap-3 py-2.5">
            <span lang="ja" className="font-jp text-lg font-medium">
              {c.word}
            </span>
            <span lang="ja" className="font-jp text-sm text-muted">
              {c.reading}
            </span>
            <span className="ml-auto text-right text-sm">{c.meaning}</span>
            <SpeakButton text={c.reading} size="sm" />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => (learned ? progress.forget(item.id) : progress.markLearned(item.id))}
        className={`mt-4 min-h-11 w-full rounded-lg font-semibold transition-colors ${
          learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'bg-ai text-on-ai hover:opacity-90'
        }`}
      >
        {learned ? 'Đã học, chạm để bỏ đánh dấu' : 'Đánh dấu đã học'}
      </button>
    </article>
  )
}

function KanjiInner({ level }: { level: Level }) {
  const list = getKanji(level)
  const [selected, setSelected] = useState(0)
  const cards = useCards()
  const detailRef = useRef<HTMLDivElement>(null)
  const deck = { kind: 'level', level } as const

  const choose = (i: number) => {
    setSelected(i)
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <PageHeader title={`Chữ Hán ${level}`} back={{ to: deckPath(deck), label: deckTitle(deck) }} />

      <div ref={detailRef} className="scroll-mt-20">
        <Detail item={list[selected]} />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Tất cả {list.length} chữ, chạm để xem</h2>
      <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {list.map((k, i) => (
          <li key={k.id}>
            <button
              type="button"
              onClick={() => choose(i)}
              aria-label={`${k.kanji}, ${k.hanViet}${cards[k.id] ? ', đã học' : ''}`}
              aria-current={i === selected}
              className={`relative w-full rounded-[4px] ${i === selected ? 'ring-2 ring-ai ring-offset-2 ring-offset-paper' : ''}`}
            >
              <GridCell className="aspect-square w-full text-3xl">{k.kanji}</GridCell>
              {cards[k.id] && <span className="absolute right-1 top-1 size-2 rounded-full bg-matsu" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Kanji() {
  const deck = useDeck()
  if (!deck || deck.kind !== 'level') return <NotFound />
  return <KanjiInner key={deck.level} level={deck.level} />
}

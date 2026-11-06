import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Pressable'
import { SpeakButton } from '../components/SpeakButton'
import { Stagger, StaggerItem } from '../components/Stagger'
import { deckPath, deckTitle, getKanji } from '../data'
import { progress } from '../lib/progress'
import { useCards } from '../hooks/useProgress'
import { useDeck } from '../hooks/useDeck'
import { DESKTOP, useMediaQuery } from '../hooks/useMediaQuery'
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
    <article aria-label={`Chi tiết chữ ${item.kanji}`}>
      <div className="flex gap-5">
        <GridCell className="size-[clamp(6.5rem,28vw,8rem)] text-[clamp(4.25rem,19vw,5.5rem)]">{item.kanji}</GridCell>
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
      <ul className="mt-1 divide-y divide-line">
        {item.compounds.map((c) => (
          <li key={c.word} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5">
            <span lang="ja" className="font-jp text-lg font-medium">
              {c.word}
            </span>
            <span lang="ja" className="font-jp text-sm text-muted">
              {c.reading}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <span className="text-right text-sm">{c.meaning}</span>
              <SpeakButton text={c.reading} size="sm" />
            </span>
          </li>
        ))}
      </ul>
      <Button
        onClick={() => (learned ? progress.forget(item.id) : progress.markLearned(item.id))}
        className={`mt-4 min-h-11 w-full rounded-lg font-semibold transition-colors ${
          learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'bg-ai text-on-ai hover:opacity-90'
        }`}
      >
        {learned ? 'Đã học, chạm để bỏ đánh dấu' : 'Đánh dấu đã học'}
      </Button>
    </article>
  )
}

function KanjiInner({ level }: { level: Level }) {
  const list = getKanji(level)
  const desktop = useMediaQuery(DESKTOP)
  const [selected, setSelected] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const cards = useCards()
  const deck = { kind: 'level', level } as const
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  const choose = (i: number) => {
    setSelected(i)
    if (!desktop) setSheetOpen(true)
  }

  const learnedCount = list.filter((k) => cards[k.id]).length

  return (
    <div>
      <PageHeader title={`Chữ Hán ${level}`} back={{ to: deckPath(deck), label: deckTitle(deck) }}>
        <span className="text-sm text-muted">
          Đã học {learnedCount}/{list.length}
        </span>
      </PageHeader>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div>
          <p className="mb-3 text-sm text-muted">Chạm vào một chữ để xem âm đọc, nghĩa và từ ghép.</p>
          <Stagger as="ul" className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {list.map((k, i) => {
              const active = desktop && i === selected
              return (
                <StaggerItem as="li" key={k.id}>
                  <Button
                    onClick={() => choose(i)}
                    whileHover={{ y: -3 }}
                    aria-label={`${k.kanji}, ${k.hanViet}${cards[k.id] ? ', đã học' : ''}`}
                    aria-pressed={desktop ? active : undefined}
                    className={`relative flex w-full flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                      active ? 'border-ai bg-ai-soft' : 'border-line bg-surface hover:border-ai'
                    }`}
                  >
                    <GridCell className="aspect-square w-full max-w-28 text-[clamp(2.75rem,12vw,3.5rem)]">{k.kanji}</GridCell>
                    <span className="text-sm font-semibold tracking-wide">{k.hanViet}</span>
                    {cards[k.id] && (
                      <span className="absolute right-2 top-2 size-2.5 rounded-full bg-matsu" aria-hidden />
                    )}
                  </Button>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>

        {desktop && (
          <aside className="sticky top-10 rounded-2xl border border-line bg-surface p-5" aria-label="Chi tiết chữ Hán">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={list[selected].id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Detail item={list[selected]} />
              </motion.div>
            </AnimatePresence>
          </aside>
        )}
      </div>

      {!desktop && (
        <BottomSheet open={sheetOpen} onClose={closeSheet} label={`Chi tiết chữ ${list[selected].kanji}`}>
          <Detail item={list[selected]} />
        </BottomSheet>
      )}
    </div>
  )
}

export function Kanji() {
  const deck = useDeck()
  if (!deck || deck.kind !== 'level') return <NotFound />
  return <KanjiInner key={deck.level} level={deck.level} />
}

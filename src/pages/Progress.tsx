import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { deckIds, deckPath, deckTitle, getDeckWords, getKanji } from '../data'
import { progress } from '../lib/progress'
import { MASTERED_INTERVAL } from '../lib/srs'
import { useCards, useDueIds, useStats } from '../hooks/useProgress'
import { LEVELS, TERM_CATEGORIES, type Deck } from '../types'

function DeckRow({ deck }: { deck: Deck }) {
  const words = useMemo(() => getDeckWords(deck).map((w) => w.id), [deck])
  const kanji = useMemo(() => (deck.kind === 'level' ? getKanji(deck.level).map((k) => k.id) : []), [deck])
  const all = useMemo(() => deckIds(deck), [deck])
  const w = useStats(words)
  const k = useStats(kanji)
  const s = useStats(all)

  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link to={deckPath(deck)} className="font-semibold hover:text-ai">
          {deckTitle(deck)}
        </Link>
        <span className="text-sm tabular-nums text-muted">
          {s.learned}/{s.total}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar {...s} label={deckTitle(deck)} />
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <div className="flex gap-1.5">
          <dt>Từ vựng</dt>
          <dd className="tabular-nums text-ink">
            {w.learned} học, {w.mastered} thuộc
          </dd>
        </div>
        {deck.kind === 'level' && (
          <div className="flex gap-1.5">
            <dt>Chữ Hán</dt>
            <dd className="tabular-nums text-ink">
              {k.learned} học, {k.mastered} thuộc
            </dd>
          </div>
        )}
      </dl>
    </li>
  )
}

export function Progress() {
  const cards = useCards()
  const due = useDueIds().length
  const all = Object.values(cards)
  const mastered = all.filter((c) => c.interval >= MASTERED_INTERVAL).length
  const [confirming, setConfirming] = useState(false)

  const totals = [
    { label: 'Đã học', value: all.length },
    { label: 'Đã thuộc', value: mastered },
    { label: 'Cần ôn hôm nay', value: due },
  ]

  return (
    <div>
      <PageHeader title="Tiến độ" />

      <dl className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
        {totals.map((t) => (
          <div key={t.label} className="flex flex-col-reverse px-3 py-4 text-center">
            <dt className="mt-1 text-xs text-muted">{t.label}</dt>
            <dd className="text-3xl font-bold tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-cell-line" aria-hidden /> Đã học
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-ai" aria-hidden /> Đã thuộc (giãn cách từ {MASTERED_INTERVAL} ngày)
        </span>
      </div>

      <h2 className="mt-8 text-lg font-bold">Theo cấp độ</h2>
      <ul className="divide-y divide-line">
        {LEVELS.map((level) => (
          <DeckRow key={level} deck={{ kind: 'level', level }} />
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-bold">Thuật ngữ chuyên ngành</h2>
      <ul className="divide-y divide-line">
        {TERM_CATEGORIES.map((category) => (
          <DeckRow key={category} deck={{ kind: 'terms', category }} />
        ))}
      </ul>

      <section className="mt-10 rounded-xl border border-line p-4">
        <h2 className="font-semibold">Xóa tiến độ</h2>
        <p className="mt-1 text-sm text-muted">Tiến độ đang lưu trên trình duyệt này. Xóa đi sẽ không khôi phục được.</p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                progress.reset()
                setConfirming(false)
              }}
              className="min-h-11 rounded-lg bg-beni px-4 font-semibold text-on-ai"
            >
              Xóa toàn bộ {all.length} thẻ
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border border-line px-4">
              Giữ lại
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={all.length === 0}
            className="mt-3 min-h-11 rounded-lg border border-beni px-4 font-medium text-beni disabled:opacity-40"
          >
            Xóa tiến độ
          </button>
        )}
      </section>
    </div>
  )
}

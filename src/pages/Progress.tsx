import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { BackupPanel } from '../components/BackupPanel'
import { InstallApp } from '../components/InstallApp'
import { Skeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Stagger, StaggerItem } from '../components/Stagger'
import { DECK_ID_PREFIX, EXTRA_DECKS, LEVEL_DECKS, TERM_INFO, VOCAB_DECK_INFO, deckTitle, getTerms, isCurrentId } from '../data'
import { useManifest } from '../hooks/useData'
import { useCards, useDueIds, usePrefixStats } from '../hooks/useProgress'
import { PUBLIC_BUILD, PUBLIC_GRAMMAR_NOTE } from '../lib/edition'
import { progress } from '../lib/progress'
import { MASTERED_INTERVAL, isMastered } from '../lib/srs'
import { LEVELS, TERM_CATEGORIES, type DataManifest } from '../types'

function Row({ to, title, prefix, total, idPattern }: { to: string; title: string; prefix: string; total: number; idPattern?: string }) {
  const s = usePrefixStats(prefix, total, idPattern)
  return (
    <StaggerItem as="li" className="py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <Link to={to} className="font-semibold hover:text-ai">
          {title}
        </Link>
        <span className="text-sm tabular-nums text-muted">
          {s.learned}/{s.total}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar {...s} label={title} />
      </div>
      <p className="mt-1.5 text-sm text-muted">
        {s.mastered} đã thuộc{s.due > 0 && `, ${s.due} cần ôn`}
      </p>
    </StaggerItem>
  )
}

function count(m: DataManifest | undefined, path: string) {
  return m?.files.find((f) => f.path === path)?.count ?? 0
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      <Stagger as="ul" className="divide-y divide-line">
        {children}
      </Stagger>
    </section>
  )
}

export function Progress() {
  const cards = useCards()
  const due = useDueIds().length
  const manifest = useManifest()
  const m = manifest.data
  const all = Object.values(cards).filter((c) => isCurrentId(c.id))
  const mastered = all.filter(isMastered).length
  const [confirming, setConfirming] = useState(false)
  const grammarLevels = PUBLIC_BUILD ? [] : LEVELS.filter((l) => count(m, `grammar/${l.toLowerCase()}.json`) > 0)

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
            <dd className="text-3xl font-bold">
              <AnimatedNumber value={t.value} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-cell-line" aria-hidden /> Đã học
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-ai" aria-hidden /> Đã thuộc (giãn cách từ {MASTERED_INTERVAL} ngày)
        </span>
      </div>

      {!m ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          <Section title="Từ vựng theo cấp">
            {LEVEL_DECKS.map((k) => (
              <Row key={k} to={`/vocab/${k}`} title={deckTitle({ kind: 'vocab', key: k })} prefix={DECK_ID_PREFIX[k]} total={count(m, VOCAB_DECK_INFO[k].path)} />
            ))}
          </Section>
          <div className="space-y-10">
            <Section title="Bộ từ khác">
              {EXTRA_DECKS.map((k) => (
                <Row key={k} to={`/vocab/${k}`} title={VOCAB_DECK_INFO[k].name} prefix={DECK_ID_PREFIX[k]} total={count(m, VOCAB_DECK_INFO[k].path)} />
              ))}
              <Row to="/kanji" title="Chữ Hán" prefix="kj" total={count(m, 'kanji/kanji.json')} />
            </Section>
            {grammarLevels.length > 0 && (
              <Section title="Ngữ pháp">
                {grammarLevels.map((l) => (
                  <Row key={l} to={`/grammar/${l.toLowerCase()}`} title={`Ngữ pháp ${l}`} prefix={`g${l.toLowerCase()}`} total={count(m, `grammar/${l.toLowerCase()}.json`)} />
                ))}
              </Section>
            )}
            {PUBLIC_BUILD && (
              <section>
                <h2 className="text-lg font-bold">Ngữ pháp</h2>
                <p className="mt-2 text-sm text-muted">{PUBLIC_GRAMMAR_NOTE}.</p>
              </section>
            )}
            <Section title="Thuật ngữ chuyên ngành">
              {TERM_CATEGORIES.map((c) => (
                <Row key={c} to={`/terms/${c}`} title={TERM_INFO[c].name} prefix={TERM_INFO[c].prefix} total={getTerms(c).length} idPattern="\d{3}" />
              ))}
            </Section>
          </div>
        </div>
      )}

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Chuyển tiến độ giữa các máy</h2>
          <div className="mt-1">
            <BackupPanel />
          </div>
        </section>
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Cài app</h2>
          <div className="mt-1">
            <InstallApp />
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-line p-4">
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
              Xóa toàn bộ {Object.keys(cards).length} thẻ
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border border-line px-4">
              Giữ lại
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={Object.keys(cards).length === 0}
            className="mt-3 min-h-11 rounded-lg border border-beni px-4 font-medium text-beni disabled:opacity-40"
          >
            Xóa tiến độ
          </button>
        )}
      </section>
    </div>
  )
}

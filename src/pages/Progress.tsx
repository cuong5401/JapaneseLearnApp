import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { BackupPanel } from '../components/BackupPanel'
import { SrsStats } from '../components/SrsStats'
import { InstallApp } from '../components/InstallApp'
import { Skeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Stagger, StaggerItem } from '../components/Stagger'
import { DECK_ID_PREFIX, EXTRA_DECKS, LEVEL_DECKS, TERM_INFO, VOCAB_DECK_INFO, deckTitle, getTerms, isCurrentId } from '../data'
import { useManifest } from '../hooks/useData'
import { useCards, useDueIds, usePrefixStats } from '../hooks/useProgress'
import { PUBLIC_BUILD, publicGrammarNote } from '../lib/edition'
import { kanaLevel, kanaProgress, useKanaStats } from '../lib/kanaProgress'
import { progress } from '../lib/progress'
import { kanaOf } from '../data/kana'
import type { KanaScript } from '../types'
import { MASTERED_INTERVAL, isMastered } from '../lib/srs'
import { LEVELS, TERM_CATEGORIES, type DataManifest } from '../types'
import { t as tr } from '../i18n'

function Row({ to, title, prefix, total, idPattern }: { to: string; title: string; prefix: string; total: number; idPattern?: string }) {
  const s = usePrefixStats(prefix, total, idPattern)
  return (
    <StaggerItem as="li" className="py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <Link to={to} className="inline-flex min-h-11 items-center gap-1 font-semibold hover:text-ai">
          {title}
        </Link>
        <span className="text-sm tabular-nums text-muted">
          {s.learned}/{s.total}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar {...s} label={title} />
      </div>
      <p className="mt-1.5 text-sm text-muted">{tr('progress.daThuoc', { mastered: s.mastered, v: s.due > 0 && tr('progress.duePart', { n: s.due }) })}</p>
    </StaggerItem>
  )
}

/** Kana: "đã học" = đã luyện ít nhất một lần, "đã thuộc" = đúng ngay lần đầu 3 lần liên tiếp. */
function KanaRow({ script, label, ja }: { script: KanaScript; label: string; ja: string }) {
  const stats = useKanaStats()
  const chars = kanaOf(script)
  const learned = chars.filter((k) => stats[k.id]).length
  const mastered = chars.filter((k) => kanaLevel(stats[k.id]) === 'mastered').length
  return (
    <StaggerItem as="li" className="py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <Link to="/kana" className="inline-flex min-h-11 items-center gap-1 font-semibold hover:text-ai">
          {label}{' '}
          <span lang="ja" className="font-jp font-normal text-muted">
            {ja}
          </span>
        </Link>
        <span className="text-sm tabular-nums text-muted" data-kana-progress-row={script}>
          {mastered}/{chars.length}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar total={chars.length} learned={learned} mastered={mastered} label={label} />
      </div>
      <p className="mt-1.5 text-sm text-muted">{tr('progress.daThuocDangHoc', { mastered, v: learned - mastered })}</p>
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
    { label: tr('common.daHoc'), value: all.length },
    { label: tr('common.daThuoc'), value: mastered },
    { label: tr('progress.canOnHomNay'), value: due },
  ]

  return (
    <div>
      <PageHeader title={tr('progress.tienDo')} back={{ to: '/me', label: tr('common.caNhan') }} />

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
          <span className="h-1.5 w-4 rounded-full bg-cell-line" aria-hidden />{tr('progress.daHoc')}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-ai" aria-hidden />{tr('progress.masteredLegend', { n: MASTERED_INTERVAL })}</span>
      </div>

      <SrsStats />

      {!m ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          <Section title={tr('progress.tuVungTheoCap')}>
            {LEVEL_DECKS.map((k) => (
              <Row key={k} to={`/vocab/${k}`} title={deckTitle({ kind: 'vocab', key: k })} prefix={DECK_ID_PREFIX[k]} total={count(m, VOCAB_DECK_INFO[k].path)} />
            ))}
          </Section>
          <div className="space-y-10">
            <Section title={tr('common.kana')}>
              <KanaRow script="hiragana" label={tr('common.hiragana')} ja="あ" />
              <KanaRow script="katakana" label={tr('common.katakana')} ja="ア" />
            </Section>
            <Section title={tr('progress.boTuKhac')}>
              {EXTRA_DECKS.map((k) => (
                <Row key={k} to={`/vocab/${k}`} title={VOCAB_DECK_INFO[k].name} prefix={DECK_ID_PREFIX[k]} total={count(m, VOCAB_DECK_INFO[k].path)} />
              ))}
              <Row to="/kanji" title={tr('common.chuHan')} prefix="kj" total={count(m, 'kanji/kanji.json')} />
              <Row to="/kanji?tab=radicals" title={tr('common.boThu')} prefix="rd" total={count(m, 'kanji/radicals.json')} idPattern="\d{3}" />
            </Section>
            {grammarLevels.length > 0 && (
              <Section title={tr('common.nguPhap2')}>
                {grammarLevels.map((l) => (
                  <Row key={l} to={`/grammar/${l.toLowerCase()}`} title={tr('progress.nguPhap', { l })} prefix={`g${l.toLowerCase()}`} total={count(m, `grammar/${l.toLowerCase()}.json`)} />
                ))}
              </Section>
            )}
            {PUBLIC_BUILD && (
              <section>
                <h2 className="text-lg font-bold">{tr('common.nguPhap2')}</h2>
                <p className="mt-2 text-sm text-muted">{publicGrammarNote()}.</p>
              </section>
            )}
            <Section title={tr('progress.thuatNguChuyenNganh')}>
              {TERM_CATEGORIES.map((c) => (
                <Row key={c} to={`/terms/${c}`} title={TERM_INFO[c].name} prefix={TERM_INFO[c].prefix} total={getTerms(c).length} idPattern="\d{3}" />
              ))}
            </Section>
          </div>
        </div>
      )}

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">{tr('progress.chuyenTienDoGiua')}</h2>
          <div className="mt-1">
            <BackupPanel />
          </div>
        </section>
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">{tr('common.caiApp')}</h2>
          <div className="mt-1">
            <InstallApp />
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-line p-4">
        <h2 className="font-semibold">{tr('progress.xoaTienDo')}</h2>
        <p className="mt-1 text-sm text-muted">{tr('progress.tienDoDangLuu')}</p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                progress.reset()
                kanaProgress.reset()
                setConfirming(false)
              }}
              className="min-h-11 rounded-lg bg-beni px-4 font-semibold text-on-ai"
            >{tr('progress.xoaToanBoThe', { length: Object.keys(cards).length })}</button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border border-line px-4">{tr('common.giuLai')}</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={Object.keys(cards).length === 0}
            className="mt-3 min-h-11 rounded-lg border border-beni px-4 font-medium text-beni disabled:opacity-40"
          >{tr('progress.xoaTienDo')}</button>
        )}
      </section>
    </div>
  )
}

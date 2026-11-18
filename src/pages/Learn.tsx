import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { DECK_ID_PREFIX, EXTRA_DECKS, LEVEL_DECKS, TERM_INFO, VOCAB_DECK_INFO, getTerms } from '../data'
import { useManifest } from '../hooks/useData'
import { usePrefixStats, type DeckStats } from '../hooks/useProgress'
import { useCounterSummary, useGrammarStats, useKanaSummary } from '../hooks/useStudyStats'
import { TERM_CATEGORIES, type DataManifest, type TermCategory, type VocabDeckKey } from '../types'
import { t } from '../i18n'

/**
 * /learn: mọi thứ để học, chia NHÓM. Quy tắc phân biệt (xem CLAUDE.md):
 *  - Tiêu đề nhóm KHÔNG bấm được: chữ đậm nằm ngoài thẻ + mô tả ngắn 1 dòng màu --muted; không ô glyph, không hover,
 *    không con trỏ tay.
 *  - Mục con: cả dòng là link, có ô glyph, tiến độ, mũi tên › ở cuối, hover / active đổi nền, cao ≥ 48px.
 */

const count = (m: DataManifest | undefined, path: string) => m?.files.find((f) => f.path === path)?.count

/** Dòng tiến độ: thanh + "đã học/tổng". Giữ chiều cao cố định khi chưa có tổng số. */
function StatLine({ stats, total, text, label }: { stats: Pick<DeckStats, 'learned' | 'mastered'>; total?: number; text: string; label: string }) {
  return (
    <span className="flex h-5 items-center gap-3">
      <ProgressBar total={total ?? 0} learned={stats.learned} mastered={stats.mastered} label={label} />
      <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{total === undefined ? '…' : text}</span>
    </span>
  )
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted transition-colors group-hover:text-ai" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/** Mục con: cả dòng bấm được (ô glyph, tên + mô tả, tiến độ tùy chọn, ›). */
function Row({ to, glyph, fit, name, sub, badge, children }: { to: string; glyph: string; fit?: number; name: string; sub: string; badge?: string; children?: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        data-learn-row={to}
        className="group flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-sunken active:bg-ai-soft sm:px-4"
      >
        <GridCell fit={fit} className="size-10 shrink-0 font-bold text-ai">
          {glyph}
        </GridCell>
        <span className={children ? 'w-28 shrink-0 sm:w-40' : 'min-w-0 flex-1'}>
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{name}</span>
            {badge && <span className="shrink-0 rounded-full bg-kihada px-2 py-0.5 text-[11px] font-bold text-[#2b2205]">{badge}</span>}
          </span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </span>
        {children && <span className="min-w-0 flex-1">{children}</span>}
        <Chevron />
      </Link>
    </li>
  )
}

/** Nhóm: tiêu đề + mô tả NẰM NGOÀI thẻ (không bấm được), thẻ chứa các mục con. */
function Group({ id, title, desc, children }: { id: string; title: string; desc: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} data-learn-group={id}>
      <h2 id={id} className="text-lg font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-0.5 mb-3 truncate text-sm text-muted">{desc}</p>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</ul>
    </section>
  )
}

function VocabRow({ deck, m }: { deck: VocabDeckKey; m?: DataManifest }) {
  const info = VOCAB_DECK_INFO[deck]
  const total = count(m, info.path)
  const name = info.level ? `${info.level} ${info.name}` : info.name
  const s = usePrefixStats(DECK_ID_PREFIX[deck], total ?? 0)
  return (
    <Row
      to={`/vocab/${deck}`}
      glyph={info.level ?? info.ja[0]}
      fit={info.level ? 0.36 : undefined}
      name={name}
      sub={total !== undefined && m ? t('learn.tuBai', { total, ceil: Math.ceil(total / m.pageSize) }) : (info.note ?? '')}
    >
      <StatLine stats={s} total={total} text={t('common.progressOf', { learned: s.learned, total: total ?? 0, unit: 'word' })} label={t('learn.tienDo', { name })} />
    </Row>
  )
}

function TermRow({ c }: { c: TermCategory }) {
  const info = TERM_INFO[c]
  const total = getTerms(c).length
  const s = usePrefixStats(info.prefix, total, '\\d{3}')
  return (
    <Row to={`/terms/${c}`} glyph={info.ja[0]} name={info.name} sub={info.note}>
      <StatLine stats={s} total={total} text={t('common.progressOf', { learned: s.learned, total, unit: 'word' })} label={t('learn.tienDo', { name: info.name })} />
    </Row>
  )
}

export function Learn() {
  const manifest = useManifest()
  const m = manifest.data
  const kanjiTotal = count(m, 'kanji/kanji.json')
  const radicalTotal = count(m, 'kanji/radicals.json')
  const kanji = usePrefixStats('kj', kanjiTotal ?? 0)
  const radicals = usePrefixStats('rd', radicalTotal ?? 0)
  const grammar = useGrammarStats(m)
  const kana = useKanaSummary()
  const counters = useCounterSummary(m)

  return (
    <div>
      <PageHeader title={t('common.hoc')} />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-6">
        <Group id="g-jlpt" title={t('learn.tuVungJlpt')} desc={t('learn.n5DenN1Chia')}>
          {LEVEL_DECKS.map((k) => (
            <VocabRow key={k} deck={k} m={m} />
          ))}
        </Group>

        <Group id="g-kanji" title={t('common.chuHan')} desc={t('learn.kanjiDesc')}>
          <Row to="/kanji" glyph="漢" name={t('learn.rowKanji')} sub={kanjiTotal !== undefined ? t('common.unitCount', { n: kanjiTotal, unit: 'char' }) : '…'}>
            <StatLine stats={kanji} total={kanjiTotal} text={t('common.progressOf', { learned: kanji.learned, total: kanjiTotal ?? 0, unit: 'char' })} label={t('learn.tienDoChuHan')} />
          </Row>
          <Row to="/kanji?tab=radicals" glyph="部" name={t('common.boThu')} sub={radicalTotal !== undefined ? t('common.unitCount', { n: radicalTotal, unit: 'radical' }) : '…'}>
            <StatLine stats={radicals} total={radicalTotal} text={t('common.progressOf', { learned: radicals.learned, total: radicalTotal ?? 0, unit: 'radical' })} label={t('learn.tienDoBoThu')} />
          </Row>
        </Group>

        <Group id="g-grammar" title={t('common.nguPhap2')} desc={t('learn.n5DenN1Loc')}>
          <Row to="/grammar" glyph="文" name={t('learn.rowGrammar')} sub={t('learn.rowGrammarSub')}>
            <StatLine stats={grammar} total={grammar.total} text={grammar.line} label={t('learn.tienDoNguPhap')} />
          </Row>
        </Group>

        <Group id="g-kana" title={t('common.kana')} desc={t('learn.hiraganaKatakanaGoRomaji')}>
          <Row to="/kana" glyph="あ" name={t('learn.rowKana')} sub={t('learn.rowKanaSub')}>
            <StatLine stats={kana} total={kana.total} text={t('learn.thuoc', { mastered: kana.mastered, total: kana.total })} label={t('learn.tienDoKana')} />
          </Row>
        </Group>

        <Group id="g-extra" title={t('learn.boTuKhac')} desc={t('learn.tuGhepTuLay')}>
          {EXTRA_DECKS.map((k) => (
            <VocabRow key={k} deck={k} m={m} />
          ))}
          <Row to="/learn/counters" glyph="本" name={t('common.cachDem')} sub={t('learn.countersSub')} badge={t('learn.moi')}>
            <span className="flex h-5 items-center justify-end text-xs text-muted" data-counter-summary>
              {counters.line}
            </span>
          </Row>
        </Group>

        <Group id="g-terms" title={t('learn.thuatNgu')} desc={t('learn.tuVungDungHang')}>
          {TERM_CATEGORIES.map((c) => (
            <TermRow key={c} c={c} />
          ))}
        </Group>

        <Group id="g-writing" title={t('learn.luyenViet')} desc={t('learn.phieuTapVietPdf')}>
          <Row to="/writing" glyph="書" name={t('learn.rowWriting')} sub={t('learn.rowWritingSub')} />
          <Row to="/writing?src=kanji&level=N5&bai=1" glyph="漢" name={t('learn.chuHanN5Bai')} sub={t('learn.rowWritingKanjiSub')} />
          <Row to="/writing?src=radical&bai=1" glyph="部" name={t('learn.rowWritingRadical')} sub={t('learn.rowWritingRadicalSub')} />
          <Row to="/writing?src=kana&script=hiragana" glyph="あ" name={t('common.hiragana')} sub={t('learn.rowWritingKanaSub')} />
        </Group>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Stagger, StaggerItem } from '../components/Stagger'
import { DECK_ID_PREFIX, EXTRA_DECKS, LEVEL_DECKS, TERM_INFO, VOCAB_DECK_INFO, getTerms } from '../data'
import { useManifest } from '../hooks/useData'
import { usePrefixStats, type DeckStats } from '../hooks/useProgress'
import { useCounterSummary, useGrammarStats, useKanaSummary } from '../hooks/useStudyStats'
import { TERM_CATEGORIES, type DataManifest, type TermCategory, type VocabDeckKey } from '../types'
import { t } from '../i18n'
import type { CountUnit } from '../i18n/units'

/**
 * /learn: mọi thứ để học, theo nhóm có tiêu đề nhỏ. Thẻ cỡ vừa, mỗi thẻ có tiến độ.
 * Từ vựng JLPT là MỘT thẻ gồm 5 dòng cấp độ (không phải 5 thẻ lớn như trang chủ cũ).
 */

const count = (m: DataManifest | undefined, path: string) => m?.files.find((f) => f.path === path)?.count

/** Dòng tiến độ: thanh + "đã học/tổng". Giữ chiều cao cố định khi chưa có tổng số. */
function StatLine({ stats, total, unit, label }: { stats: Pick<DeckStats, 'learned' | 'mastered'>; total?: number; unit: CountUnit; label: string }) {
  return (
    <span className="flex h-5 items-center gap-3">
      <ProgressBar total={total ?? 0} learned={stats.learned} mastered={stats.mastered} label={label} />
      <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{total === undefined ? '…' : t('common.progressOf', { learned: stats.learned, total, unit })}</span>
    </span>
  )
}

/** Thẻ một mục: cả thẻ bấm được (lớp phủ của link chính), link phụ trong `extra` nằm trên lớp phủ. */
function HubCard({
  to,
  glyph,
  title,
  detail,
  badge,
  children,
  extra,
}: {
  to: string
  glyph: string
  title: string
  detail: string
  badge?: string
  children?: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ai" data-hub={to}>
      <div className="flex items-center gap-3">
        <GridCell className="size-11 text-ai">{glyph}</GridCell>
        <span className="min-w-0">
          <Link to={to} className="font-semibold after:absolute after:inset-0 after:rounded-2xl">
            {title}
          </Link>
          {badge && <span className="ml-2 rounded-full bg-kihada px-2 py-0.5 text-[11px] font-bold text-[#2b2205]">{badge}</span>}
          <span className="block truncate text-sm text-muted">{detail}</span>
        </span>
      </div>
      {children}
      {extra && <div className="relative z-10 mt-auto flex flex-wrap gap-2">{extra}</div>}
    </div>
  )
}

const chip = 'inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-medium hover:border-ai hover:text-ai'

/** Một dòng bộ từ trong thẻ nhiều dòng (JLPT, Bộ từ khác, Thuật ngữ). */
function DeckRow({ to, glyph, fit, name, sub, prefix, total, idPattern, unit = 'word' }: { to: string; glyph: string; fit?: number; name: string; sub: string; prefix: string; total?: number; idPattern?: string; unit?: CountUnit }) {
  const s = usePrefixStats(prefix, total ?? 0, idPattern)
  return (
    <li>
      <Link to={to} className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-sunken" data-deck-row={to}>
        <GridCell fit={fit} className="size-9 font-bold text-ai">
          {glyph}
        </GridCell>
        <span className="w-28 shrink-0 sm:w-36">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </span>
        <span className="min-w-0 flex-1">
          <StatLine stats={s} total={total} unit={unit} label={t('learn.tienDo', { name })} />
        </span>
      </Link>
    </li>
  )
}

function ListCard({ glyph, title, detail, children }: { glyph: string; title: string; detail: string; children: ReactNode }) {
  return (
    <section className="h-full rounded-2xl border border-line bg-surface p-4" aria-label={title}>
      <div className="mb-2 flex items-center gap-3">
        <GridCell className="size-11 text-ai">{glyph}</GridCell>
        <span>
          <h3 className="font-semibold">{title}</h3>
          <span className="block text-sm text-muted">{detail}</span>
        </span>
      </div>
      <ul>{children}</ul>
    </section>
  )
}

function Group({ id, title, children, cols }: { id: string; title: string; children: ReactNode; cols: string }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">
        {title}
      </h2>
      <Stagger as="ul" className={`grid gap-3 lg:gap-4 ${cols}`}>
        {children}
      </Stagger>
    </section>
  )
}

function DeckRows({ decks, m }: { decks: VocabDeckKey[]; m?: DataManifest }) {
  return (
    <>
      {decks.map((k) => {
        const info = VOCAB_DECK_INFO[k]
        const total = count(m, info.path)
        return (
          <DeckRow
            key={k}
            to={`/vocab/${k}`}
            glyph={info.level ?? info.ja[0]}
            fit={info.level ? 0.36 : undefined}
            name={info.level ? `${info.level} ${info.name}` : info.name}
            sub={total !== undefined && m ? t('learn.tuBai', { total, ceil: Math.ceil(total / m.pageSize) }) : (info.note ?? '')}
            prefix={DECK_ID_PREFIX[k]}
            total={total}
          />
        )
      })}
    </>
  )
}

function TermRows() {
  return (
    <>
      {TERM_CATEGORIES.map((c: TermCategory) => {
        const info = TERM_INFO[c]
        return <DeckRow key={c} to={`/terms/${c}`} glyph={info.ja[0]} name={info.name} sub={info.note} prefix={info.prefix} total={getTerms(c).length} idPattern="\d{3}" />
      })}
    </>
  )
}

export function Learn() {
  const manifest = useManifest()
  const m = manifest.data
  const kanjiTotal = count(m, 'kanji/kanji.json')
  const radicalTotal = count(m, 'kanji/radicals.json')
  const kanji = usePrefixStats('kj', kanjiTotal ?? 0)
  const grammar = useGrammarStats(m)
  const kana = useKanaSummary()
  const counters = useCounterSummary(m)

  return (
    <div className="space-y-8">
      <PageHeader title={t('common.hoc')} />

      <Group id="g-vocab" title={t('common.tuVung')} cols="lg:grid-cols-2">
        <StaggerItem as="li">
          <ListCard glyph="語" title={t('learn.tuVungJlpt')} detail={t('learn.n5DenN1Chia')}>
            <DeckRows decks={LEVEL_DECKS} m={m} />
          </ListCard>
        </StaggerItem>
        <StaggerItem as="li">
          <ListCard glyph="熟" title={t('learn.boTuKhac')} detail={t('learn.tuGhepTuLay')}>
            <DeckRows decks={EXTRA_DECKS} m={m} />
          </ListCard>
        </StaggerItem>
      </Group>

      <Group id="g-chars" title={t('learn.chuNguPhapVa')} cols="sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem as="li">
          <HubCard
            to="/kanji"
            glyph="漢"
            title={t('common.chuHan')}
            detail={kanjiTotal !== undefined ? t('learn.chuBoThu', { kanjiTotal, radicalTotal }) : '…'}
            extra={
              <Link to="/kanji?tab=radicals" className={chip}>{t('common.boThu')}</Link>
            }
          >
            <StatLine stats={kanji} total={kanjiTotal} unit="char" label={t('learn.tienDoChuHan')} />
          </HubCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard to="/grammar" glyph="文" title={t('common.nguPhap2')} detail={t('learn.n5DenN1Loc')}>
            <span className="flex h-5 items-center gap-3">
              <ProgressBar total={grammar.total} learned={grammar.learned} mastered={grammar.mastered} label={t('learn.tienDoNguPhap')} />
              <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{grammar.line}</span>
            </span>
          </HubCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard to="/kana" glyph="あ" title={t('common.kana')} detail={t('learn.hiraganaKatakanaGoRomaji')}>
            <span className="flex h-5 items-center gap-3">
              <ProgressBar total={kana.total} learned={kana.learned} mastered={kana.mastered} label={t('learn.tienDoKana')} />
              <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{t('learn.thuoc', { mastered: kana.mastered, total: kana.total })}</span>
            </span>
          </HubCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard to="/learn/counters" glyph="本" title={t('common.cachDem')} badge={t('learn.moi')} detail="助数詞: 本、枚、匹、人…">
            <span className="flex h-5 items-center text-xs text-muted" data-counter-summary>
              {counters.line}
            </span>
          </HubCard>
        </StaggerItem>
      </Group>

      <Group id="g-more" title={t('learn.chuyenNganhVaLuyen')} cols="lg:grid-cols-2">
        <StaggerItem as="li">
          <ListCard glyph="職" title={t('learn.thuatNgu')} detail={t('learn.tuVungDungHang')}>
            <TermRows />
          </ListCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard
            to="/writing"
            glyph="書"
            title={t('learn.luyenViet')}
            detail={t('learn.phieuTapVietPdf')}
            extra={
              <>
                <Link to="/writing?src=kanji&level=N5&bai=1" className={chip}>{t('learn.chuHanN5Bai')}</Link>
                <Link to="/writing?src=kana&script=hiragana" className={chip}>
                  {t('common.hiragana')}
                </Link>
              </>
            }
          >
            <p className="text-sm text-muted">{t('learn.chonBaiChuHan')}</p>
          </HubCard>
        </StaggerItem>
      </Group>
    </div>
  )
}

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

/**
 * /learn: mọi thứ để học, theo nhóm có tiêu đề nhỏ. Thẻ cỡ vừa, mỗi thẻ có tiến độ.
 * Từ vựng JLPT là MỘT thẻ gồm 5 dòng cấp độ (không phải 5 thẻ lớn như trang chủ cũ).
 */

const count = (m: DataManifest | undefined, path: string) => m?.files.find((f) => f.path === path)?.count

/** Dòng tiến độ: thanh + "đã học/tổng". Giữ chiều cao cố định khi chưa có tổng số. */
function StatLine({ stats, total, unit, label }: { stats: Pick<DeckStats, 'learned' | 'mastered'>; total?: number; unit: string; label: string }) {
  return (
    <span className="flex h-5 items-center gap-3">
      <ProgressBar total={total ?? 0} learned={stats.learned} mastered={stats.mastered} label={label} />
      <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{total === undefined ? '…' : `${stats.learned}/${total} ${unit}`}</span>
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

const chip = 'inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-sm font-medium hover:border-ai hover:text-ai'

/** Một dòng bộ từ trong thẻ nhiều dòng (JLPT, Bộ từ khác, Thuật ngữ). */
function DeckRow({ to, glyph, fit, name, sub, prefix, total, idPattern, unit = 'từ' }: { to: string; glyph: string; fit?: number; name: string; sub: string; prefix: string; total?: number; idPattern?: string; unit?: string }) {
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
          <StatLine stats={s} total={total} unit={unit} label={`Tiến độ ${name}`} />
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
            sub={total !== undefined && m ? `${total} từ, ${Math.ceil(total / m.pageSize)} bài` : (info.note ?? '')}
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
      <PageHeader title="Học" />

      <Group id="g-vocab" title="Từ vựng" cols="lg:grid-cols-2">
        <StaggerItem as="li">
          <ListCard glyph="語" title="Từ vựng JLPT" detail="N5 đến N1, chia bài, flashcard, quiz">
            <DeckRows decks={LEVEL_DECKS} m={m} />
          </ListCard>
        </StaggerItem>
        <StaggerItem as="li">
          <ListCard glyph="熟" title="Bộ từ khác" detail="Từ ghép, từ láy, phó từ">
            <DeckRows decks={EXTRA_DECKS} m={m} />
          </ListCard>
        </StaggerItem>
      </Group>

      <Group id="g-chars" title="Chữ, ngữ pháp và cách đếm" cols="sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem as="li">
          <HubCard
            to="/kanji"
            glyph="漢"
            title="Chữ Hán"
            detail={kanjiTotal !== undefined ? `${kanjiTotal} chữ, ${radicalTotal} bộ thủ` : '…'}
            extra={
              <Link to="/kanji?tab=radicals" className={chip}>
                Bộ thủ
              </Link>
            }
          >
            <StatLine stats={kanji} total={kanjiTotal} unit="chữ" label="Tiến độ chữ Hán" />
          </HubCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard to="/grammar" glyph="文" title="Ngữ pháp" detail="N5 đến N1, lọc theo nhóm">
            <span className="flex h-5 items-center gap-3">
              <ProgressBar total={grammar.total} learned={grammar.learned} mastered={grammar.mastered} label="Tiến độ ngữ pháp" />
              <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{grammar.line}</span>
            </span>
          </HubCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard to="/kana" glyph="あ" title="Kana" detail="Hiragana, katakana, gõ romaji">
            <span className="flex h-5 items-center gap-3">
              <ProgressBar total={kana.total} learned={kana.learned} mastered={kana.mastered} label="Tiến độ kana" />
              <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">
                {kana.mastered}/{kana.total} thuộc
              </span>
            </span>
          </HubCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard to="/learn/counters" glyph="本" title="Cách đếm" badge="Mới" detail="助数詞: 本、枚、匹、人…">
            <span className="flex h-5 items-center text-xs text-muted" data-counter-summary>
              {counters.line}
            </span>
          </HubCard>
        </StaggerItem>
      </Group>

      <Group id="g-more" title="Chuyên ngành và luyện viết" cols="lg:grid-cols-2">
        <StaggerItem as="li">
          <ListCard glyph="職" title="Thuật ngữ" detail="Từ vựng dùng hằng ngày ở công ty Nhật">
            <TermRows />
          </ListCard>
        </StaggerItem>
        <StaggerItem as="li">
          <HubCard
            to="/writing"
            glyph="書"
            title="Luyện viết"
            detail="Phiếu tập viết PDF / Word"
            extra={
              <>
                <Link to="/writing?src=kanji&level=N5&bai=1" className={chip}>
                  Chữ Hán N5 bài 1
                </Link>
                <Link to="/writing?src=kana&script=hiragana" className={chip}>
                  Hiragana
                </Link>
              </>
            }
          >
            <p className="text-sm text-muted">Chọn bài chữ Hán, sổ tay, hàng kana hoặc tự nhập chữ; có thứ tự nét, ô tô mờ, xem trước đúng bản in.</p>
          </HubCard>
        </StaggerItem>
      </Group>
    </div>
  )
}

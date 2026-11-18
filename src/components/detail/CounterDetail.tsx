import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cellsOf, counterRef, isFullCounter, numberLabel, type CounterCell } from '../../lib/counters'
import type { CounterEntry, CounterExample, CounterItem, CounterMore } from '../../types'
import { GridCell } from '../GridCell'
import { SpeakButton } from '../SpeakButton'
import { BookmarkButton } from '../notebook/BookmarkButton'
import { t } from '../../i18n'

/** Ô chữ của trợ số từ: 1–3 ký tự (本, 時間, 部屋) tự co cho vừa ô. */
export function CounterGlyph({ counter, className = 'size-20' }: { counter: string; className?: string }) {
  return <GridCell className={className}>{counter}</GridCell>
}

function Example({ ex }: { ex: CounterExample }) {
  return (
    <li className="flex items-start gap-2 py-2.5" data-counter-example>
      <div className="min-w-0 flex-1">
        <p lang="ja" className="font-jp text-lg leading-snug">
          {ex.ja}
        </p>
        <p lang="ja" className="font-jp text-sm text-muted">
          {ex.kana}
        </p>
        <p className="mt-0.5 text-sm">{ex.vi}</p>
      </div>
      <SpeakButton text={ex.kana} size="sm" label={t('common.ngheCauViDu')} />
    </li>
  )
}

/**
 * Bảng đếm 1–10 + 何: lưới 3 cột (4 hàng). Ô bất quy tắc nền --beni; chạm một ô để xem lý do ở dòng chú thích
 * (chiều cao cố định, không làm bảng nhảy). Mỗi ô có nút nghe.
 */
function CountTable({ c }: { c: CounterEntry }) {
  const cells = cellsOf(c)
  const [picked, setPicked] = useState<CounterCell['key'] | null>(() => cells.find((x) => x.irregular)?.key ?? null)
  const cur = cells.find((x) => x.key === picked)
  return (
    <section className="mt-5" aria-label={t('counterDetail.cachDemVoi', { counter: c.counter })}>
      <ol className="grid grid-cols-3 gap-1.5" data-counter-table>
        {cells.map((cell) => {
          const on = cell.key === picked
          return (
            <li
              key={cell.key}
              data-cell={cell.key}
              data-irregular={cell.irregular || undefined}
              className={`relative flex min-h-[5.25rem] flex-col rounded-lg border-2 px-2 pt-1 pb-1.5 transition-colors ${
                cell.irregular ? 'border-beni/60 bg-beni-soft' : 'border-line bg-surface'
              } ${on ? 'ring-2 ring-ai ring-offset-1 ring-offset-paper' : ''}`}
            >
              {/* Chạm cả ô = chọn ô (xem lý do); nút nghe nằm trên lớp chọn. */}
              <button
                type="button"
                onClick={() => setPicked(cell.key)}
                aria-pressed={on}
                aria-label={`${numberLabel(cell.key)} ${c.counter}: ${cell.readings.join(t('counterDetail.hoac'))}${cell.irregular ? t('counterDetail.batQuyTac', { reason: cell.reason }) : ''}`}
                className="absolute inset-0 rounded-md"
              />
              <span className="pointer-events-none flex items-center justify-between">
                <span lang="ja" className={`font-jp text-xs font-semibold tabular-nums ${cell.irregular ? 'text-beni' : 'text-muted'}`}>
                  {numberLabel(cell.key)}
                  {c.counter}
                </span>
                <span className="pointer-events-auto relative -mr-1">
                  <SpeakButton text={cell.readings[0]} size="sm" label={t('common.listenTo', { text: `${numberLabel(cell.key)}${c.counter}` })} />
                </span>
              </span>
              <span lang="ja" className={`pointer-events-none font-jp leading-tight font-semibold break-all ${[...cell.readings[0]].length > 5 ? 'text-[13px]' : 'text-[15px]'}`}>
                {cell.readings[0]}
              </span>
              {cell.readings.length > 1 && (
                <span lang="ja" className="pointer-events-none font-jp text-xs leading-tight break-all text-muted">
                  {cell.readings.slice(1).join('／')}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-2 flex items-start gap-2 text-sm">
        <span className="mt-1 size-3 shrink-0 rounded-sm border-2 border-beni/60 bg-beni-soft" aria-hidden />
        <p className="min-h-10" aria-live="polite" data-cell-reason>
          {cur ? (
            <>
              <span lang="ja" className="font-jp font-semibold">
                {numberLabel(cur.key)}
                {c.counter} {cur.readings[0]}
              </span>
              <span className="text-muted">: {cur.reason}</span>
            </>
          ) : (
            <span className="text-muted">{t('counterDetail.oDoDocBien')}</span>
          )}
        </p>
      </div>
    </section>
  )
}

function MoreForms({ c }: { c: CounterMore }) {
  const forms = c.keyForms.split(/[・、]/).filter(Boolean)
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-sm font-semibold text-muted">{t('counterDetail.cachDocCanNho')}</h3>
      <ul className="flex flex-wrap gap-1.5" data-counter-keyforms>
        {forms.map((f) => (
          <li key={f} className="flex items-center gap-1 rounded-lg border border-beni/60 bg-beni-soft py-0.5 pr-0.5 pl-2.5">
            <span lang="ja" className="font-jp font-semibold">
              {f}
            </span>
            <SpeakButton text={f} size="sm" label={t('common.listenTo', { text: f })} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Chi tiết một trợ số từ (panel / bottom sheet / drawer). */
export function CounterDetail({ item }: { item: CounterItem }) {
  const full = isFullCounter(item)
  const examples = full ? item.examples : item.example ? [item.example] : []
  return (
    <article aria-label={t('counterDetail.chiTietTroSo', { counter: item.counter })} data-detail-counter={item.id}>
      <div className="flex gap-4">
        <CounterGlyph counter={item.counter} className="size-24 sm:size-28" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-muted">
                {item.level} · {item.group}
              </p>
              <p className="mt-0.5 flex items-center gap-2">
                <span lang="ja" className="font-jp text-2xl font-bold">
                  {item.reading}
                </span>
                <SpeakButton text={item.reading.split('／')[0]} size="sm" label={t('common.listenTo', { text: item.counter })} />
              </p>
            </div>
            <BookmarkButton itemRef={counterRef(item.id)} label={t('counterDetail.troSoTu', { counter: item.counter })} className="-mr-2" />
          </div>
        </div>
      </div>
      <p className="mt-4">{item.usage}</p>

      {full ? <CountTable c={item} /> : <MoreForms c={item} />}

      {examples.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-muted">{t('common.viDu')}</h3>
          <ul className="divide-y divide-line">
            {examples.map((ex) => (
              <Example key={ex.ja} ex={ex} />
            ))}
          </ul>
        </section>
      )}

      {full && item.notes && (
        <section className="mt-4 rounded-xl border border-kihada bg-kihada-soft p-3 text-sm" data-counter-notes>
          <h3 className="font-semibold">{t('counterDetail.luuY')}</h3>
          <p className="mt-1">{item.notes}</p>
        </section>
      )}

      {full && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            to={`/learn/counters?mode=flashcards&ct=${item.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line font-semibold hover:bg-sunken"
          >
            {t('common.flashcard')}
          </Link>
          <Link
            to={`/learn/counters?mode=quiz&ct=${item.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line font-semibold hover:bg-sunken"
          >
            {t('common.quiz')}
          </Link>
        </div>
      )}
    </article>
  )
}

import { cellsOf, isFullCounter, numberLabel, type CounterPair } from '../../lib/counters'
import type { CounterFormKey, CounterItem } from '../../types'
import { GridCell } from '../GridCell'
import { SpeakButton } from '../SpeakButton'
import { Flip } from './Flip'
import type { FacesRenderer } from './faces'

/** "3 + 本" (số + trợ số từ): số ở ô vuông, trợ số từ ở ô giấy tập viết. */
export function NumberPlusCounter({ n, counter, size = 'lg' }: { n: CounterFormKey; counter: string; size?: 'lg' | 'md' }) {
  const box = size === 'lg' ? 'w-[clamp(5rem,26cqw,7.5rem)]' : 'w-[clamp(4rem,22cqw,5.5rem)]'
  return (
    <span className="flex items-center gap-3" data-number-counter={`${n}+${counter}`}>
      <span
        lang="ja"
        className={`grid aspect-square place-items-center rounded-[3px] border-2 border-ai bg-ai-soft font-jp font-bold text-ai tabular-nums ${box} ${
          size === 'lg' ? 'text-[clamp(2.25rem,13cqw,3.5rem)]' : 'text-[clamp(1.75rem,10cqw,2.5rem)]'
        }`}
      >
        {numberLabel(n)}
      </span>
      <span aria-hidden className="text-2xl font-bold text-muted">
        +
      </span>
      <GridCell className={box}>{counter}</GridCell>
    </span>
  )
}

/** Mặt sau của một ô: cách đọc, nút nghe, lý do biến âm. */
function PairBack({ item, n }: { item: CounterItem; n: CounterFormKey }) {
  const cell = isFullCounter(item) ? cellsOf(item).find((c) => c.key === n) : undefined
  if (!cell) return <p className="text-muted">Không có ô này trong bảng.</p>
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center" data-pair-back={`${item.id}-${n}`}>
      <p lang="ja" className="font-jp text-lg text-muted">
        {numberLabel(n)}
        {item.counter}
      </p>
      <p className="flex items-center gap-3">
        <span lang="ja" className="font-jp text-[clamp(2rem,11cqw,3rem)] font-bold">
          {cell.readings[0]}
        </span>
        {/* Nút nghe không lật / không kéo thẻ */}
        <span onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <SpeakButton text={cell.readings[0]} label={`Nghe ${numberLabel(n)}${item.counter}`} />
        </span>
      </p>
      {cell.readings.length > 1 && (
        <p className="text-sm text-muted">
          Cũng đọc:{' '}
          <span lang="ja" className="font-jp text-base text-ink">
            {cell.readings.slice(1).join('、')}
          </span>
        </p>
      )}
      <p className={`rounded-lg px-3 py-1.5 font-medium ${cell.irregular ? 'bg-beni-soft text-beni' : 'bg-sunken text-muted'}`} data-pair-reason>
        {cell.reason}
      </p>
      <p className="max-w-sm text-sm text-muted">{item.usage}</p>
    </div>
  )
}

/** Thẻ "số + trợ số từ": mặt trước 3 + 本 (kèm cách dùng ngắn để đoán nghĩa), mặt sau さんぼん + lý do. */
export const pairFaces: FacesRenderer<CounterPair> = (p, flipped) => (
  <Flip
    flipped={flipped}
    front={
      <div className="flex flex-col items-center gap-4 text-center" data-pair-front={p.id}>
        <NumberPlusCounter n={p.key} counter={p.counter.counter} />
        <p className="line-clamp-2 max-w-sm text-sm text-muted">{p.counter.usage}</p>
      </div>
    }
    back={<PairBack item={p.counter} n={p.key} />}
  />
)

/** Mặt trước / sau cho mục trợ số từ bất kỳ (sổ tay, Ôn tập): ô số thì như pairFaces, trợ số từ thì chữ → cách đọc + cách dùng. */
export function CounterFront({ item, n }: { item: CounterItem; n?: CounterFormKey }) {
  if (n) return <NumberPlusCounter n={n} counter={item.counter} size="md" />
  return <GridCell className="w-[clamp(7rem,34cqw,9.5rem)]">{item.counter}</GridCell>
}

export function CounterBack({ item, n }: { item: CounterItem; n?: CounterFormKey }) {
  if (n) return <PairBack item={item} n={n} />
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="flex items-center gap-3">
        <span lang="ja" className="font-jp text-2xl font-bold">
          {item.reading}
        </span>
        <span onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <SpeakButton text={item.reading.split('／')[0]} size="sm" label={`Nghe ${item.counter}`} />
        </span>
      </p>
      <p className="max-w-sm">{item.usage}</p>
      <p lang="ja" className="font-jp text-sm text-muted">
        {isFullCounter(item) ? cellsOf(item).slice(0, 3).map((c) => c.readings[0]).join('、') + '…' : item.keyForms}
      </p>
    </div>
  )
}

export function counterEntryFaces(item: CounterItem, n: CounterFormKey | undefined, flipped: boolean) {
  return <Flip flipped={flipped} front={<CounterFront item={item} n={n} />} back={<CounterBack item={item} n={n} />} />
}

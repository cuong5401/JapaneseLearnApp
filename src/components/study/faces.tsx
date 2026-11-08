import type { ReactNode } from 'react'
import { kanjiOfRadical } from '../../data/radicalKanji'
import type { KanjiEntry, RadicalItem, StudyEntry, VocabItem } from '../../types'
import { GridCell } from '../GridCell'
import { SpeakButton } from '../SpeakButton'
import { Flip } from './Flip'
import { CardFaces } from './VocabCardFaces'

/** Mặt thẻ: nhận mục và trạng thái lật, trả về cả hai mặt (dùng lớp .flip/.flip-inner). */
export type FacesRenderer<T> = (item: T, flipped: boolean) => ReactNode

/** Mặt thẻ mặc định cho từ vựng. */
export const vocabFaces: FacesRenderer<VocabItem> = (item, flipped) => <CardFaces item={item} flipped={flipped} />

/** Số từ tiêu biểu hiện ở mặt sau thẻ chữ Hán. */
export const KANJI_SAMPLE_WORDS = 4

/** Id các từ tiêu biểu của một nhóm chữ (để tải trước cả bài). */
export const sampleWordIds = (chars: readonly KanjiEntry[]) => chars.flatMap((k) => k.words.slice(0, KANJI_SAMPLE_WORDS))

/** Thẻ chữ Hán: mặt trước là chữ, mặt sau là âm Hán Việt, âm phụ và vài từ tiêu biểu. */
export function kanjiFaces(words: Map<string, StudyEntry>): FacesRenderer<KanjiEntry> {
  return (k, flipped) => {
    const samples = k.words.slice(0, KANJI_SAMPLE_WORDS).flatMap((id) => {
      const e = words.get(id)
      return e?.kind === 'word' ? [e.item] : []
    })
    return (
      <Flip
        flipped={flipped}
        front={<GridCell className="w-[clamp(8rem,52cqw,12rem)]">{k.kanji}</GridCell>}
        back={
          <>
            <div className="flex items-center gap-4 pr-9">
              <GridCell className="w-20 shrink-0">{k.kanji}</GridCell>
              <div className="min-w-0">
                <p className="text-3xl font-bold tracking-wide">{k.hanViet}</p>
                {k.hanVietAlt?.length ? <p className="text-sm text-muted">Âm khác: {k.hanVietAlt.join(', ')}</p> : null}
                <p className="text-sm text-muted">{k.wordCount} từ chứa chữ này</p>
              </div>
            </div>
            {samples.length > 0 && (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {samples.map((w) => (
                  <li key={w.id} className="flex items-baseline gap-x-3 py-2">
                    <span lang="ja" className="shrink-0 font-jp text-lg font-medium">
                      {w.word}
                    </span>
                    {w.reading && w.reading !== w.word && (
                      <span lang="ja" className="min-w-0 truncate font-jp text-sm text-muted">
                        {w.reading}
                      </span>
                    )}
                    <span className="ml-auto max-w-[50%] text-right text-sm">{w.meaning}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
      />
    )
  }
}

/** Thẻ bộ thủ: mặt trước là bộ, mặt sau là tên, nghĩa và chữ Hán thuộc bộ. */
export function radicalFaces(kanjiByChar: Map<string, KanjiEntry>): FacesRenderer<RadicalItem> {
  return (r, flipped) => {
    const chars = kanjiOfRadical(r.no).slice(0, 8)
    return (
      <Flip
        flipped={flipped}
        front={<GridCell className="w-[clamp(8rem,52cqw,12rem)]">{r.radical}</GridCell>}
        back={
          <>
            <div className="flex items-center gap-4 pr-9">
              <GridCell className="w-20 shrink-0">{r.radical}</GridCell>
              <div className="min-w-0">
                <p className="text-sm text-muted">Bộ số {r.no}</p>
                <p className="text-3xl font-bold capitalize">{r.name}</p>
                <p className="text-muted first-letter:uppercase">{r.meaning}</p>
              </div>
            </div>
            {chars.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-sm text-muted">Chữ Hán thuộc bộ này</p>
                <ul className="grid grid-cols-4 gap-2">
                  {chars.map((ch) => (
                    <li key={ch} className="flex flex-col items-center gap-0.5">
                      <GridCell className="w-full max-w-14">{ch}</GridCell>
                      <span className="max-w-full truncate text-[11px] font-semibold">{kanjiByChar.get(ch)?.hanViet ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        }
      />
    )
  }
}

/** Chữ ngoài kanji.json (lưu từ bảng vẽ tay): mặt sau chỉ báo chưa có dữ liệu, mở chi tiết để xem từ chứa chữ. */
function charFaces(ch: string, flipped: boolean) {
  return (
    <Flip
      flipped={flipped}
      front={<GridCell className="w-[clamp(7rem,40cqw,10rem)]">{ch}</GridCell>}
      back={
        <div className="pr-9 text-center">
          <GridCell className="mx-auto w-24">{ch}</GridCell>
          <p className="mt-3 text-muted">Chữ này chưa có trong danh sách chữ Hán của Kotonoha. Mở chi tiết để xem các từ chứa chữ.</p>
        </div>
      }
    />
  )
}

/** Mục sổ tay: bọc StudyEntry để có `id` cho flashcard. */
export interface EntryCard {
  id: string
  entry: StudyEntry
}

export function entryLabel(e: StudyEntry): string {
  if (e.kind === 'word') return e.item.word
  if (e.kind === 'kanji') return e.item.kanji
  if (e.kind === 'radical') return `bộ ${e.item.radical}`
  if (e.kind === 'char') return e.item.char
  return e.item.title
}

/** Thẻ cho mục bất kỳ trong sổ tay: chọn mặt thẻ theo loại. */
export function entryFaces(words: Map<string, StudyEntry>, kanjiByChar: Map<string, KanjiEntry>): FacesRenderer<EntryCard> {
  const kanji = kanjiFaces(words)
  const radical = radicalFaces(kanjiByChar)
  const vocab = vocabFaces
  return ({ entry }, flipped) => {
    if (entry.kind === 'word') return vocab(entry.item, flipped)
    if (entry.kind === 'kanji') return kanji(entry.item, flipped)
    if (entry.kind === 'radical') return radical(entry.item, flipped)
    if (entry.kind === 'char') return charFaces(entry.item.char, flipped)
    const g = entry.item
    const ex = g.examples?.[0]
    return (
      <Flip
        flipped={flipped}
        front={
          <p lang="ja" className="max-w-full text-center font-jp text-[clamp(1.5rem,9cqw,2.5rem)] leading-snug font-bold break-words">
            {g.title}
          </p>
        }
        back={
          <div className="pr-9">
            <p lang="ja" className="font-jp text-xl font-bold">
              {g.title}
            </p>
            <p className="mt-3 text-xl font-semibold">{g.meaning ?? 'Mẫu này chưa tách được ý nghĩa, mở trang chi tiết để xem.'}</p>
            {g.connection && <p className="mt-2 text-sm text-muted">{g.connection}</p>}
            {ex && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="flex items-start gap-2">
                  <p lang="ja" className="min-w-0 flex-1 font-jp text-lg">
                    {ex.ja}
                  </p>
                  <SpeakButton text={ex.ja.replace(/[（(][぀-ヿー\s・]+[）)]/g, '')} size="sm" label="Nghe câu ví dụ" />
                </div>
                {ex.vi && <p className="text-muted">{ex.vi}</p>}
              </div>
            )}
          </div>
        }
      />
    )
  }
}

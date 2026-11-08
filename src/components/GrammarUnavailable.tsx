import { PUBLIC_GRAMMAR_NOTE } from '../lib/edition'
import { GridCell } from './GridCell'
import { PageHeader } from './PageHeader'
import { ButtonLink } from './Pressable'

/** Bản web công khai không kèm ngữ pháp lấy từ sách: thay trang lỗi tải bằng lời giải thích. */
export function GrammarUnavailable() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title="Ngữ pháp" back={{ to: '/', label: 'Trang chủ' }} />
      <section className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-10 text-center">
        <GridCell className="size-20 text-ai">文</GridCell>
        <h2 className="mt-5 text-xl font-bold">{PUBLIC_GRAMMAR_NOTE}</h2>
        <p className="mt-2 max-w-md text-muted">
          Nội dung ngữ pháp được soạn từ giáo trình nên không đưa lên bản web công khai. Bạn vẫn học được đầy đủ từ vựng, chữ Hán, bộ thủ và thuật
          ngữ chuyên ngành.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/vocab/n5" className="inline-flex min-h-12 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
            Học từ vựng
          </ButtonLink>
          <ButtonLink to="/kanji" className="inline-flex min-h-12 items-center rounded-lg border-2 border-ai px-5 font-semibold text-ai hover:bg-ai-soft">
            Chữ Hán
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}

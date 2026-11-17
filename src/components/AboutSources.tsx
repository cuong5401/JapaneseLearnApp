import { READINGS_CREDIT } from '../lib/readings'
import { STROKE_CREDIT } from '../lib/strokes'

const LINK = 'font-medium text-ai hover:underline'

/** Giới thiệu + nguồn dữ liệu bên ngoài (giấy phép bắt buộc ghi nguồn). Dùng ở Cá nhân và Cài đặt. */
export function AboutSources({ id = 'about-title' }: { id?: string }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-surface p-5 sm:p-6" data-about>
      <h2 id={id} className="text-lg font-bold">
        Giới thiệu
      </h2>
      <p className="mt-1 text-sm text-muted">Kotonoha – web học tiếng Nhật dùng cá nhân. Nguồn dữ liệu bên ngoài:</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        <li>
          {STROKE_CREDIT} 3.0 –{' '}
          <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className={LINK}>
            kanjivg.tagaini.net
          </a>
          ,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer" className={LINK}>
            giấy phép
          </a>
        </li>
        <li>
          {READINGS_CREDIT} –{' '}
          <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noreferrer" className={LINK}>
            KANJIDIC Project
          </a>
          ,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={LINK}>
            giấy phép
          </a>
        </li>
        <li>
          Câu ví dụ:{' '}
          <a href="https://tatoeba.org" target="_blank" rel="noreferrer" className={LINK}>
            Tatoeba
          </a>{' '}
          (CC BY 2.0 FR)
        </li>
        <li>Cách đếm (trợ số từ): Kotonoha tự soạn</li>
        <li>Font trong phiếu luyện viết: Noto Sans JP, Be Vietnam Pro, Klee One (SIL Open Font License 1.1)</li>
        <li>Bộ thủ của chữ: Unicode Unihan (© Unicode, Inc.)</li>
        <li>Nhận dạng chữ viết tay: KanjiCanvas (Dominik Klein, MIT)</li>
      </ul>
    </section>
  )
}

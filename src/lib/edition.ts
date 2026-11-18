/**
 * Phiên bản đang chạy.
 *  - Bản cá nhân (npm run dev / npm run build): đầy đủ dữ liệu.
 *  - Bản public (GitHub Pages, VITE_PUBLIC_BUILD=true hoặc --mode public): không có ngữ pháp N4–N1.
 */
import { t } from '../i18n'

export const PUBLIC_BUILD: boolean = typeof __PUBLIC_BUILD__ !== 'undefined' && __PUBLIC_BUILD__

export const publicGrammarNote = () => t('edition.grammarPrivate')

/** ID ngữ pháp (gn4-…) không dùng được ở bản public. */
export const isGrammarId = (id: string) => /^gn\d-/.test(id)

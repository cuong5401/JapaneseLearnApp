/**
 * Phiên bản đang chạy.
 *  - Bản cá nhân (npm run dev / npm run build): đầy đủ dữ liệu.
 *  - Bản public (GitHub Pages, VITE_PUBLIC_BUILD=true hoặc --mode public): không có ngữ pháp N4–N1.
 */
export const PUBLIC_BUILD: boolean = typeof __PUBLIC_BUILD__ !== 'undefined' && __PUBLIC_BUILD__

export const PUBLIC_GRAMMAR_NOTE = 'Phần ngữ pháp chỉ có trong bản cá nhân'

/** ID ngữ pháp (gn4-…) không dùng được ở bản public. */
export const isGrammarId = (id: string) => /^gn\d-/.test(id)

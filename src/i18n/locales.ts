import type { Dict } from './types'

/**
 * Bảng đăng ký ngôn ngữ giao diện: thêm ngôn ngữ = thêm file từ điển `src/i18n/<mã>.ts` + MỘT dòng ở đây.
 * Mọi nơi khác (Cài đặt, Xuất / Nhập tiến độ, <html lang>, <title>, Intl ngày / số / số nhiều, test, script quét,
 * font phiếu luyện viết, bảng rà soát) đọc từ bảng này.
 *  - khóa: mã BCP 47 ngắn, dùng cho <html lang> và giá trị lưu (`jla:v1:locale`);
 *  - name: tên ngôn ngữ viết bằng chính ngôn ngữ đó (không dịch);
 *  - intl: locale cho Intl (DateTimeFormat, NumberFormat, PluralRules);
 *  - title: <title> của trang;
 *  - load: import động từ điển (chunk riêng, tải lười).
 * Ngôn ngữ đầu tiên là mặc định và là từ điển gốc (vi.ts định nghĩa bộ khóa).
 */
// i18n-ignore-start: tên ngôn ngữ và tiêu đề trang viết bằng chính ngôn ngữ đó
export const LOCALE_REGISTRY = {
  vi: { name: 'Tiếng Việt', intl: 'vi-VN', title: 'Kotonoha | Học tiếng Nhật', load: () => import('./vi') as Promise<{ default: Dict }> },
  ja: { name: '日本語', intl: 'ja-JP', title: 'Kotonoha | 日本語学習', load: () => import('./ja') },
} satisfies Record<string, LocaleInfo>
// i18n-ignore-end

export interface LocaleInfo {
  name: string
  intl: string
  title: string
  load: () => Promise<{ default: Dict }>
}

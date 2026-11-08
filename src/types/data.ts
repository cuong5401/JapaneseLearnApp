/**
 * Kiểu dữ liệu cho các file JSON trong public/data (sinh từ scripts/convert_xlsx.py).
 * Mọi file danh sách là mảng JSON, mỗi phần tử một dòng.
 */

export interface DataFile {
  /** Đường dẫn tương đối so với public/data, ví dụ "vocab/n5.json" */
  path: string
  kind: 'vocab' | 'kanji' | 'radicals' | 'grammar'
  title: string
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  count: number
  bytes: number
  /** Đổi khi nội dung đổi: dùng làm khóa cache */
  hash: string
}

export interface DataManifest {
  version: string
  source: string
  generatedAt: string
  /** Số mục mỗi "bài" mặc định khi chia trang */
  pageSize: number
  files: DataFile[]
}

/** vocab/n5…n1.json, vocab/compounds.json, vocab/onomatopoeia.json, vocab/adverbs.json */
export interface VocabEntry {
  /** Tính từ chữ + cách đọc nên ổn định giữa các lần chạy script: dùng làm khóa SRS */
  id: string
  word: string
  /** Kana; có thể rỗng nếu file gốc thiếu (xem import-report.md) */
  reading: string
  meaning: string
  /** Âm Hán Việt. N5–N3 viết hoa chữ đầu ("Tư đạt"), N2 và từ ghép viết hoa toàn bộ ("NHÂN SINH") */
  hanViet?: string
  /** "danh từ" | "động từ" | "tính từ" (chỉ có ở N5, một phần N4) */
  pos?: string
  /** Cách viết khác: 探す、捜す → alt: ["捜す"] */
  alt?: string[]
  readingAlt?: string[]
  /** Từ gốc tiếng nước ngoài của từ katakana (N2): "antenna" */
  origin?: string
  /** Giải thích thêm (N2) */
  note?: string
  /** Bạn đã đánh dấu "Chưa thuộc" trong Excel */
  weak?: true
  /** N1: số thứ tự của từ chính trong file gốc */
  no?: number
  /** N1: ID các từ phái sinh của từ chính này */
  related?: string[]
  /** N1: ID từ chính mà từ này phái sinh từ đó */
  parent?: string
}

/** kanji/kanji.json: tổng hợp từ cột Hán Việt của từ vựng và từ ghép */
export interface KanjiEntry {
  id: string
  kanji: string
  /** Âm Hán Việt hay gặp nhất, viết hoa */
  hanViet: string
  hanVietAlt?: string[]
  /** Cấp từ vựng ĐẦU TIÊN có chữ này trong file của bạn (không phải cấp kanji JLPT chính thức) */
  firstLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  /** Tối đa 40 ID từ vựng chứa chữ này, cấp thấp trước */
  words: string[]
  wordCount: number
}

/** kanji/radicals.json */
export interface RadicalEntry {
  no: number
  radical: string
  name: string
  meaning: string
}

export interface GrammarExample {
  ja: string
  /** Có thể rỗng nếu không tách được câu dịch */
  vi: string
}

/** grammar/n4…n1.json (n5 hiện rỗng vì sheet gốc trống) */
export interface GrammarEntry {
  id: string
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  /** N4: số bài Minna (26–50) */
  lesson?: number
  no: number
  title: string
  /** Dòng "意味" / "Ý nghĩa" nếu tìm thấy */
  meaning?: string
  /** Dòng "接続" (cách kết nối) nếu tìm thấy */
  connection?: string
  /** Các câu ví dụ đánh số ①②… */
  examples?: GrammarExample[]
  /** Toàn bộ nội dung đã làm sạch, mỗi phần tử một dòng: luôn hiển thị được kể cả khi tách trường thất bại (mục tự soạn: rỗng) */
  body: string[]
  /** Nhóm chủ đề (N3: thời điểm, nguyên nhân…; N5: trợ từ…) */
  group?: string
  /** Lưu ý, phân biệt với mẫu dễ nhầm (mục tự soạn) */
  notes?: string[]
  /** ID các mẫu liên quan cùng cấp */
  related?: string[]
  /** 'kotonoha' = Kotonoha tự soạn (data-source/grammar-extra), không lấy từ file Excel */
  source?: 'kotonoha'
  /** Soạn tự động, chưa có người kiểm tra (xem lib/grammarChecked) */
  auto?: boolean
}

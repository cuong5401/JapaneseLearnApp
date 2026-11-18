import type viDict from './vi'

/** Bộ khóa do từ điển gốc (vi.ts) định nghĩa; mọi từ điển khác phải có đủ đúng các khóa này. */
export type MessageKey = keyof typeof viDict
export type Dict = Record<MessageKey, string>

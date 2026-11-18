import { aiSettings } from '../settings'
import { ja } from './ja'
import type { AiContent } from './types'
import { vi } from './vi'

export type { AiContent, ExplainLang } from './types'

/** Nội dung gửi AI theo tùy chọn "Ngôn ngữ giải thích của AI" (mặc định tiếng Việt). */
export const aiContent = (): AiContent => (aiSettings.getSnapshot().explainLang === 'ja' ? ja : vi)

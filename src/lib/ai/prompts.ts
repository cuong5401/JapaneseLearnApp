import { t, type MessageKey } from '../../i18n'
import type { Level } from '../../types'
import { aiContent } from './content'

/** Chế độ cố định theo cuộc trò chuyện; 'mixed' (Hỗn hợp) là mặc định khi tạo cuộc mới. */
export type ChatMode = 'mixed' | 'lookup' | 'grammar' | 'conversation' | 'correct'
export const DEFAULT_MODE: ChatMode = 'mixed'

const mode = (id: ChatMode, glyph: string, label: MessageKey, placeholder: MessageKey, desc: MessageKey) => ({
  id,
  glyph,
  get label() {
    return t(label)
  },
  get placeholder() {
    return t(placeholder)
  },
  get desc() {
    return t(desc)
  },
})

/** Chế độ chat: nhãn và placeholder là chữ giao diện (theo ngôn ngữ giao diện). */
export const MODES: { id: ChatMode; glyph: string; label: string; placeholder: string; desc: string }[] = [
  mode('mixed', '混', 'aiMode.mixed', 'aiMode.mixedPlaceholder', 'aiMode.mixedDesc'),
  mode('lookup', '辞', 'aiMode.lookup', 'aiMode.lookupPlaceholder', 'aiMode.lookupDesc'),
  mode('grammar', '文', 'aiMode.grammar', 'aiMode.grammarPlaceholder', 'aiMode.grammarDesc'),
  mode('conversation', '話', 'aiMode.conversation', 'aiMode.conversationPlaceholder', 'aiMode.conversationDesc'),
  mode('correct', '直', 'aiMode.correct', 'aiMode.correctPlaceholder', 'aiMode.correctDesc'),
]

export const modeInfo = (m: ChatMode) => MODES.find((x) => x.id === m) ?? MODES[0]

export const isChatMode = (v: unknown): v is ChatMode => MODES.some((m) => m.id === v)

/** System prompt theo "Ngôn ngữ giải thích của AI" (mặc định tiếng Việt), không theo ngôn ngữ giao diện. */
export function systemPrompt(mode: ChatMode, level: Level): string {
  const c = aiContent()
  return `${c.system(level)}

${c.modes[mode]}`
}

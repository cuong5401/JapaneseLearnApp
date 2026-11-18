import { t, type MessageKey } from '../../i18n'
import type { Level } from '../../types'
import { aiContent } from './content'

export type ChatMode = 'lookup' | 'grammar' | 'conversation' | 'correct'

const mode = (id: ChatMode, label: MessageKey, placeholder: MessageKey) => ({
  id,
  get label() {
    return t(label)
  },
  get placeholder() {
    return t(placeholder)
  },
})

/** Chế độ chat: nhãn và placeholder là chữ giao diện (theo ngôn ngữ giao diện). */
export const MODES: { id: ChatMode; label: string; placeholder: string }[] = [
  mode('lookup', 'aiMode.lookup', 'aiMode.lookupPlaceholder'),
  mode('grammar', 'aiMode.grammar', 'aiMode.grammarPlaceholder'),
  mode('conversation', 'aiMode.conversation', 'aiMode.conversationPlaceholder'),
  mode('correct', 'aiMode.correct', 'aiMode.correctPlaceholder'),
]

export const isChatMode = (v: unknown): v is ChatMode => MODES.some((m) => m.id === v)

/** System prompt theo "Ngôn ngữ giải thích của AI" (mặc định tiếng Việt), không theo ngôn ngữ giao diện. */
export function systemPrompt(mode: ChatMode, level: Level): string {
  const c = aiContent()
  return `${c.system(level)}

${c.modes[mode]}`
}

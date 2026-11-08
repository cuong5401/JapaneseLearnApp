import { GridCell } from '../GridCell'
import { ChoiceQuiz, type ChoiceQuizConfig } from './ChoiceQuiz'
import type { KanjiEntry } from '../../types'

const CONFIG: ChoiceQuizConfig<KanjiEntry> = {
  title: 'Quiz chữ Hán',
  prompt: () => 'Âm Hán Việt của chữ này là gì?',
  question: (k) => <GridCell className="w-[clamp(7rem,40cqw,10rem)]">{k.kanji}</GridCell>,
  answer: (k) => k.hanViet,
  alsoRight: (k) => k.hanVietAlt ?? [],
  note: (k) => (k.hanVietAlt?.length ? `(âm khác: ${k.hanVietAlt.join(', ')})` : null),
  shortcut: 'Chọn âm Hán Việt',
}

/**
 * Nhìn chữ, chọn âm Hán Việt. `pool`: các chữ được hỏi (một bài); `distractors`: nguồn đáp án nhiễu
 * (mặc định chính `pool`, nên truyền cả danh sách đã lọc để đáp án đa dạng hơn).
 */
export function KanjiQuiz({ pool, distractors, length }: { pool: KanjiEntry[]; distractors?: KanjiEntry[]; length?: number }) {
  return <ChoiceQuiz items={pool} pool={distractors ?? pool} length={length} config={CONFIG} />
}

import { GridCell } from '../GridCell'
import { ChoiceQuiz, type ChoiceQuizConfig } from './ChoiceQuiz'
import type { KanjiEntry } from '../../types'
import { t } from '../../i18n'

const CONFIG: ChoiceQuizConfig<KanjiEntry> = {
  get title() {
    return t('kanjiQuiz.quizChuHan')
  },
  prompt: () => t('kanjiQuiz.amHanVietCua'),
  question: (k) => <GridCell className="w-[clamp(7rem,40cqw,10rem)]">{k.kanji}</GridCell>,
  answer: (k) => k.hanViet,
  alsoRight: (k) => k.hanVietAlt ?? [],
  note: (k) => (k.hanVietAlt?.length ? t('kanjiQuiz.amKhac', { join: k.hanVietAlt.join(', ') }) : null),
  get shortcut() {
    return t('kanjiQuiz.chonAmHanViet')
  },
}

/**
 * Nhìn chữ, chọn âm Hán Việt. `pool`: các chữ được hỏi (một bài); `distractors`: nguồn đáp án nhiễu
 * (mặc định chính `pool`, nên truyền cả danh sách đã lọc để đáp án đa dạng hơn).
 */
export function KanjiQuiz({ pool, distractors, length }: { pool: KanjiEntry[]; distractors?: KanjiEntry[]; length?: number }) {
  return <ChoiceQuiz items={pool} pool={distractors ?? pool} length={length} config={CONFIG} />
}

import { KANA_NOTES, SCRIPT_LABELS, confusables, counterpart } from '../../data/kana'
import { kanaLevel, MASTERED_STREAK, type KanaStat } from '../../lib/kanaProgress'
import { speak } from '../../lib/speech'
import type { KanaChar } from '../../types'
import { GridCell } from '../GridCell'
import { SpeakButton } from '../SpeakButton'
import { LEVEL_CELL, LEVEL_LABEL } from './levels'

function MiniChar({ k, onPick }: { k: KanaChar; onPick: (k: KanaChar) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(k)}
      aria-label={`${k.kana}, ${k.romaji}`}
      className="flex w-16 flex-col items-center gap-1 rounded-lg border border-line bg-surface p-1.5 hover:border-ai"
    >
      <GridCell className="w-full">{k.kana}</GridCell>
      <span className="text-xs text-muted">{k.romaji}</span>
    </button>
  )
}

/** Chi tiết một chữ: chữ lớn, cách đọc, chữ ở bảng kia, chữ dễ nhầm, mức thuộc. */
export function KanaDetail({ k, stat, onPick }: { k: KanaChar; stat?: KanaStat; onPick: (k: KanaChar) => void }) {
  const other = counterpart(k)
  const similar = confusables(k).slice(0, 6)
  const level = kanaLevel(stat)
  const note = KANA_NOTES[k.kana]
  return (
    <article aria-label={`Chữ ${k.kana}`}>
      <div className="flex items-center gap-5">
        <GridCell className="w-32 shrink-0 text-ai sm:w-36">{k.kana}</GridCell>
        <div className="min-w-0">
          <p className="text-sm text-muted">{SCRIPT_LABELS[k.script]}</p>
          <p className="text-4xl font-bold tracking-wide">{k.romaji}</p>
          <div className="mt-2">
            <SpeakButton text={k.kana} />
          </div>
        </div>
      </div>

      {note && <p className="mt-4 rounded-lg bg-sunken px-3 py-2 text-sm">{note}</p>}

      <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${LEVEL_CELL[level]}`}>
        <p className="font-semibold">{LEVEL_LABEL[level]}</p>
        <p className="mt-0.5 text-muted">
          {stat
            ? `Đúng ngay lần đầu ${stat.right} lần, sai ${stat.wrong} lần, chuỗi đúng ${stat.streak}/${MASTERED_STREAK}.`
            : `Đúng ngay lần đầu ${MASTERED_STREAK} lần liên tiếp để thuộc chữ này.`}
        </p>
      </div>

      <h3 className="mt-5 mb-2 text-sm font-semibold text-muted">{other.script === 'katakana' ? 'Katakana' : 'Hiragana'} tương ứng</h3>
      <div className="flex gap-2">
        <MiniChar
          k={other}
          onPick={(c) => {
            speak(c.kana)
            onPick(c)
          }}
        />
      </div>

      {similar.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold text-muted">Dễ nhầm với</h3>
          <div className="flex flex-wrap gap-2">
            {similar.map((c) => (
              <MiniChar
                key={c.id}
                k={c}
                onPick={(x) => {
                  speak(x.kana)
                  onPick(x)
                }}
              />
            ))}
          </div>
        </>
      )}
    </article>
  )
}

import { toKatakana, toRomaji } from 'wanakana'
import type { KanaChar, KanaGroup, KanaScript } from '../types'

/** Bảng hiragana theo hàng; katakana và romaji được sinh tự động. */
const HIRAGANA: Record<KanaGroup, string[]> = {
  basic: [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん',
  ],
  dakuten: [
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
  ],
  yoon: [
    'きゃ', 'きゅ', 'きょ', 'しゃ', 'しゅ', 'しょ',
    'ちゃ', 'ちゅ', 'ちょ', 'にゃ', 'にゅ', 'にょ',
    'ひゃ', 'ひゅ', 'ひょ', 'みゃ', 'みゅ', 'みょ',
    'りゃ', 'りゅ', 'りょ', 'ぎゃ', 'ぎゅ', 'ぎょ',
    'じゃ', 'じゅ', 'じょ', 'びゃ', 'びゅ', 'びょ',
    'ぴゃ', 'ぴゅ', 'ぴょ',
  ],
}

export const KANA_GROUP_LABELS: Record<KanaGroup, string> = {
  basic: 'Âm cơ bản',
  dakuten: 'Âm đục',
  yoon: 'Âm ghép',
}

function build(script: KanaScript): KanaChar[] {
  return (Object.keys(HIRAGANA) as KanaGroup[]).flatMap((group) =>
    HIRAGANA[group].map((hira) => ({
      kana: script === 'hiragana' ? hira : toKatakana(hira),
      romaji: toRomaji(hira),
      script,
      group,
    })),
  )
}

export const KANA: KanaChar[] = [...build('hiragana'), ...build('katakana')]

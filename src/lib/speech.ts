export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'ja-JP' && /google|natural|online/i.test(v.name)) ??
    voices.find((v) => v.lang === 'ja-JP') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ja'))
  )
}

/**
 * Trả về `true` nếu đã biết chắc có giọng tiếng Nhật, `false` nếu chắc chắn không có,
 * `null` nếu trình duyệt chưa nạp xong danh sách giọng.
 */
export function hasJapaneseVoice(): boolean | null {
  if (!speechSupported) return false
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  return japaneseVoice() !== undefined
}

export function speak(text: string, rate = 0.9): void {
  if (!speechSupported) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = rate
  const voice = japaneseVoice()
  if (voice) u.voice = voice
  synth.speak(u)
}

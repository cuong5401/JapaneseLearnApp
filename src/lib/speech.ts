import { useSyncExternalStore } from 'react'

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

/** Văn bản dùng để đọc phát âm một từ: ưu tiên cách đọc, thiếu thì đọc theo chữ. */
export const speechText = (item: { reading?: string; word: string }) => item.reading || item.word

/*
 * Trạng thái giọng tiếng Nhật cho React. Trình duyệt nạp danh sách giọng không đồng bộ
 * (sự kiện voiceschanged); sau 2,5 giây vẫn chưa có thì coi như máy không có giọng.
 */
type VoiceState = boolean | null
const voiceListeners = new Set<() => void>()
let voiceTimedOut = false

if (speechSupported) {
  const notify = () => voiceListeners.forEach((l) => l())
  window.speechSynthesis.addEventListener?.('voiceschanged', notify)
  // Một số trình duyệt chỉ bắt đầu nạp giọng khi được hỏi lần đầu.
  window.speechSynthesis.getVoices()
  setTimeout(() => {
    voiceTimedOut = true
    notify()
  }, 2500)
}

function voiceSnapshot(): VoiceState {
  const v = hasJapaneseVoice()
  return v === null && voiceTimedOut ? false : v
}

/** `true` có giọng ja-JP, `false` không có, `null` đang kiểm tra. */
export function useJapaneseVoice(): VoiceState {
  return useSyncExternalStore(
    (l) => {
      voiceListeners.add(l)
      return () => {
        voiceListeners.delete(l)
      }
    },
    voiceSnapshot,
    () => null,
  )
}

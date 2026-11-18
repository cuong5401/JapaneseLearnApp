import { useState, type MouseEvent } from 'react'
import { hasJapaneseVoice, speak, speechSupported } from '../lib/speech'
import { t } from '../i18n'

interface Props {
  text: string
  label?: string
  size?: 'sm' | 'md'
}

export function SpeakButton({ text, label = t('speakButton.nghePhatAm'), size = 'md' }: Props) {
  const [note, setNote] = useState<string | null>(null)

  if (!speechSupported) return null

  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    speak(text)
    if (hasJapaneseVoice() === false) {
      setNote(t('speakButton.mayChuaCoGiong'))
    }
  }

  const dims = size === 'sm' ? 'size-9 pointer-coarse:size-11' : 'size-11'

  return (
    <span className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${text}`}
        title={label}
        className={`${dims} grid place-items-center rounded-full border border-line bg-surface text-ai transition-colors hover:bg-ai-soft active:scale-95`}
      >
        <svg viewBox="0 0 24 24" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      </button>
      {note && <span className="mt-2 max-w-60 text-center text-xs text-muted">{note}</span>}
    </span>
  )
}

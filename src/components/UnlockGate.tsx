import { motion, useAnimationControls } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { isUnlocked, tryUnlock } from '../lib/unlock'

const LENGTH = 4

/**
 * Màn nhập mã 4 số lần đầu mở web trên một máy (chỉ khi build có VITE_UNLOCK_CODE).
 * Nhập đủ 4 số thì tự kiểm tra; sai thì lắc nhẹ và xóa để nhập lại.
 */
export function UnlockGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(isUnlocked)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const shake = useAnimationControls()

  if (open) return <>{children}</>

  const onChange = async (raw: string) => {
    if (checking) return
    const next = raw.replace(/\D/g, '').slice(0, LENGTH)
    setCode(next)
    setError(false)
    if (next.length < LENGTH) return
    setChecking(true)
    const ok = await tryUnlock(next)
    setChecking(false)
    if (ok) {
      setOpen(true)
      return
    }
    setError(true)
    await shake.start({ x: [0, -12, 12, -8, 8, -4, 4, 0], transition: { duration: 0.4 } })
    setCode('')
    inputRef.current?.focus()
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 py-10 text-ink">
      <div className="w-full max-w-xs text-center">
        <span lang="ja" aria-hidden className="mx-auto grid size-16 place-items-center rounded-[4px] bg-ai font-jp text-4xl text-on-ai">
          言
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Kotonoha</h1>
        <p className="mt-1 text-muted">Nhập mã 4 số để mở</p>

        {/* Một ô nhập ẩn phủ lên 4 ô hiển thị: bàn phím số trên điện thoại, dán được, tự điền mã. */}
        <motion.label animate={shake} className="group relative mt-8 block cursor-text">
          <span className="sr-only">Mã mở khóa 4 số</span>
          <input
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            aria-invalid={error}
            aria-describedby="unlock-msg"
            className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
          />
          <span className="grid grid-cols-4 gap-3" aria-hidden>
            {Array.from({ length: LENGTH }, (_, i) => {
              const filled = i < code.length
              const current = i === code.length
              return (
                <span
                  key={i}
                  className={`relative grid aspect-square place-items-center rounded-[3px] border-2 bg-surface text-3xl font-bold transition-colors ${
                    error ? 'border-beni bg-beni-soft' : current ? 'border-cell-line group-focus-within:border-ai' : 'border-cell-line'
                  }`}
                >
                  {/* Đường kẻ ô tập viết */}
                  <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-cell-guide" />
                  <span className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-cell-guide" />
                  {filled && <span className="relative size-3.5 rounded-full bg-ink" />}
                </span>
              )
            })}
          </span>
        </motion.label>

        <p id="unlock-msg" role="status" className={`mt-4 h-5 text-sm ${error ? 'font-medium text-beni' : 'text-muted'}`}>
          {error ? 'Mã chưa đúng, thử lại.' : checking ? 'Đang kiểm tra…' : 'Chỉ hỏi một lần trên mỗi máy.'}
        </p>
      </div>
    </main>
  )
}

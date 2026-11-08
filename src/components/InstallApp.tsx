import { useState } from 'react'
import { promptInstall, useInstallState } from '../lib/install'

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline size-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Chia sẻ">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  )
}

/**
 * Cài app lên màn hình chính.
 *  - `compact`: một nút gọn ở cuối sidebar (ẩn hẳn nếu trình duyệt không hỗ trợ).
 *  - mặc định: khối có giải thích, dùng ở trang Tiến độ; luôn hiện trạng thái.
 */
export function InstallApp({ compact = false }: { compact?: boolean }) {
  const state = useInstallState()
  const [iosOpen, setIosOpen] = useState(false)

  if (compact) {
    if (state === 'available')
      return (
        <button
          type="button"
          onClick={() => promptInstall()}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ai transition-colors hover:bg-ai-soft"
        >
          <DownloadIcon />
          Cài app
        </button>
      )
    return null
  }

  return (
    <div>
      {state === 'installed' && <p className="text-sm text-muted">Bạn đang dùng Kotonoha dạng app đã cài.</p>}
      {state === 'available' && (
        <>
          <p className="text-sm text-muted">Cài lên màn hình chính để mở nhanh như app, không có thanh địa chỉ, học được cả khi mất mạng với các bài đã mở.</p>
          <button
            type="button"
            onClick={() => promptInstall()}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90"
          >
            <DownloadIcon />
            Cài app
          </button>
        </>
      )}
      {state === 'ios' && (
        <>
          <p className="text-sm text-muted">Trên iPhone/iPad, cài bằng Safari:</p>
          <button
            type="button"
            aria-expanded={iosOpen}
            onClick={() => setIosOpen((v) => !v)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90"
          >
            <DownloadIcon />
            Cách cài app
          </button>
          {iosOpen && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              <li>
                Bấm nút Chia sẻ <ShareIcon /> ở thanh dưới của Safari.
              </li>
              <li>Chọn “Thêm vào MH chính” (Add to Home Screen).</li>
              <li>Bấm “Thêm”. Biểu tượng 言 Kotonoha sẽ xuất hiện trên màn hình chính.</li>
            </ol>
          )}
        </>
      )}
      {state === 'unsupported' && (
        <p className="text-sm text-muted">
          Trình duyệt này chưa hỗ trợ cài app. Dùng Chrome hoặc Edge (máy tính, Android), hoặc Safari trên iPhone. Nếu vừa mở trang, hãy đợi vài giây
          rồi tải lại.
        </p>
      )}
    </div>
  )
}

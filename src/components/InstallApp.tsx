import { useState } from 'react'
import { promptInstall, useInstallState } from '../lib/install'
import { t } from '../i18n'

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline size-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={t('installApp.chiaSe')}>
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
          <DownloadIcon />{t('common.caiApp')}</button>
      )
    return null
  }

  return (
    <div>
      {state === 'installed' && <p className="text-sm text-muted">{t('installApp.banDangDungKotonoha')}</p>}
      {state === 'available' && (
        <>
          <p className="text-sm text-muted">{t('installApp.caiLenManHinh')}</p>
          <button
            type="button"
            onClick={() => promptInstall()}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90"
          >
            <DownloadIcon />{t('common.caiApp')}</button>
        </>
      )}
      {state === 'ios' && (
        <>
          <p className="text-sm text-muted">{t('installApp.trenIphoneIpadCai')}</p>
          <button
            type="button"
            aria-expanded={iosOpen}
            onClick={() => setIosOpen((v) => !v)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90"
          >
            <DownloadIcon />{t('installApp.cachCaiApp')}</button>
          {iosOpen && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              <li>{t('installApp.bamNutChiaSe')}<ShareIcon />{t('installApp.oThanhDuoiCua')}</li>
              <li>{t('installApp.chonThemVaoMh')}</li>
              <li>{t('installApp.bamThemBieuTuong')}</li>
            </ol>
          )}
        </>
      )}
      {state === 'unsupported' && (
        <p className="text-sm text-muted">{t('installApp.trinhDuyetNayChua')}</p>
      )}
    </div>
  )
}

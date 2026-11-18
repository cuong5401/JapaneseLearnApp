import { readingsCredit } from '../lib/readings'
import { strokeCredit } from '../lib/strokes'
import { t } from '../i18n'

const LINK = 'font-medium text-ai hover:underline'

/** Giới thiệu + nguồn dữ liệu bên ngoài (giấy phép bắt buộc ghi nguồn). Dùng ở Cá nhân và Cài đặt. */
export function AboutSources({ id = 'about-title' }: { id?: string }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-surface p-5 sm:p-6" data-about>
      <h2 id={id} className="text-lg font-bold">{t('aboutSources.gioiThieu')}</h2>
      <p className="mt-1 text-sm text-muted">{t('aboutSources.kotonohaWebHocTieng')}</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        <li>
          {strokeCredit()} 3.0 –{' '}
          <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className={LINK}>
            kanjivg.tagaini.net
          </a>
          {t('common.listSep')}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer" className={LINK}>{t('aboutSources.giayPhep')}</a>
        </li>
        <li>
          {readingsCredit()} –{' '}
          <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noreferrer" className={LINK}>
            KANJIDIC Project
          </a>
          {t('common.listSep')}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={LINK}>{t('aboutSources.giayPhep')}</a>
        </li>
        <li>{t('aboutSources.cauViDu')}{' '}
          <a href="https://tatoeba.org" target="_blank" rel="noreferrer" className={LINK}>
            Tatoeba
          </a>{' '}
          (CC BY 2.0 FR)
        </li>
        <li>{t('aboutSources.cachDemTroSo')}</li>
        <li>{t('aboutSources.fontTrongPhieuLuyen')}</li>
        <li>{t('aboutSources.boThuCuaChu')}</li>
        <li>{t('aboutSources.nhanDangChuViet')}</li>
      </ul>
    </section>
  )
}

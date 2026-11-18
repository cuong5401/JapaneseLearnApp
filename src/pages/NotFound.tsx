import { ButtonLink } from '../components/Pressable'
import { GridCell } from '../components/GridCell'
import { t } from '../i18n'

export function NotFound() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <GridCell className="size-28 text-muted">迷</GridCell>
      <h1 className="mt-6 text-2xl font-bold">{t('notFound.khongTimThayTrang')}</h1>
      <p className="mt-2 text-muted">{t('notFound.duongDanCoThe')}</p>
      <ButtonLink to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai">{t('notFound.veTrangChu')}</ButtonLink>
    </div>
  )
}

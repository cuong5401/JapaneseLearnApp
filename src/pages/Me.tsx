import { Link } from 'react-router-dom'
import { AboutSources } from '../components/AboutSources'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { InstallApp } from '../components/InstallApp'
import { ThemeIcon } from '../components/Layout'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { isCurrentId } from '../data'
import { useCards, useDueIds } from '../hooks/useProgress'
import { THEME_LABEL, useTheme, type ThemeChoice } from '../hooks/useTheme'
import { isMastered } from '../lib/srs'

const BOX = 'rounded-2xl border border-line bg-surface p-5'
const ROW_LINK = '-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-sunken'

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="ml-auto size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function ProgressSummary() {
  const cards = useCards()
  const due = useDueIds().length
  const all = Object.values(cards).filter((c) => isCurrentId(c.id))
  const totals = [
    { label: 'Đã học', value: all.length },
    { label: 'Đã thuộc', value: all.filter(isMastered).length },
    { label: 'Cần ôn hôm nay', value: due },
  ]
  return (
    <section aria-labelledby="me-progress" className={BOX}>
      <h2 id="me-progress" className="text-lg font-bold">
        Tiến độ
      </h2>
      <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl bg-sunken/60">
        {totals.map((t) => (
          <div key={t.label} className="flex flex-col-reverse px-2 py-3 text-center">
            <dt className="mt-1 text-xs text-muted">{t.label}</dt>
            <dd className="text-2xl font-bold">
              <AnimatedNumber value={t.value} />
            </dd>
          </div>
        ))}
      </dl>
      <Link to="/progress" className={`${ROW_LINK} mt-2 font-medium`}>
        Xem tiến độ chi tiết, xuất / nhập tiến độ
        <Chevron />
      </Link>
    </section>
  )
}

const THEMES: ThemeChoice[] = ['system', 'light', 'dark']

/** /me: Tiến độ, Cài đặt, Hỏi AI, Giao diện, Cài app, Giới thiệu / nguồn dữ liệu. */
export function Me() {
  const { choice, set } = useTheme()
  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader title="Cá nhân" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProgressSummary />

        <section aria-labelledby="me-settings" className={BOX}>
          <h2 id="me-settings" className="text-lg font-bold">
            Cài đặt
          </h2>
          <ul className="mt-2">
            <li>
              <Link to="/settings" className={ROW_LINK}>
                <span>
                  <span className="block font-medium">Cài đặt chung</span>
                  <span className="block text-sm text-muted">AI (key, model), trình độ, ôn tập FSRS</span>
                </span>
                <Chevron />
              </Link>
            </li>
            <li>
              <Link to="/ai" className={ROW_LINK}>
                <span>
                  <span className="block font-medium">Hỏi AI (trang đầy đủ)</span>
                  <span className="block text-sm text-muted">Lịch sử chat, tra từ, ngữ pháp, hội thoại, sửa câu</span>
                </span>
                <Chevron />
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="me-theme" className={BOX} data-theme-section>
          <h2 id="me-theme" className="text-lg font-bold">
            Giao diện
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-sunken text-muted">
              <ThemeIcon choice={choice} />
            </span>
            <Segmented label="Giao diện" value={choice} onChange={set} options={THEMES.map((t) => ({ value: t, label: THEME_LABEL[t] }))} />
          </div>
        </section>

        <section aria-labelledby="me-install" className={BOX}>
          <h2 id="me-install" className="text-lg font-bold">
            Cài app
          </h2>
          <div className="mt-1">
            <InstallApp />
          </div>
        </section>

        <div className="lg:col-span-2">
          <AboutSources id="me-about" />
        </div>
      </div>
    </div>
  )
}

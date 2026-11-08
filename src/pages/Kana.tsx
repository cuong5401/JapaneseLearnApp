import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Pressable'
import { Segmented } from '../components/Segmented'
import { KanaChart, LevelLegend } from '../components/kana/KanaChart'
import { KanaDetail } from '../components/kana/KanaDetail'
import { KanaSession } from '../components/kana/KanaSession'
import { KANA_ROWS, SCRIPT_LABELS, kanaOf, rowsOf, type KanaRow } from '../data/kana'
import { DESKTOP, useMediaQuery } from '../hooks/useMediaQuery'
import { kanaLevel, useKanaStats, weakest } from '../lib/kanaProgress'
import { shuffleWith } from '../lib/kanaSession'
import { speak } from '../lib/speech'
import { readJSON, writeJSON } from '../lib/storage'
import type { KanaChar, KanaScript } from '../types'

/* Lựa chọn trên bảng (nhớ giữa các lần mở): bảng chữ đang xem và các hàng đã chọn. */
interface ChartState {
  script: KanaScript
  rows: string[]
}

const ROW_IDS = new Set(KANA_ROWS.map((r) => r.id))

function loadChart(): ChartState {
  const s = readJSON<Partial<ChartState>>('kana-chart', {})
  return {
    script: s.script === 'katakana' ? 'katakana' : 'hiragana',
    rows: Array.isArray(s.rows) ? s.rows.filter((r) => ROW_IDS.has(r)) : ['h-basic-a', 'k-basic-a'],
  }
}

const charsOfRows = (rows: KanaRow[]) => rows.flatMap((r) => r.cells.filter((c): c is KanaChar => c !== null))

interface Practice {
  title: string
  chars: KanaChar[]
}

export function Kana() {
  const [chart, setChartState] = useState(loadChart)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const stats = useKanaStats()
  const desktop = useMediaQuery(DESKTOP)
  const [picked, setPicked] = useState<KanaChar | null>(null)
  const [practice, setPractice] = useState<Practice | null>(null)

  const setChart = (next: ChartState) => {
    setChartState(next)
    writeJSON('kana-chart', next)
  }

  const { script } = chart
  const selected = useMemo(() => new Set(chart.rows), [chart.rows])
  const scriptRows = rowsOf(script)
  const selectedChars = charsOfRows(scriptRows.filter((r) => selected.has(r.id)))
  const all = kanaOf(script)
  const mastered = all.filter((k) => kanaLevel(stats[k.id]) === 'mastered').length
  const weak = weakest(all, stats, 20)
  const learned = all.filter((k) => stats[k.id])
  const count = selectedChars.length

  // Phiên luyện gắn với ?luyen=1 để nút Back của điện thoại quay về bảng chữ.
  const practicing = practice !== null && params.has('luyen')

  const startPractice = (p: Practice) => {
    if (p.chars.length === 0) return
    setPractice(p)
    setParams({ luyen: '1' })
    window.scrollTo(0, 0)
  }
  const exitPractice = useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1)
    else setParams({}, { replace: true })
    setPractice(null)
  }, [navigate, setParams])

  const toggleRow = (row: KanaRow) => {
    const rows = selected.has(row.id) ? chart.rows.filter((r) => r !== row.id) : [...chart.rows, row.id]
    setChart({ ...chart, rows })
  }
  const selectAll = (on: boolean) => {
    const other = chart.rows.filter((r) => !r.startsWith(script === 'hiragana' ? 'h-' : 'k-'))
    setChart({ ...chart, rows: on ? [...other, ...scriptRows.map((r) => r.id)] : other })
  }

  // Chữ đang xem chi tiết: desktop luôn có (mặc định あ/ア), điện thoại mở bottom sheet khi chạm.
  const detail = picked && picked.script === script ? picked : desktop ? all[0] : null
  const pick = useCallback((k: KanaChar) => {
    speak(k.kana)
    setPicked(k)
  }, [])
  const pickFromDetail = useCallback(
    (k: KanaChar) => {
      if (k.script !== chart.script) {
        setChartState((c) => {
          const next = { ...c, script: k.script }
          writeJSON('kana-chart', next)
          return next
        })
      }
      setPicked(k)
    },
    [chart.script],
  )

  if (practicing && practice) {
    return <KanaSession key={practice.title + practice.chars.length} chars={practice.chars} title={practice.title} onExit={exitPractice} />
  }

  return (
    <div>
      <PageHeader title="Luyện kana" back={{ to: '/', label: 'Trang chủ' }}>
        <p className="text-sm text-muted" data-kana-mastered>
          Đã thuộc{' '}
          <strong className="text-lg text-ink tabular-nums">
            {mastered}/{all.length}
          </strong>{' '}
          chữ {SCRIPT_LABELS[script]}
        </p>
      </PageHeader>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented<KanaScript>
              label="Bảng chữ"
              value={script}
              onChange={(s) => setChart({ ...chart, script: s })}
              options={[
                { value: 'hiragana', label: 'Hiragana あ' },
                { value: 'katakana', label: 'Katakana ア' },
              ]}
            />
            <LevelLegend />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => startPractice({ title: `Chữ yếu (${SCRIPT_LABELS[script]})`, chars: weak })}
              disabled={weak.length === 0}
              title={weak.length === 0 ? 'Chưa có chữ nào trả lời sai' : undefined}
              className="min-h-12 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:border-ai disabled:opacity-45"
            >
              Luyện chữ yếu{weak.length > 0 && ` (${weak.length})`}
            </Button>
            <Button
              onClick={() =>
                startPractice({ title: `Ôn ngẫu nhiên (${SCRIPT_LABELS[script]})`, chars: shuffleWith(learned, Math.random).slice(0, 20) })
              }
              disabled={learned.length === 0}
              title={learned.length === 0 ? 'Chưa luyện chữ nào' : undefined}
              className="min-h-12 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:border-ai disabled:opacity-45"
            >
              Ôn ngẫu nhiên 20 chữ đã học
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted">Chọn hàng muốn luyện bằng ô đầu hàng. Chạm vào chữ để nghe và xem chi tiết.</p>
          <div className="mt-1 mb-3 flex items-center gap-1 text-sm">
            <span className="mr-auto tabular-nums text-muted">Đã chọn {count} chữ</span>
            <button type="button" onClick={() => selectAll(true)} className="min-h-11 rounded-lg px-3 font-medium text-ai hover:bg-ai-soft">
              Chọn tất cả
            </button>
            <button type="button" onClick={() => selectAll(false)} className="min-h-11 rounded-lg px-3 font-medium text-muted hover:bg-sunken hover:text-ink">
              Bỏ chọn
            </button>
          </div>

          <KanaChart script={script} stats={stats} selectedRows={selected} onToggleRow={toggleRow} active={detail ?? undefined} onPick={pick} />

          {/* Nút luyện cố định ở đáy (trên thanh điều hướng điện thoại). */}
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 md:bottom-4">
            <Button
              onClick={() => startPractice({ title: `Luyện ${count} chữ ${SCRIPT_LABELS[script]}`, chars: selectedChars })}
              disabled={count === 0}
              className="min-h-14 w-full rounded-xl bg-ai text-lg font-semibold text-on-ai shadow-lg shadow-ink/15 hover:opacity-95 disabled:bg-sunken disabled:text-muted disabled:shadow-none"
            >
              {count === 0 ? 'Chọn ít nhất một hàng để luyện' : `Luyện ${count} chữ đã chọn`}
            </Button>
          </div>
        </div>

        {desktop && detail && (
          <aside
            className="sticky top-10 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-5"
            aria-label="Chi tiết chữ kana"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={detail.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <KanaDetail k={detail} stat={stats[detail.id]} onPick={pickFromDetail} />
              </motion.div>
            </AnimatePresence>
          </aside>
        )}
      </div>

      {!desktop && (
        <BottomSheet open={Boolean(detail)} onClose={() => setPicked(null)} label={`Chi tiết chữ ${detail?.kana ?? ''}`}>
          {detail && <KanaDetail k={detail} stat={stats[detail.id]} onPick={pickFromDetail} />}
        </BottomSheet>
      )}
    </div>
  )
}

import { useState } from 'react'
import { SrsSettingsSection } from '../components/SrsSettingsSection'
import { STROKE_CREDIT } from '../lib/strokes'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { PROVIDERS, loadProvider, providerInfo } from '../lib/ai/providers'
import { aiSettings, useAiSettings } from '../lib/ai/settings'
import { AiError, aiErrorText } from '../lib/ai/types'
import { LEVELS } from '../types'

type Check = { tone: 'ok' | 'error' | 'busy'; text: string } | null

function AiSection() {
  const s = useAiSettings()
  const realProvider = s.provider === 'mock' ? 'gemini' : s.provider
  const info = providerInfo(realProvider)!
  // Luôn xét key của nhà cung cấp đang hiển thị (provider mock khi test không cần key).
  const hasKey = aiSettings.hasKeyFor(realProvider)
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [check, setCheck] = useState<Check>(null)
  const model = s.models[realProvider]
  const custom = !info.models.some((m) => m.id === model)
  const [customOpen, setCustomOpen] = useState(custom)

  const saveKey = () => {
    if (!key.trim()) return
    aiSettings.setKey(realProvider, key)
    setKey('')
    setShow(false)
    setCheck({ tone: 'ok', text: 'Đã lưu key trên máy này.' })
  }

  const test = async () => {
    setCheck({ tone: 'busy', text: 'Đang kiểm tra…' })
    try {
      const ai = await loadProvider(s.provider)
      let got = ''
      for await (const t of ai.stream({
        apiKey: aiSettings.key(),
        model: aiSettings.model(),
        system: 'Trả lời đúng một từ.',
        messages: [{ role: 'user', text: 'Nói "OK".' }],
        signal: AbortSignal.timeout(30_000),
      })) {
        got += t
        if (got.length > 40) break
      }
      setCheck({ tone: 'ok', text: `Kết nối được với ${info.name} (${aiSettings.model()}).` })
    } catch (e) {
      setCheck({ tone: 'error', text: aiErrorText(e instanceof AiError ? e : new AiError('unknown')) })
    }
  }

  return (
    <section id="ai" aria-labelledby="ai-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="ai-title" className="text-lg font-bold">
        AI (Hỏi AI)
      </h2>
      <p className="mt-1 text-sm text-muted">
        Trình duyệt gọi thẳng AI bằng API key của bạn. Key <strong>chỉ lưu trên máy này</strong> (localStorage), không có trong file Xuất tiến độ, không gửi đi đâu
        ngoài nhà cung cấp AI. Ai dùng được trình duyệt này thì cũng đọc được key, nên đừng nhập key trên máy dùng chung.
      </p>

      <p className="mt-5 mb-1.5 text-sm font-medium">Nhà cung cấp</p>
      <Segmented
        label="Nhà cung cấp AI"
        value={realProvider}
        onChange={(p) => {
          aiSettings.setProvider(p)
          setCheck(null)
          setCustomOpen(!providerInfo(p)!.models.some((m) => m.id === aiSettings.getSnapshot().models[p]))
        }}
        options={PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
      />

      <div className="mt-5">
        <label htmlFor="ai-key" className="text-sm font-medium">
          API key {info.name}
        </label>
        <p className="text-xs text-muted">
          {info.keyHint}{' '}
          <a href={info.keyUrl} target="_blank" rel="noreferrer noopener" className="font-medium text-ai underline">
            Mở trang lấy key
          </a>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            id="ai-key"
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveKey()}
            autoComplete="off"
            spellCheck={false}
            placeholder={hasKey ? 'Đã có key, nhập để thay' : 'Dán key vào đây'}
            className="h-11 min-w-0 flex-1 basis-56 rounded-lg border-2 border-line bg-paper px-3 font-mono text-sm outline-none focus:border-ai pointer-coarse:text-base"
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-sunken">
            {show ? 'Ẩn' : 'Hiện'}
          </button>
          <button type="button" onClick={saveKey} disabled={!key.trim()} className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">
            Lưu key
          </button>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className={hasKey ? 'text-matsu' : 'text-muted'} data-ai-key-state>
            {hasKey ? 'Đã có key trên máy này.' : 'Chưa có key.'}
          </span>
          {hasKey && (
            <button
              type="button"
              onClick={() => {
                aiSettings.removeKey(realProvider)
                setCheck(null)
              }}
              className="min-h-9 rounded-lg border border-beni px-3 text-sm text-beni hover:bg-beni-soft"
            >
              Xóa key
            </button>
          )}
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="ai-model" className="text-sm font-medium">
          Model
        </label>
        <select
          id="ai-model"
          value={customOpen ? '__custom' : model}
          onChange={(e) => {
            if (e.target.value === '__custom') setCustomOpen(true)
            else {
              setCustomOpen(false)
              aiSettings.setModel(realProvider, e.target.value)
            }
          }}
          className="mt-1.5 block h-11 w-full max-w-md rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        >
          {info.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value="__custom">Model khác…</option>
        </select>
        {customOpen && (
          <input
            aria-label="Tên model"
            defaultValue={custom ? model : ''}
            placeholder={info.defaultModel}
            onBlur={(e) => aiSettings.setModel(realProvider, e.target.value)}
            className="mt-2 h-11 w-full max-w-md rounded-lg border-2 border-line bg-paper px-3 font-mono text-sm outline-none focus:border-ai pointer-coarse:text-base"
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={test} disabled={!hasKey || check?.tone === 'busy'} className="min-h-11 rounded-lg border-2 border-ai px-4 font-semibold text-ai hover:bg-ai-soft disabled:opacity-40">
          Kiểm tra kết nối
        </button>
        {check && (
          <span role="status" className={`text-sm font-medium ${check.tone === 'ok' ? 'text-matsu' : check.tone === 'error' ? 'text-beni' : 'text-muted'}`}>
            {check.text}
          </span>
        )}
      </div>
    </section>
  )
}

/** /settings: AI (nhà cung cấp, key, model), trình độ cho câu trả lời. */
export function Settings() {
  const s = useAiSettings()
  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <PageHeader title="Cài đặt" />
      <AiSection />
      <section aria-labelledby="level-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="level-title" className="text-lg font-bold">
          Trình độ
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted">AI chọn từ vựng, ví dụ và độ sâu giải thích theo trình độ này.</p>
        <Segmented label="Trình độ JLPT" value={s.level} onChange={aiSettings.setLevel} options={LEVELS.map((l) => ({ value: l, label: l }))} />
      </section>
      <SrsSettingsSection />
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold">Tiến độ và sao lưu</h2>
        <p className="mt-1 text-sm text-muted">Xem tiến độ, xuất / nhập tiến độ sang máy khác (không kèm API key).</p>
        <Link to="/progress" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-medium hover:bg-sunken">
          Mở Tiến độ
        </Link>
      </section>
      <section aria-labelledby="about-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6" data-about>
        <h2 id="about-title" className="text-lg font-bold">
          Giới thiệu
        </h2>
        <p className="mt-1 text-sm text-muted">Kotonoha – web học tiếng Nhật dùng cá nhân. Nguồn dữ liệu bên ngoài:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            {STROKE_CREDIT} 3.0 –{' '}
            <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className="font-medium text-ai hover:underline">
              kanjivg.tagaini.net
            </a>
            ,{' '}
            <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer" className="font-medium text-ai hover:underline">
              giấy phép
            </a>
          </li>
          <li>Bộ thủ của chữ: Unicode Unihan (© Unicode, Inc.)</li>
          <li>Nhận dạng chữ viết tay: KanjiCanvas (Dominik Klein, MIT)</li>
        </ul>
      </section>
    </div>
  )
}

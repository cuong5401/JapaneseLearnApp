import { useState } from 'react'
import { SrsSettingsSection } from '../components/SrsSettingsSection'
import { Link } from 'react-router-dom'
import { AboutSources } from '../components/AboutSources'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { PROVIDERS, loadProvider, providerInfo } from '../lib/ai/providers'
import { aiSettings, useAiSettings } from '../lib/ai/settings'
import { aiContent } from '../lib/ai/content'
import { AiError, aiErrorText } from '../lib/ai/types'
import { LEVELS } from '../types'
import { LOCALES, LOCALE_NAMES, setLocale, t as tr, useLocale } from '../i18n'

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
    setCheck({ tone: 'ok', text: tr('settings.daLuuKeyTren') })
  }

  const test = async () => {
    setCheck({ tone: 'busy', text: tr('settings.dangKiemTra') })
    try {
      const ai = await loadProvider(s.provider)
      let got = ''
      for await (const t of ai.stream({
        apiKey: aiSettings.key(),
        model: aiSettings.model(),
        system: aiContent().ping.system,
        messages: [{ role: 'user', text: aiContent().ping.user }],
        signal: AbortSignal.timeout(30_000),
      })) {
        got += t
        if (got.length > 40) break
      }
      setCheck({ tone: 'ok', text: tr('settings.ketNoiDuocVoi', { name: info.name, model: aiSettings.model() }) })
    } catch (e) {
      setCheck({ tone: 'error', text: aiErrorText(e instanceof AiError ? e : new AiError('unknown')) })
    }
  }

  return (
    <section id="ai" aria-labelledby="ai-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="ai-title" className="text-lg font-bold">{tr('settings.aiHoiAi')}</h2>
      <p className="mt-1 text-sm text-muted">{tr('settings.trinhDuyetGoiThang')}<strong>{tr('settings.chiLuuTrenMay')}</strong>{tr('settings.localstorageKhongCoTrong')}</p>

      <p className="mt-5 mb-1.5 text-sm font-medium">{tr('settings.nhaCungCap')}</p>
      <Segmented
        label={tr('settings.nhaCungCapAi')}
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
          {tr('settings.apiKey', { name: info.name })}
        </label>
        <p className="text-xs text-muted">
          {info.keyHint}{' '}
          <a href={info.keyUrl} target="_blank" rel="noreferrer noopener" className="font-medium text-ai underline">{tr('settings.moTrangLayKey')}</a>
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
            placeholder={hasKey ? tr('settings.daCoKeyNhap') : tr('settings.danKeyVaoDay')}
            className="h-11 min-w-0 flex-1 basis-56 rounded-lg border-2 border-line bg-paper px-3 font-mono text-sm outline-none focus:border-ai pointer-coarse:text-base"
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-sunken">
            {show ? tr('settings.an') : tr('settings.hien')}
          </button>
          <button type="button" onClick={saveKey} disabled={!key.trim()} className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">{tr('settings.luuKey')}</button>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className={hasKey ? 'text-matsu' : 'text-muted'} data-ai-key-state>
            {hasKey ? tr('settings.daCoKeyTren') : tr('settings.chuaCoKey')}
          </span>
          {hasKey && (
            <button
              type="button"
              onClick={() => {
                aiSettings.removeKey(realProvider)
                setCheck(null)
              }}
              className="min-h-11 rounded-lg border border-beni px-3 text-sm text-beni hover:bg-beni-soft"
            >{tr('settings.xoaKey')}</button>
          )}
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="ai-model" className="text-sm font-medium">
          {tr('settings.model')}
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
          <option value="__custom">{tr('settings.modelKhac')}</option>
        </select>
        {customOpen && (
          <input
            aria-label={tr('settings.tenModel')}
            defaultValue={custom ? model : ''}
            placeholder={info.defaultModel}
            onBlur={(e) => aiSettings.setModel(realProvider, e.target.value)}
            className="mt-2 h-11 w-full max-w-md rounded-lg border-2 border-line bg-paper px-3 font-mono text-sm outline-none focus:border-ai pointer-coarse:text-base"
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={test} disabled={!hasKey || check?.tone === 'busy'} className="min-h-11 rounded-lg border-2 border-ai px-4 font-semibold text-ai hover:bg-ai-soft disabled:opacity-40">{tr('settings.kiemTraKetNoi')}</button>
        {check && (
          <span role="status" className={`text-sm font-medium ${check.tone === 'ok' ? 'text-matsu' : check.tone === 'error' ? 'text-beni' : 'text-muted'}`}>
            {check.text}
          </span>
        )}
      </div>
    </section>
  )
}

/** Ngôn ngữ giao diện: đổi là áp dụng ngay (không tải lại trang), lưu localStorage, có trong Xuất / Nhập tiến độ. */
function LanguageSection() {
  const locale = useLocale()
  return (
    <section aria-labelledby="lang-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6" data-language-section>
      <h2 id="lang-title" className="text-lg font-bold">{tr('settings.language')}</h2>
      <p className="mt-1 mb-3 text-sm text-muted">{tr('settings.languageHelp')}</p>
      <Segmented label={tr('settings.language')} value={locale} onChange={(l) => void setLocale(l)} options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))} />
    </section>
  )
}

/** /settings: AI (nhà cung cấp, key, model), trình độ cho câu trả lời. */
export function Settings() {
  const s = useAiSettings()
  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <PageHeader title={tr('settings.caiDat')} back={{ to: '/me', label: tr('common.caNhan') }} />
      <LanguageSection />
      <AiSection />
      <section aria-labelledby="level-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="level-title" className="text-lg font-bold">{tr('settings.trinhDo')}</h2>
        <p className="mt-1 mb-3 text-sm text-muted">{tr('settings.aiChonTuVung')}</p>
        <Segmented label={tr('settings.trinhDoJlpt')} value={s.level} onChange={aiSettings.setLevel} options={LEVELS.map((l) => ({ value: l, label: l }))} />
        <h3 id="explain-title" className="mt-6 font-semibold">{tr('settings.explainLang')}</h3>
        <p className="mt-1 mb-3 text-sm text-muted">{tr('settings.explainLangHelp')}</p>
        <Segmented
          label={tr('settings.explainLang')}
          value={s.explainLang}
          onChange={aiSettings.setExplainLang}
          options={[
            { value: 'vi', label: tr('settings.explainVi') },
            { value: 'ja', label: tr('settings.explainJa') },
          ]}
        />
      </section>
      <SrsSettingsSection />
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold">{tr('settings.tienDoVaSao')}</h2>
        <p className="mt-1 text-sm text-muted">{tr('settings.xemTienDoXuat')}</p>
        <Link to="/progress" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-medium hover:bg-sunken">{tr('settings.moTienDo')}</Link>
      </section>
      <AboutSources />
    </div>
  )
}

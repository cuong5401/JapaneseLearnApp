#!/usr/bin/env node
/**
 * Rà soát UX toàn app trên bản build (base '/JapaneseLearnApp/'), không chạy trong CI (nặng, ~15 phút).
 *
 *   npm run build
 *   npx vite preview --port 4190 --strictPort      (cửa sổ khác)
 *   node scripts/ux-audit.mjs [--out dir] [--only learn,kanji-panel] [--widths 390,1280] [--themes light]
 *
 * Mỗi màn × độ rộng (390, 768, 1280, 1440) × giao diện (sáng, tối) ghi:
 *  console error / pageerror / request lỗi, tràn ngang, chữ bị cắt, vùng chạm < 44px (390), phần tử fixed che
 *  nội dung / che nhau, axe-core (WCAG 2 A/AA), CLS khi tải và khi thao tác chính, bàn phím (Tab, focus thấy được,
 *  Esc đóng sheet / panel – chỉ ở 1280 sáng). Kết quả: <out>/ux-audit.json + <out>/ux-audit.md.
 * PW_CHANNEL=chrome dùng Chrome đã cài (máy bật Smart App Control).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const ORIGIN = args.origin ?? 'http://localhost:4190'
const BASE = '/JapaneseLearnApp/'
const OUT = args.out ?? 'test-results/ux-audit'
const WIDTHS = (args.widths ?? '390,768,1280,1440').split(',').map(Number)
const THEMES = (args.themes ?? 'light,dark').split(',')
const ONLY = args.only ? new Set(args.only.split(',')) : null
const HEIGHT = { 390: 844, 768: 1024, 1280: 800, 1440: 900 }
const EXTERNAL = /fonts\.googleapis|fonts\.gstatic|mazii\.net|api\.tatoeba\.org|generativelanguage|anthropic/

/** Thẻ SRS mới để trang Ôn tập có thẻ, sổ tay mặc định có vài mục. */
const SEED_IDS = ['n5-e1ea452d', 'n5-78d438e2', 'n5-bcf28efa']
const card = (id) => ({ id, due: 0, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0, last_review: 0, learning_steps: 0 })

const settle = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForFunction(() => !document.querySelector('main [role="status"][aria-label^="Đang tải"]'), null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(400)
}

/** CLS từ lúc gọi tới giờ (PerformanceObserver đã cài trong init script). */
const clsSince = (page, mark) => page.evaluate((m) => (window.__cls ?? []).filter((e) => e.t >= m).reduce((s, e) => s + e.v, 0), mark)
const now = (page) => page.evaluate(() => performance.now())

/**
 * Các màn: path + thao tác dựng trạng thái (`setup`) + thao tác chính đo CLS (`act`) + phím Esc phải đóng gì (`esc`).
 */
const SCREENS = [
  { id: 'home', path: '' },
  { id: 'learn', path: 'learn' },
  { id: 'counters', path: 'learn/counters' },
  { id: 'counters-quiz', path: 'learn/counters?mode=quiz', setup: async (p) => p.locator('[data-option]').first().click() },
  { id: 'me', path: 'me' },
  { id: 'kana', path: 'kana' },
  { id: 'vocab-n5', path: 'vocab/n5' },
  { id: 'vocab-compounds', path: 'vocab/compounds' },
  { id: 'lesson-list', path: 'vocab/n5/1', act: async (p) => p.getByRole('radio', { name: /Flashcard/ }).first().click().catch(() => p.getByText('Flashcard').first().click()) },
  {
    id: 'flashcard-flipped',
    path: 'vocab/n5/1?tab=flashcards',
    act: async (p) => p.locator('[role="button"][aria-label*="Chạm để lật"]').first().click(),
  },
  {
    id: 'quiz-running',
    path: 'vocab/n5/1?tab=quiz',
    setup: async (p) => {
      await p.getByRole('button', { name: /Trắc nghiệm/ }).click()
      await p.locator('[data-option]').first().click()
    },
  },
  { id: 'word', path: 'word/n5-e1ea452d' },
  { id: 'kanji', path: 'kanji' },
  {
    id: 'kanji-panel',
    path: 'kanji?bai=1',
    act: async (p) => p.locator('[data-kanji-cell]').nth(1).click(),
    // Desktop: panel luôn giữ chỗ (chữ mặc định), Esc bỏ chữ đang chọn (?k=); điện thoại: sheet đóng.
    escUrl: /[?&]k=/,
  },
  { id: 'radicals', path: 'kanji?tab=radicals&bai=2' },
  { id: 'grammar', path: 'grammar' },
  { id: 'grammar-detail', path: 'grammar/n5/gn5-604df51c' },
  { id: 'terms', path: 'terms/it' },
  { id: 'terms-flashcards', path: 'terms/it/flashcards' },
  { id: 'review', path: 'review', act: async (p) => p.getByRole('button', { name: 'Lật thẻ' }).click() },
  { id: 'notebooks', path: 'notebooks' },
  { id: 'notebook-page', path: 'notebooks/default' },
  { id: 'writing-preview', path: 'writing?src=kanji&level=N5&bai=1' },
  { id: 'progress', path: 'progress' },
  { id: 'settings', path: 'settings' },
  { id: 'ai-page', path: 'ai' },
  {
    id: 'ai-dock-open',
    path: 'learn',
    act: async (p) => p.locator('[data-ai-tab]').click(),
    esc: '[data-ai-dock="open"]',
  },
  {
    id: 'search-open',
    path: 'learn',
    act: async (p) => p.keyboard.press('/'),
    esc: '[role="dialog"][aria-modal="true"]',
  },
  { id: 'global-detail', path: 'learn?xem=w:n5-e1ea452d', esc: '[role="dialog"][aria-label="Chi tiết"]' },
  { id: 'not-found', path: 'khong-co-trang-nay' },
]

/** Đo trong trang: tràn ngang, chữ bị cắt, vùng chạm nhỏ, fixed che nội dung. */
function inPage(checkTargets) {
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && !el.closest('[inert],[aria-hidden="true"]')
  }
  const name = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    const tag = el.tagName.toLowerCase()
    const cls = (el.getAttribute('class') || '').split(' ').filter(Boolean).slice(0, 3).join('.')
    return `${tag}${cls ? '.' + cls : ''} "${t}"`
  }
  const out = { overflowX: null, clipped: [], small: [], covered: [], fixedOverlap: [] }
  const sw = document.documentElement.scrollWidth
  if (sw > window.innerWidth) {
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => vis(el) && el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed')
      .slice(0, 5)
      .map(name)
    out.overflowX = { scrollWidth: sw, innerWidth: window.innerWidth, culprits: wide }
  }
  // Chữ bị cắt: phần tử có chữ trực tiếp, nội dung rộng hơn hộp và bị ẩn (overflow ≠ visible).
  for (const el of document.querySelectorAll('main *, header *, nav *, [role="dialog"] *')) {
    if (!vis(el) || el.closest('.sr-only')) continue
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own) continue
    const s = getComputedStyle(el)
    if (s.overflowX === 'visible' && s.overflow === 'visible') continue
    if (el.scrollWidth > el.clientWidth + 1 || (s.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 2 && s.webkitLineClamp === 'none' && s.overflowY !== 'auto' && s.overflowY !== 'scroll')) {
      out.clipped.push({ el: name(el), ellipsis: s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none', sw: el.scrollWidth, cw: el.clientWidth })
    }
  }
  if (checkTargets) {
    const SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="tab"], [role="checkbox"], [role="switch"]'
    for (const el of document.querySelectorAll(SEL)) {
      if (!vis(el) || el.disabled) continue
      // Link nằm giữa câu chữ (inline, cạnh chữ khác) được miễn theo WCAG 2.5.8.
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.closest('p, li, dd, td')?.textContent.trim().length ?? 0) > el.textContent.trim().length + 3) continue
      if (el.closest('.sr-only')) continue
      // "Stretched link": ::after phủ cả thẻ cha → vùng chạm là cả thẻ.
      const after = getComputedStyle(el, '::after')
      if (after.position === 'absolute' && after.content !== 'none') continue
      let r = el.getBoundingClientRect()
      // Ô chọn nằm trong <label>: vùng chạm là cả nhãn.
      const label = el.tagName === 'INPUT' ? el.closest('label') ?? (el.id && document.querySelector(`label[for="${el.id}"]`)) : null
      if (label) {
        const l = label.getBoundingClientRect()
        r = { width: Math.max(r.width, l.width), height: Math.max(r.height, l.height) }
      }
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.small.push({ el: name(el), w: Math.round(r.width), h: Math.round(r.height) })
    }
  }
  // Phần tử fixed / sticky đang hiện.
  const fixed = [...document.querySelectorAll('body *')].filter((el) => {
    const p = getComputedStyle(el).position
    return (p === 'fixed' || p === 'sticky') && vis(el) && !el.parentElement?.closest('[style*="fixed"]')
  })
  const fixedRoots = fixed.filter((el) => !fixed.some((o) => o !== el && o.contains(el)))
  // Nút / link trong main bị phần tử fixed khác đè (điểm giữa).
  for (const el of document.querySelectorAll('main a[href], main button, main input, main [role="button"]')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cy < 0 || cy > window.innerHeight || cx < 0 || cx > window.innerWidth) continue
    const hit = document.elementFromPoint(cx, cy)
    if (!hit || el.contains(hit) || hit.contains(el)) continue
    const cover = fixedRoots.find((f) => f.contains(hit) && !f.contains(el))
    // Lớp phủ có chủ đích (dialog, sheet, khung AI đang mở) và header dính không tính là che.
    if (
      cover &&
      !hit.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-ai-backdrop]') &&
      !cover.querySelector('[aria-modal="true"]') &&
      !cover.matches('header, [data-app-header]')
    )
      out.covered.push({ el: name(el), by: name(cover) })
  }
  // Các lớp fixed nhỏ (tab AI, toast, bottom nav) chồng lên nhau.
  // Khung trong suốt (pointer-events: none) thì lấy hộp của phần nhìn thấy bên trong.
  const box = (f) => {
    if (getComputedStyle(f).pointerEvents !== 'none') return f.getBoundingClientRect()
    const kids = [...f.querySelectorAll('*')].filter((k) => vis(k) && getComputedStyle(k).pointerEvents !== 'none' && k.parentElement && getComputedStyle(k.parentElement).pointerEvents === 'none')
    if (!kids.length) return null
    const rs = kids.map((k) => k.getBoundingClientRect())
    return { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) }
  }
  const small = fixedRoots
    .map((f) => ({ f, r: box(f) }))
    .filter(({ r }) => r && (r.right - r.left) * (r.bottom - r.top) < window.innerWidth * window.innerHeight * 0.5)
  for (let i = 0; i < small.length; i++)
    for (let j = i + 1; j < small.length; j++) {
      const a = small[i].r
      const b = small[j].r
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.fixedOverlap.push(`${name(small[i].f)} × ${name(small[j].f)}`)
    }
  // Tab AI đè lên nội dung main / thanh cuộn panel (desktop).
  const tab = document.querySelector('[data-ai-tab]')
  if (tab && vis(tab)) {
    const t = tab.getBoundingClientRect()
    const main = document.querySelector('main')
    const content = main ? [...main.querySelectorAll('*')].filter((e) => vis(e) && e.children.length === 0) : []
    const hits = content.filter((e) => {
      const r = e.getBoundingClientRect()
      return r.left < t.right && t.left < r.right && r.top < t.bottom && t.top < r.bottom
    })
    if (hits.length) out.covered.push(...hits.slice(0, 3).map((e) => ({ el: name(e), by: 'tab Hỏi AI' })))
    // Panel cuộn riêng (overflow auto) ở mép phải: thanh cuộn nằm dưới tab?
    for (const sc of document.querySelectorAll('main *, [role="dialog"], [role="dialog"] *')) {
      const s = getComputedStyle(sc)
      if (!(s.overflowY === 'auto' || s.overflowY === 'scroll') || sc.scrollHeight <= sc.clientHeight || !vis(sc)) continue
      const r = sc.getBoundingClientRect()
      const barLeft = r.right - (sc.offsetWidth - sc.clientWidth) - 2
      if (t.left < r.right && t.right > barLeft && t.top < r.bottom && t.bottom > r.top) out.covered.push({ el: `thanh cuộn ${name(sc)}`, by: 'tab Hỏi AI' })
    }
  }
  return out
}

/** Bàn phím: Tab qua trang, ghi phần tử không có focus thấy được; trả số điểm dừng. */
async function keyboardAudit(page) {
  await page.evaluate(() => {
    document.activeElement?.blur?.()
    window.scrollTo(0, 0)
  })
  const stops = []
  const invisible = []
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const pick = (s) => [s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 ? s.outlineColor + s.outlineWidth : '', s.boxShadow, s.borderColor, s.backgroundColor].join('|')
      const focused = pick(getComputedStyle(el))
      // So với lúc không focus (tạm bỏ :focus bằng bản sao không focus được): khác thì là có dấu hiệu focus.
      const clone = el.cloneNode(false)
      clone.removeAttribute('id')
      clone.setAttribute('tabindex', '-1')
      clone.style.position = 'absolute'
      clone.style.visibility = 'hidden'
      el.parentElement?.appendChild(clone)
      const plain = pick(getComputedStyle(clone))
      clone.remove()
      const s = getComputedStyle(el)
      const ring = focused !== plain || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
      const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
      const r = el.getBoundingClientRect()
      return { key: `${el.tagName.toLowerCase()} "${t}"`, ring, offscreen: r.width === 0 || r.height === 0 }
    })
    if (!info) continue
    if (stops.includes(info.key)) break
    stops.push(info.key)
    if (!info.ring) invisible.push(info.key)
  }
  return { stops: stops.length, noFocusRing: invisible }
}

async function run() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {})
  const results = []
  const jobs = []
  for (const width of WIDTHS) for (const theme of THEMES) jobs.push({ width, theme })

  const worker = async ({ width, theme }) => {
    const touch = width <= 768
    const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] ?? 900 }, hasTouch: touch, isMobile: width < 768, deviceScaleFactor: 1 })
    await ctx.addInitScript(
      ({ theme, seed }) => {
        if (!sessionStorage.getItem('__seeded')) {
          sessionStorage.setItem('__seeded', '1')
          localStorage.setItem('jla:theme', theme)
          localStorage.setItem('jla:v1:cards', JSON.stringify(seed.cards))
          localStorage.setItem('jla:v1:swipe-hint-seen', 'true')
        }
        window.__cls = []
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries())
              if (!e.hadRecentInput)
                window.__cls.push({
                  v: e.value,
                  t: e.startTime,
                  src: e.sources.map((x) => `${x.node?.nodeName}.${String(x.node?.className ?? '').slice(0, 60)} "${(x.node?.textContent ?? '').slice(0, 24)}" y${Math.round(x.previousRect.y)}→${Math.round(x.currentRect.y)} h${Math.round(x.previousRect.height)}→${Math.round(x.currentRect.height)}`),
                })
          }).observe({ type: 'layout-shift', buffered: true })
        } catch {
          /* không hỗ trợ */
        }
      },
      { theme, seed: { cards: Object.fromEntries(SEED_IDS.map((id) => [id, card(id)])) } },
    )
    for (const sc of SCREENS) {
      if (ONLY && !ONLY.has(sc.id)) continue
      const page = await ctx.newPage()
      const errors = []
      page.on('console', (m) => m.type() === 'error' && !EXTERNAL.test(m.text() + (m.location().url ?? '')) && errors.push(`console: ${m.text().slice(0, 200)}`))
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
      page.on('requestfailed', (r) => !EXTERNAL.test(r.url()) && errors.push(`request: ${r.url()} ${r.failure()?.errorText}`))
      page.on('response', (r) => r.status() >= 400 && !EXTERNAL.test(r.url()) && errors.push(`HTTP ${r.status()}: ${r.url()}`))
      const rec = { screen: sc.id, width, theme, errors }
      try {
        await page.goto(ORIGIN + BASE + sc.path)
        await settle(page)
        rec.clsLoad = +(await clsSince(page, 0)).toFixed(4)
        if (rec.clsLoad > 0.02) rec.clsSources = await page.evaluate(() => window.__cls.filter((e) => e.v > 0.005).map((e) => `${e.v.toFixed(3)} @${Math.round(e.t)}ms ${e.src.join(' | ')}`))
        if (sc.setup) {
          await sc.setup(page)
          await settle(page)
        }
        if (sc.act) {
          const m = await now(page)
          await sc.act(page)
          await page.waitForTimeout(900)
          rec.clsAct = +(await clsSince(page, m)).toFixed(4)
        }
        // Ở đầu trang: nội dung cuộn xuống dưới thanh đáy là bình thường → chỉ giữ phần bị tab AI đè.
        const top = await page.evaluate(inPage, width <= 390)
        Object.assign(rec, top, { covered: top.covered.filter((c) => c.by === 'tab Hỏi AI' || c.el.startsWith('thanh cuộn')) })
        // Cuộn xuống đáy: thanh điều hướng đáy / tab AI có che nút cuối trang không.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await page.waitForTimeout(200)
        const bottom = await page.evaluate(inPage, false)
        rec.covered = [...rec.covered, ...bottom.covered.map((c) => ({ ...c, at: 'đáy trang' }))]
        await page.evaluate(() => window.scrollTo(0, 0))
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
        rec.axe = axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')}${n.any[0]?.message ? ' – ' + n.any[0].message.slice(0, 120) : ''}`) }))
        if (width === 1280 && theme === THEMES[0]) {
          if (sc.escUrl) {
            const before = sc.escUrl.test(page.url())
            await page.keyboard.press('Escape')
            await page.waitForTimeout(500)
            rec.escCloses = before ? !sc.escUrl.test(page.url()) : 'không mở được'
          } else if (sc.esc) {
            const open = await page.locator(sc.esc).count()
            if (open) {
              await page.keyboard.press('Escape')
              await page.waitForTimeout(500)
              rec.escCloses = (await page.locator(sc.esc).count()) === 0 || (await page.locator(sc.esc).isHidden())
            } else rec.escCloses = 'không mở được'
          } else rec.keyboard = await keyboardAudit(page)
        }
      } catch (e) {
        rec.fail = String(e.message ?? e).slice(0, 300)
      }
      results.push(rec)
      process.stdout.write(`${rec.fail ? '✗' : '·'} ${sc.id} ${width} ${theme}\n`)
      await page.close()
    }
    await ctx.close()
  }
  // Chạy song song theo từng độ rộng × giao diện (4 luồng).
  const queue = [...jobs]
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) await worker(queue.shift())
    }),
  )
  await browser.close()
  writeFileSync(join(OUT, 'ux-audit.json'), JSON.stringify(results, null, 2))
  writeFileSync(join(OUT, 'ux-audit.md'), report(results))
  console.log(`\nĐã ghi ${join(OUT, 'ux-audit.md')}`)
}

function report(results) {
  const rows = []
  const add = (r, issue) => rows.push(`| ${r.screen} | ${r.width} ${r.theme} | ${issue.replace(/\|/g, '\\|')} |`)
  for (const r of results) {
    if (r.fail) add(r, `KHÔNG CHẠY ĐƯỢC: ${r.fail}`)
    for (const e of r.errors) add(r, e)
    if (r.overflowX) add(r, `Tràn ngang ${r.overflowX.scrollWidth}>${r.overflowX.innerWidth}: ${r.overflowX.culprits.join(', ')}`)
    for (const c of r.clipped ?? []) if (!c.ellipsis) add(r, `Chữ bị cắt: ${c.el} (${c.sw}>${c.cw})`)
    for (const s of r.small ?? []) add(r, `Vùng chạm nhỏ ${s.w}×${s.h}: ${s.el}`)
    for (const c of r.covered ?? []) add(r, `Bị che${c.at ? ' (' + c.at + ')' : ''}: ${c.el} bởi ${c.by}`)
    for (const f of r.fixedOverlap ?? []) add(r, `Fixed chồng nhau: ${f}`)
    for (const v of r.axe ?? []) add(r, `axe ${v.id} (${v.impact}, ${v.n}): ${v.sample.join(' ; ')}`)
    if (r.clsLoad > 0.02) add(r, `CLS khi tải ${r.clsLoad}`)
    if (r.clsAct > 0.02) add(r, `CLS khi thao tác ${r.clsAct}`)
    if (r.escCloses === false) add(r, 'Esc không đóng')
    if (r.escCloses === 'không mở được') add(r, 'Không mở được để thử Esc')
    for (const k of r.keyboard?.noFocusRing ?? []) add(r, `Focus không thấy: ${k}`)
  }
  return `# Rà soát UX (${new Date().toISOString()})\n\n${results.length} lượt màn hình.\n\n| Màn | Cỡ | Vấn đề |\n|---|---|---|\n${rows.join('\n')}\n`
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})

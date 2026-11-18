# Kotonoha – web học tiếng Nhật cá nhân

- Người dùng: người Việt ở Nhật (đã có N2), giao diện tiếng Việt. **Luôn trả lời và báo cáo bằng tiếng Việt.**
- Web app PWA, deploy GitHub Pages: https://cuong5401.github.io/JapaneseLearnApp/ (dùng cá nhân, `noindex`).
- Không có máy chủ: dữ liệu học là JSON tĩnh, tiến độ ở localStorage, AI gọi thẳng từ trình duyệt.

## Công nghệ và lệnh

- Vite 8 + React 19 + TypeScript 7 (`tsc` bản Go, không có JS API), Tailwind 4, motion, React Router 7
  (data router, `basename` = `BASE_URL`), wanakana, react-markdown, vite-plugin-pwa (Workbox),
  Vitest, Playwright, KanjiCanvas (`src/vendor/kanjicanvas`, nhận dạng trong Web Worker),
  AI: Gemini hoặc Claude (`@anthropic-ai/sdk`, tải lười) gọi thẳng từ trình duyệt.
- Lint bằng **oxlint** (`.oxlintrc.json`), không có ESLint parser. Rule `no-restricted-syntax` của ESLint
  được nạp qua JS plugin `lint/eslint-core.mjs` (alpha, kiểm tra lại khi nâng oxlint).

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server ở gốc `/` (http://localhost:5173) |
| `npm run build` | `tsc -b` + build bản đầy đủ vào `dist/` (base `/JapaneseLearnApp/`, kèm `404.html`) |
| `npm run build:public` | Bản không kèm ngữ pháp N4–N1 (không dùng khi deploy) |
| `npm run preview` | Xem bản build: http://localhost:4173/JapaneseLearnApp/ |
| `npm run lint` | oxlint + `scripts/check-i18n.mjs` (không còn chữ giao diện viết cứng) |
| `npm run i18n:review` | Xuất cặp Việt–Nhật ra `docs/i18n-ja-review.md` (chạy lại sau khi sửa từ điển) |
| `npm test` | Vitest (`src/**/*.test.ts`) |
| `npm run test:e2e` | Playwright trên dev server: project `desktop`, `iphone` (WebKit), `android` |
| `npm run test:e2e:preview` | Playwright trên bản build (cần `npm run build` trước), base production |
| `npm run audit:ux` | Rà soát UX toàn app trên bản build (cần `npx vite preview --port 4190` chạy sẵn): console, tràn ngang, chữ bị cắt, vùng chạm, fixed che nội dung, axe, CLS, bàn phím ở 390/768/1280/1440 × sáng/tối → `test-results/ux-audit/ux-audit.md` (~15 phút, không chạy trong CI) |
| `npm run check:secrets` | Quét repo + `dist/` tìm chuỗi giống API key |
| `npm run icons` | Sinh icon PWA trong `public/icons/` |
| `python scripts/convert_xlsx.py <file.xlsx> public/data` | Sinh lại dữ liệu từ Excel (cần `openpyxl`) |
| `python scripts/convert_xlsx.py --check` | Kiểm tra ngữ pháp tự soạn + cách đếm, không cần Excel |
| `python scripts/convert_xlsx.py --counters` | Chỉ chép `data-source/counters.json` → `public/data/counters.json` + sửa manifest (không cần Excel) |
| `py scripts/import-strokes.py [--zip file]` | Sinh lại thứ tự nét từ KanjiVG (tải release `*-main.zip` mới nhất) |
| `py scripts/import-kanjidic.py [--file f]` | Sinh lại âm On/Kun, số nét, JLPT cũ từ KANJIDIC2 (`kanji/kanji-readings.json`) |
| `node scripts/build-pdf-fonts.mjs` | Subset lại font nhúng phiếu luyện viết (`src/assets/fonts/`) khi danh sách chữ đổi |

- Windows: lệnh `python` có thể không có, dùng `py`.
- Máy này bật **Smart App Control**: chặn chromium/webkit tải về của Playwright và binding `.node` của oxlint.
  Chạy e2e bằng Chrome đã cài: `PW_CHANNEL=chrome` (PowerShell: `$env:PW_CHANNEL='chrome'`) với project
  `desktop`, `android`, `preview-desktop`, `preview-phone`. Lint và WebKit để CI kiểm tra. Lần đầu e2e: `npx playwright install chromium webkit`.
- E2E đầy đủ nặng: máy này nên chạy `--workers=4` (8 worker bị timeout ngẫu nhiên).
- Mã mở khóa: `VITE_UNLOCK_CODE=1234 npm run build` (4 số; bundle chỉ chứa SHA-256). Không đặt thì không hỏi mã.

## Cấu trúc

- `src/pages/` – mỗi route một file, tải lười (khai báo trong `src/main.tsx`).
- `src/lib/nav.ts` – điều hướng chính (xem mục "Điều hướng và trang chủ").
- `src/components/` – UI: `Layout` (sidebar desktop, header + bottom nav điện thoại), `GridCell`, `BottomSheet`,
  `study/` (flashcard, quiz), `detail/` (ngăn xếp chi tiết từ / chữ / bộ thủ), `ai/` (chat, `AiDock` khung nổi),
  `kana/`, `handwriting/`, `notebook/`.
- `src/lib/` – logic thuần, không React: `dataStore` (fetch + cache JSON), `srs`, `progress`, `search`, `lessons`,
  `backup` (xuất/nhập), `notebooks`, `detailStack`, `storage` (localStorage, tiền tố `jla:v1:`), `ai/` (provider,
  `session` phiên chat dùng chung, `dock`, `history`, `settings`), `handwriting/`. Test đặt cạnh file (`*.test.ts`).
- `src/hooks/` – nối store vào React (`useData`, `useProgress`, `useDetailStack`, `useAiChat`…).
- `src/data/` – dữ liệu nhỏ trong bundle: kana, thuật ngữ IT/điện tử/văn phòng (`terms/`), `radical-kanji.json`.
- `src/types/` – kiểu dữ liệu (`data.ts` khớp với JSON trong `public/data`).
- `scripts/` – `convert_xlsx.py`, `build-radical-kanji.mjs` (từ Unihan), `compact-ref-patterns.mjs` (KanjiCanvas),
  `gen-icons.mjs`, `check-secrets.mjs`.
- `tests/` – Playwright (dev); `tests/preview/` – Playwright trên bản build (`playwright.preview.config.ts`).

### Dữ liệu

- `public/data/` (`manifest.json`, `vocab/`, `kanji/`, `grammar/`, `import-report.md`) **sinh từ Excel** trong
  `data-source/` bằng `scripts/convert_xlsx.py`. **Không sửa tay JSON.** File Excel không có trong repo.
- Ngữ pháp tự soạn (`data-source/grammar-extra/n3.json`, `n5.json`) có trong git, được gộp khi convert.
- **Cách đếm** (`data-source/counters.json`, người dùng tự soạn, **không** từ Excel, có trong git): convert (cả bản đầy đủ và
  `--counters`) kiểm tra rồi chép sang `public/data/counters.json` (manifest `kind: 'counters'`, count = counters + more).
  Sửa nội dung ở `data-source/`, không sửa file trong `public/data`. Cấu trúc `{ rules[], counters[] (forms "1".."10","nan",
  nhiều cách đọc ngăn "／", irregular[], examples[], notes), more[] (keyForms) }`; id chỉ a-z và "_".
- ID = tiền tố + 8 ký tự SHA-1 của chữ + cách đọc (`n5-1a2b3c4d`, `kj-…`, `gn4-…`): ổn định, là **khóa của SRS,
  sổ tay, URL** → không đổi cách sinh ID.
- `kanji.json`: `firstLevel` = cấp từ vựng đầu tiên có chữ đó, **không phải** cấp kanji JLPT.
- **Thứ tự nét**: KanjiVG (Ulrich Apel), **CC BY-SA 3.0** – phải ghi nguồn (README, Cài đặt > Giới thiệu, chữ nhỏ dưới
  khung). `public/data/strokes/<hex>.json` `{ char, strokes: [{ d, n, x, y }] }` + `strokes/index.json` (danh sách chữ có
  dữ liệu; app đọc trước, không fetch chữ thiếu → không 404). Không nằm trong manifest; SW cache runtime `/data/*.json`.
  Component `src/components/strokes/StrokeOrder.tsx` (SVG tự vẽ, không thư viện), store `src/lib/strokes.ts`.
  **Không có thanh điều khiển** (đã bỏ ‹ ▶ › ↻, "Nét x/y", tốc độ, nút Số nét / Nét mờ): tốc độ cố định, luôn có số
  thứ tự nét và nét mờ. Tự phát 1 lần khi mở chữ; khung là `<button aria-label="Vẽ lại thứ tự nét chữ X">` (chạm /
  Enter / Space = vẽ lại từ đầu), icon ↻ mờ góc dưới phải. Reduced motion: hiện ngay đủ nét, mỗi lần chạm thêm 1 nét.
  Test đọc `data-step` / `data-total` / `data-playing`. Chỉ nét hiện tại có vòng `--beni` (+ chấm đặt bút, mũi tên
  cuối nét), nét đã vẽ là số xám nhỏ không nền, nét chưa vẽ không có số; vị trí theo `labelPositions` (không chồng).
  Nét mờ: mảnh, `--cell-line`, opacity thấp. Không ghi nguồn dưới khung (ở Cài đặt + README).
- **Âm On / Kun (KANJIDIC2, EDRDG), CC BY-SA 4.0** – ghi nguồn ở README + Cài đặt > Giới thiệu (`READINGS_CREDIT`).
  `public/data/kanji/kanji-readings.json` `{ source, version, chars: { 一: { on, kun, s, jlpt? } } }` sinh bằng
  `scripts/import-kanjidic.py` (chữ của kanji.json + bộ thủ + strokes/index; chữ thiếu thì không có mục → app để trống).
  File riêng, **không** sửa kanji.json (kanji.json sinh từ Excel). Không nằm trong manifest, fetch trực tiếp, store
  `src/lib/readings.ts` (`useReadings`, `loadReadings`). Kun giữ ký hiệu gốc: "." ngăn okurigana (ひと.つ → hiển thị
  ひとつ, panel in nhạt phần okurigana), "-" tiền/hậu tố; `uniqueKun` bỏ dạng "-" khi đã có dạng thường cùng gốc.
  Panel chi tiết (`KanjiReadings` trong KanjiDetail + CharDetail) luôn hiện On / Kun / Số nét, chờ dữ liệu giữ đủ 3 dòng.
- **Câu ví dụ (Tatoeba)** trong chi tiết từ vựng (`WordExamples` dưới nghĩa, trang và panel / sheet):
  `https://api.tatoeba.org/v1/sentences` (public, không key, CORS `*`; `sort` bắt buộc; `showtrans:lang=vie,eng`,
  `include=audios`, thêm 1 request `trans:lang=vie` nếu ít câu tiếng Việt). Câu **CC BY 2.0 FR**: ghi nguồn bằng link
  "Tatoeba" tới câu gốc; audio có giấy phép riêng từng file (tác giả trong `title`), phát ở `/v1/audios/{id}/file`
  (`download_url` API trả về bị sai). Logic thuần `src/lib/examples/tatoeba.ts` (chuẩn hóa từ, gốc để khớp dạng chia,
  xếp hạng: có dịch Việt > 8–40 ký tự > có audio, bỏ câu gần giống), hook `useWordExamples`.
  **Thứ tự nguồn:** cache IndexedDB (`kotonoha`/`examples`, theo id từ, 30 ngày, tối đa 2.000 từ, xóa cũ nhất) →
  Tatoeba (chỉ khi mở chi tiết, timeout 6 giây mỗi request, hủy khi đóng panel) → không có câu / lỗi: **AI tạo 3 câu**
  nếu có key (nhãn "AI tạo", `src/lib/ai/complete.ts`) → không key: "Chưa tìm thấy ví dụ". Offline không cache: ẩn
  khối. Câu chỉ có tiếng Anh: nhãn EN + "Dịch sang tiếng Việt" (AI, có key). Khối giữ chỗ 3 câu (skeleton cùng chiều
  cao). Lưu câu vào sổ tay = `NotebookItem.examples` của từ (tối đa 5, có trong Xuất / Nhập tiến độ).
- **Nén path SVG (`scripts/import-strokes.py`)**: tách token đúng ngữ pháp SVG (số dính nhau "1.5.5", "14.62-0.02");
  giữa hai số LUÔN có dấu phẩy, chỉ bỏ khi số sau âm SAU khi làm tròn; không bao giờ ra "-0"; làm tròn theo tọa độ
  tuyệt đối (lệnh tương đối = round(abs) − round(điểm đầu đoạn)) để không cộng dồn sai số. `verify_path` bắt buộc
  (đúng số tham số mỗi lệnh, lệch bản gốc < 0.5), sai thì script dừng. Vitest `strokes.test.ts` kiểm toàn bộ file.
- `radicals.json`: đúng **214 bộ, `no` = số Khang Hy** (khối Unicode U+2F00–U+2FD5, NFKC), có `strokes`, `variants`
  (亻 của 人, 阝 ấp = 163 / 阝 phụ = 170 theo tên). Bộ thiếu trong Excel lấy từ `data-source/radicals-extra.json`
  (`auto: true`). `src/data/radical-kanji.json` (Unihan) cũng theo số Khang Hy. Script ghi
  `src/data/radical-id-migration.json` (số cũ theo dòng Excel → số mới); `src/lib/migrations.ts` đổi id `rd-NNN`
  trong SRS + sổ tay một lần mỗi máy (import đầu tiên trong `main.tsx`) và khi nhập file tiến độ cũ (không có
  `radicalIds: 'kangxi'`). Đổi lại cách đánh số bộ thủ thì phải thêm migration mới.

## Ngôn ngữ giao diện (i18n: Tiếng Việt / 日本語, sẵn cho ngôn ngữ thứ 3)

- **Mọi chữ giao diện qua từ điển**: `t('khóa', { thamSo })` từ `src/i18n` (menu, tiêu đề, nút, nhãn, placeholder, aria-label,
  title, toast, lỗi, màn trống, hộp thoại, tiêu đề / chân trang phiếu luyện viết…). Không viết chữ cứng trong JSX/TS:
  `scripts/check-i18n.mjs` (chạy trong `npm run lint`, CI) báo lỗi chuỗi có dấu tiếng Việt và chữ Latin ở JSX / thuộc tính hiển thị.
  Ngoại lệ có chủ đích: `// i18n-ignore` cuối dòng hoặc vùng `/* i18n-ignore-start */ … /* i18n-ignore-end */` (vd. thông báo
  kiểm tra dữ liệu cho script, tên nhóm ngữ pháp là giá trị dữ liệu, tên model AI).
- Từ điển tự viết, khóa có kiểu chặt: `src/i18n/vi.ts` (gốc, `as const`, định nghĩa bộ khóa `MessageKey`) và mỗi ngôn ngữ một
  file `src/i18n/<mã>.ts` kiểu `Dict` (= đủ đúng khóa của vi; thiếu / thừa là lỗi TypeScript). Thêm chữ mới: thêm khóa vào
  **mọi** file từ điển. Khóa `<khu vực>.<tên>` (khu vực = tên file, `common.*` cho chữ dùng chung).
- **Bảng đăng ký duy nhất** `src/i18n/locales.ts` (`LOCALE_REGISTRY`: tên, mã Intl, `<title>`, import động từ điển). Mọi nơi khác
  đọc từ đây: Cài đặt → Ngôn ngữ (`LOCALES`, `LOCALE_NAMES`), `isLocale` (Xuất / Nhập), `<html lang>`, Intl, test, script quét,
  `scripts/build-pdf-fonts.mjs`, `scripts/i18n-review.mjs`. Không viết `'vi' | 'ja'` / `=== 'ja'` cho ngôn ngữ giao diện ở chỗ khác.
- Runtime `src/i18n/index.ts`: từ điển là chunk tải lười; `main.tsx` chờ `initLocale()` rồi mới render. Đổi ngôn ngữ
  (`setLocale`) render lại cả cây (`LocaleRoot` key = ngôn ngữ, router giữ nguyên) → không tải lại trang; cập nhật `<html lang>`
  và `<title>`. Lưu `jla:v1:locale`, **có** trong Xuất / Nhập tiến độ (`backup.locale`). Ngày / số theo Intl của ngôn ngữ:
  `formatDate`, `formatDateTime`, `formatShortDate` (phiếu viết), `formatNumber`. Unit test nạp từ điển vi qua `src/i18n/testSetup.ts`.
- **Cú pháp chuỗi** (tập con ICU, `formatMessage`): `{ten}`; `{n, number}`; số nhiều `{n, plural, =0 {…} one {# thẻ} other {# thẻ}}`
  (Intl.PluralRules, `#` = số đã định dạng); `{x, select, a {…} other {…}}`. Tiếng Việt / Nhật không có số nhiều nên viết `{n} thẻ`;
  ngôn ngữ có số nhiều viết `plural` ngay trong khóa đó (không cần khóa `_one` / `_other`).
- **Câu có số phải trọn trong một khóa** (để ngôn ngữ khác tự đặt trật tự từ / số nhiều): không ghép `{số}{t('… thẻ')}` trong JSX.
  Đơn vị đếm truyền dạng mã `CountUnit` (`src/i18n/units.ts`: word, char, radical, item, card, question) qua tham số `unit` và
  `{unit, select, …}` (`common.unitCount`, `common.progressOf`, `lessonGrid.*`, `resumePrompt.*`). Phần cần định dạng riêng
  trong câu (số đậm, số có hiệu ứng) dùng thẻ trong chuỗi + `tRich(key, params, { b: (s) => <strong>{s}</strong> })`
  (`src/i18n/rich.tsx`), không tách câu.
- **Không gọi `t()` lúc nạp module** (trước khi có từ điển): nhãn trong mảng / object cấp module dùng getter
  (`get label() { return t('…') }`); store tạo dữ liệu mặc định có chữ (sổ "Từ khó") phải khởi tạo lười. Bản dev báo
  `[i18n]` trên console nếu gọi sớm hoặc thiếu khóa; `tests/i18n.spec.ts` fail khi thấy cảnh báo này.
- **Dữ liệu học giữ tiếng Việt** ở mọi ngôn ngữ giao diện: nghĩa từ, âm Hán Việt, tên / nghĩa bộ thủ, giải thích ngữ pháp,
  cách dùng trợ số từ, câu dịch ví dụ, ghi chú kana (`src/data/`). Chỉ dịch nhãn cố định quanh dữ liệu (音読み, 訓読み, 漢越音,
  意味, 例文, 部首, 画数…). Tên nhóm ngữ pháp là giá trị dữ liệu, hiển thị qua `groupLabel()`.
- **AI mặc định tiếng Việt**, không phụ thuộc giao diện: system prompt, câu hỏi soạn sẵn (nút "Hỏi AI", chip "Hỏi về …", ảnh vẽ
  tay, kiểm tra kết nối), dữ liệu gửi kèm theo `aiSettings.explainLang` ('vi' mặc định | 'ja', Cài đặt → Trình độ → "Ngôn ngữ
  giải thích của AI"); nội dung ở `src/lib/ai/content/{vi,ja}.ts` (không qua từ điển, bỏ qua khi quét). Khung giao diện của AI
  (nút, tiêu đề, placeholder, nhãn chế độ) theo ngôn ngữ giao diện. Dịch / tạo câu ví dụ (`complete.ts`) luôn ra tiếng Việt.
- Font: `[lang='ja']:not(html)` dùng `--font-jp`; `<html lang="ja">` không đổi font giao diện (dữ liệu tiếng Việt giữ Be Vietnam Pro).
- Phiếu luyện viết in chữ giao diện: `scripts/build-pdf-fonts.mjs` lấy chữ của các khóa in trên phiếu (`PRINTED_KEYS`: `layout.*`,
  `sources.*`, `kanjiLessons.*`, `writing.footer*`…) của MỌI ngôn ngữ đã đăng ký vào subset font Nhật + Latin → thêm khóa in trên
  phiếu thì sửa `PRINTED_KEYS`; đổi bản dịch các khóa đó thì chạy lại script.
- Tiếng Nhật: tự nhiên, ngắn kiểu app học (ホーム・学習・復習・ノート・マイページ・設定), câu thông báo dùng です・ます.
- Test: `src/i18n/i18n.test.ts` (chạy cho MỌI ngôn ngữ đã đăng ký: đủ khóa, tham số là tập con của bản vi, mọi chuỗi định dạng được
  với số 1 và 5 không sót ngoặc, bản dịch không còn chữ Việt; plural / select / number); `tests/i18n.spec.ts` (đổi ngôn ngữ không tải
  lại, dữ liệu vẫn tiếng Việt, AI mặc định tiếng Việt, PDF tiếng Nhật, chụp 7 màn ở 390 / 1280px với `I18N_SHOTS=<thư mục>`,
  không tràn ngang, không lộ khóa).

### Cách thêm ngôn ngữ mới (vd. tiếng Anh `en`)

1. **Tạo từ điển** `src/i18n/en.ts`: chép `ja.ts`, đổi tên biến, dịch từng giá trị (giữ nguyên khóa và tên tham số `{ten}`).
   Kiểu `Dict` bắt buộc đủ khóa. Câu có số dùng `plural`, vd. `"common.unitCount": "{n, plural, one {# {unit, select, word {word}
   char {character} radical {radical} item {item} card {card} question {question} other {item}}} other {# {unit, select, word {words}
   char {characters} radical {radicals} item {items} card {cards} question {questions} other {items}}}}"`. Thẻ `<b>…</b>`, `<n>…</n>`,
   `<time>…</time>` giữ nguyên tên thẻ, đặt ở chỗ hợp ngữ pháp.
2. **Đăng ký một dòng** trong `src/i18n/locales.ts`:
   `en: { name: 'English', intl: 'en-US', title: 'Kotonoha | Learn Japanese', load: () => import('./en') },`
   (thứ tự trong bảng = thứ tự trong Cài đặt; dòng đầu là ngôn ngữ mặc định / từ điển gốc, giữ `vi`).
3. **Kiểm tra**: `npm test` (i18n.test tự chạy cho ngôn ngữ mới), `npm run lint`, `npm run build`,
   `npm run i18n:review -- en` (bảng rà soát `docs/i18n-en-review.md`), `node scripts/build-pdf-fonts.mjs` (glyph cho chữ in trên phiếu).
   Chụp màn bằng `tests/i18n.spec.ts` (đang viết cho `ja`: thêm bản cho ngôn ngữ mới nếu cần).
- KHÔNG cần sửa gì khác: Cài đặt, Xuất / Nhập, `<html lang>`, `<title>`, ngày / số / số nhiều, script quét đều đọc bảng đăng ký.
- Lưu ý: chữ Latin và chữ Nhật đã có font (giao diện và PDF). Hệ chữ khác (Hàn, Thái, Ả Rập…) phải thêm font vào `--font-sans`
  (`src/index.css`) và vào `scripts/build-pdf-fonts.mjs`; ngôn ngữ viết phải sang trái cần thêm `dir`. Ngôn ngữ giải thích của AI là
  việc riêng (`src/lib/ai/content/` + `ExplainLang`), không bắt buộc khi thêm ngôn ngữ giao diện.

## Quy tắc bắt buộc

- **Đường dẫn:** base production `'/JapaneseLearnApp/'`, dev `'/'`. Tài nguyên tĩnh dùng `import.meta.env.BASE_URL`.
  Điều hướng (`navigate`, `<Link to>`, `<Navigate>`) chỉ dùng đường dẫn trong app (`'/kanji'`) hoặc `useLocation()`;
  **KHÔNG** dùng `window.location.*` hay `BASE_URL` (đã gây lỗi `/JapaneseLearnApp/JapaneseLearnApp/`; lint chặn).
  Thay đổi liên quan điều hướng phải chạy cả `test:e2e:preview` (CI chạy trước khi deploy).
- **Git:** chỉ stage đúng file cần thiết (không `git add -A`). Không commit `*.xlsx`, `.playwright-mcp/`,
  `test-results/`. Không force push / viết lại lịch sử khi chưa được đồng ý. Commit message tiếng Việt.
  `core.autocrlf=true`: script sửa file nên đọc rồi ghi LF (`\r\n` → `\n`), nếu không chuỗi tìm-thay sẽ không khớp.
- **API key AI** chỉ nằm trong localStorage của từng máy (`jla:ai-key:<provider>`); không có trong code, repo, log,
  file xuất tiến độ. Provider `mock` chỉ có ở bản dev (dùng cho test).
- **Dữ liệu người dùng** (localStorage, `jla:v1:*`): `cards` (SRS FSRS), `review-log`, `srs-settings`, `lesson-size`,
  `kana`, `notebooks`, `grammar-checked`, `ai-words` → **có** trong Xuất/Nhập tiến độ (`src/lib/backup.ts`, version 2;
  file version 1 = SM-2 tự đổi sang FSRS khi nhập).
  `locale` (ngôn ngữ giao diện) cũng có trong file xuất.
  `ai-chats` (tối đa 10 cuộc, cuộc ghim không bị xóa), `ai-settings` (kể cả `explainLang`), `ai-dock`, `jla:theme` hiện **chưa** có
  trong file xuất. Thêm loại dữ liệu học mới thì thêm vào `backup.ts` (kèm sanitize + test).
- **Mỗi lần xong việc:** lint, build, test (unit + e2e liên quan), commit, push, kiểm tra workflow deploy xanh
  (không có `gh`: dùng `curl https://api.github.com/repos/cuong5401/JapaneseLearnApp/actions/runs`), rồi báo cáo:
  đã thay đổi gì, kết quả test, ảnh chụp (đường dẫn), điều người dùng cần tự làm.
- CI (`.github/workflows/deploy.yml`, push `main`): `npm ci` → lint → test → build (secret `VITE_UNLOCK_CODE`) →
  check:secrets → kiểm tra dist → e2e preview → deploy Pages. Bước nào lỗi thì không deploy.

## Luyện viết (phiếu tập viết, `/writing`)

- Vào từ sidebar desktop (mục "Luyện viết", ẩn ở bottom nav và nav tablet) và nút "Tạo phiếu luyện viết"
  (`WritingSheetLink`) ở trang bài Chữ Hán (`?src=kanji&level=N5&bai=1`), Sổ tay (`?src=notebook&id=`), bảng kana
  (`?src=kana&script=&rows=`). Nguồn đồng bộ URL (`parseSource` / `sourceParams`); tự nhập (`src=custom`) không đưa chữ lên URL.
- `src/lib/writing/` (thuần, có test `writing.test.ts`, `fonts.test.ts`):
  `sources.ts` (nguồn → danh sách chữ → `WritingItem`; tự nhập lọc trùng + chữ không có nét KanjiVG; sổ tay lấy chữ Hán
  trong từ đã lưu; chia bài dùng `src/lib/kanjiLessons.ts` chung với trang Chữ Hán), `options.ts` (`jla:v1:writing-options`,
  chỉ là cài đặt hiển thị, không vào backup), `layout.ts` (`geometry` + `buildScene`: mỗi trang là danh sách nét kẻ / chữ /
  text theo point, gốc trên trái), `pdf.ts`, `docx.ts`, `cellImage.ts` (PNG 300 dpi bằng canvas), `fonts.ts`, `measure.ts`,
  `exportFile.ts` (tải file, in qua iframe, chia sẻ trên iPhone).
- **Xem trước SVG, PDF, Word cùng đọc `buildScene` / `geometry`** → đổi bố cục ở một chỗ. Ô = bội số 0.05pt (1 twip) để
  bảng Word khớp PDF; ranh giới ô tiêu đề trùng đường kẻ cột (`headerSplit`). Khung 0.75pt, ô 0.5pt, hướng dẫn nét đứt 0.3pt.
  Hàng tiêu đề: "NHẤT: Số 1" | On | Kun (kana: romaji | chữ bảng kia); text dài thu nhỏ tới 7pt rồi bỏ bớt âm cuối ("…").
- PDF: pdf-lib + @pdf-lib/fontkit, chữ = `drawSvgPath` path KanjiVG (nét 3/109, đầu tròn), số nét = text tại (x, y) gốc
  KanjiVG; text dùng font nhúng `subset: true`. Chữ không có nét → Klee One, thiếu nữa → Noto Sans JP. 20 chữ ≈ 57 KB.
  Word: docx, mỗi chữ một bảng (ô mẫu ghép dọc), ảnh PNG = kích thước ô, giữa các khối là đoạn cao đúng `gap`, trang mới
  bằng `pageBreakBefore`; tiêu đề là text thường.
- **Chỉ tải thư viện xuất khi bấm xuất**: `exportFile.ts` dùng `import('./pdf')` / `import('./docx')`; trang Writing
  không được import tĩnh pdf-lib / docx. Chunk `pdf-*.js`, `docx-*.js` và font `.ttf` (import `?url`) không precache
  (`globIgnores`), cache CacheFirst khi dùng (`kotonoha-lazy-assets`) → lần sau xuất được offline. Nét chữ có cache riêng
  `kotonoha-strokes` (2.500 mục) để in nhiều bài không đẩy dữ liệu từ vựng ra khỏi cache chung.
- Test e2e `tests/writing.spec.ts`: `WRITING_SHOT=<png>` render trang 1 PDF bằng pdf.js, `WRITING_OUT=<dir>` lưu PDF/DOCX.

## Ôn tập: FSRS (ts-fsrs 5.x)

- `src/lib/srs.ts` bọc **ts-fsrs 5.x** (không dùng 6.x: đổi API sang `dueAt`/`learningStep`, bỏ `elapsed_days`).
  Learning steps [1m, 10m], relearning [10m]. Hàm thuần nhận `SchedulerSettings` + `now` (test tắt fuzz).
- `SrsCard` (`jla:v1:cards`) = các trường `Card` ts-fsrs, ngày bằng ms: `id, due, stability, difficulty, elapsed_days,
  scheduled_days, reps, lapses, state (0 Mới/1 Đang học/2 Ôn tập/3 Học lại), last_review (0 = chưa), learning_steps`.
  "Đã thuộc" = state Ôn tập và `scheduled_days ≥ 21`. Kẹp `scheduled_days ≤ maxInterval` (ts-fsrs cho Easy vượt vài ngày).
- **Ánh xạ thao tác → rating** (`flashcardGrade`, `quizGrade`): flashcard Chưa nhớ/Đã nhớ = Again/Good; quiz sai = Again,
  đúng sau Gợi ý = Hard, đúng = Good; trang Ôn tập 4 nút Quên/Khó/Nhớ/Dễ (phím 1–4), nhãn thời gian từ `preview()`.
- "Đánh dấu đã học" / "Thêm cả sổ vào lịch ôn" tạo thẻ **Mới** (`progress.addNew`), chờ ở trang Ôn tập theo giới hạn
  thẻ mới/ngày. Hàng đợi `src/lib/reviewQueue.ts`: đang học → ôn tập (retrievability thấp trước, giới hạn lượt ôn/ngày)
  → mới. `useReviewQueue` hẹn giờ đúng lúc thẻ sớm nhất đến hạn + mỗi phút + khi app quay lại. Trang Ôn tập: hết thẻ mà
  còn thẻ đến hạn trong 20 phút thì đếm ngược + "Ôn luôn bây giờ".
- `src/lib/reviewLog.ts`: lịch sử ôn nén `{v,ids,rows}` (6 số/lượt), tối đa 20.000 lượt; dùng cho giới hạn ngày,
  thống kê (trang Tiến độ), sau này tối ưu tham số `w` (để sẵn trong `srsSettings`). Hoàn tác flashcard bỏ log cuối.
- Cài đặt `src/lib/srsSettings.ts` (`jla:v1:srs-settings`): retention 0.80–0.95, maxInterval, fuzz, newPerDay,
  reviewsPerDay, `w?`. Migration `fsrs` (`src/lib/migrations.ts`, chạy 1 lần): SM-2 đã ôn → Ôn tập (stability ≈ interval,
  tối thiểu 0.5; difficulty từ ease 1.3→9, 2.5→5, ≥3→3; giữ due/reps/last_review; lapses 0), chưa ôn → Mới.
- Kana dùng kho riêng `kanaProgress` (không phải SRS).

## Điều hướng và trang chủ

- **Điều hướng chính đúng 5 mục** (`NAV` trong `src/lib/nav.ts`): 家 Trang chủ · 学 Học (`/learn`) · 復 Ôn tập (huy hiệu số thẻ)
  · 帳 Sổ tay · 私 Cá nhân (`/me`). Sidebar desktop chia nhóm có tiêu đề nhỏ ("Học tập", "Của bạn") + nút Giao diện ở đáy;
  tablet nav trên 4 mục (logo = Trang chủ); điện thoại bottom nav 5 cột. Hỏi AI **không** nằm trong điều hướng (tab nổi
  `AiDock`; trang `/ai` mở từ Cá nhân). Header điện thoại: tìm kiếm, vẽ chữ, giao diện (không còn nút Cài đặt).
- URL cũ giữ nguyên (`/kanji`, `/grammar`, `/kana`, `/vocab`, `/word`, `/terms`, `/writing`, `/progress`, `/settings`…):
  mục cha sáng theo `match` + `navActive` (đang ở /kanji thì "Học" sáng, /settings thì "Cá nhân"), link có `aria-current`.
- `/learn` (`src/pages/Learn.tsx`): nhóm có tiêu đề nhỏ, thẻ cỡ vừa có tiến độ; Từ vựng JLPT = 1 thẻ 5 dòng cấp, Bộ từ khác,
  Chữ Hán (+ Bộ thủ), Ngữ pháp, Kana, Cách đếm, Thuật ngữ (3 dòng), Luyện viết. `/me` (`src/pages/Me.tsx`): tóm tắt Tiến độ,
  Cài đặt + Hỏi AI, Giao diện (`theme` store chung trong `useTheme`, khớp nút sidebar/header), Cài app, Giới thiệu
  (`AboutSources`, cũng ở /settings). Thống kê dùng chung: `src/hooks/useStudyStats.ts`.
- **Trang chủ phải gọn: desktop 1280×800 nằm trong 1 màn hình, không cuộn; điện thoại 390×844 tối đa ~2 màn.**
  Hàng 1: "Ôn tập hôm nay" + "Học tiếp" (bài dở dang gần nhất của bộ từ vựng / chữ Hán ôn gần nhất), cùng chiều cao.
  Hàng 2: chữ Hán ngẫu nhiên thu gọn (2 từ, chạm chữ mở chi tiết). Hàng 3: lối tắt (N5…N1, Chữ Hán, Ngữ pháp, Kana,
  Cách đếm), điện thoại cuộn ngang scroll-snap, từ md lưới 5 cột + ô "Tất cả →". Khối lớn mới thêm đặt ở `/learn`,
  không đặt ở trang chủ. Test: `tests/counters.spec.ts` (đo chiều cao trang, cùng chiều cao hàng 1).

## Cách đếm (助数詞, `/learn/counters`)

- Logic thuần `src/lib/counters.ts` (test `counters.test.ts`): ID `ct-<id>` (trợ số từ: sổ tay, chi tiết) và `ct-<id>-<n>`
  (ô số + trợ số từ, n = 1..10 | nan: thẻ SRS). `pathForId` → `counters.json`, `useEntries` trả `StudyEntry` kind
  `counter` (có `n` nếu là ô). `reasonFor` tự giải thích biến âm ("ほ → ぼ sau 3", "いち → いっ (âm ngắt)", "Số đếm kiểu
  Nhật"). `acceptedReadings` (gồm …かん lược 間, なん+trợ số từ khi ô 何 là いくつ/いくら) **không bao giờ** là đáp án nhiễu.
- Trang: Quy tắc đếm (thu gọn, mặc định đóng), lọc cấp `?cap=`, tìm kiếm (chữ/kana/cách đọc trong bảng/ví dụ; tiếng Việt
  theo từ trọn vẹn, có dấu thì so có dấu), nhóm theo `group`, "Trợ số từ khác" (more). Chi tiết = khung ngăn xếp `c:<id>`
  (`CounterDetail`): panel 360px (WIDE_PANEL) / bottom sheet, trang tự hiển thị ngăn xếp (`OWN_STACK`,
  `useDetailStack(undefined, { ownPage: true })`). Bảng 1–10 + 何 lưới 3 cột, ô bất quy tắc nền `--beni`, chạm ô xem lý do.
- Học: `?mode=flashcards|quiz`, `?ct=<id>` luyện một trợ số từ. Flashcard "3 + 本" → さんぼん + lý do. Quiz trộn 3 dạng:
  chọn cách đọc, chọn trợ số từ cho câu ví dụ đục lỗ (nhiễu khác nhóm, bỏ cặp cùng đúng như 本/杯 trong `CONFUSABLE`),
  gõ cách đọc. Chọn cặp (`pickPairs`): đến hạn → bất quy tắc chưa học → hay sai → còn lại.
  **Chỉ ghi lịch ôn** (`shouldTrack`) khi trả lời sai, ô bất quy tắc, hoặc đã có thẻ (tránh hàng trăm thẻ ô thường).

## Giữ vị trí cuộn, phiên học dở

- `src/hooks/useScrollRestore.ts` (Layout, mọi trang, `history.scrollRestoration = 'manual'`): lưu scrollY theo `location.key` +
  đường dẫn (sessionStorage `jla:scroll:`). PUSH / REPLACE sang trang khác → lên đầu; POP (Back / Forward / F5) sang trang khác →
  chờ hết skeleton `main [role=status][aria-label^="Đang tải"]` và trang đủ cao (tối đa 5 giây) rồi cuộn MỘT lần; người dùng tự
  cuộn / chạm / bấm phím lúc chờ thì thôi. Đổi tham số cùng trang (?k=, ?tab=) không đụng vị trí cuộn. Trang mới nhớ chờ dữ liệu
  bằng skeleton có `role="status" aria-label="Đang tải…"`. Không còn `useScrollMemory` riêng từng trang.
- `LessonGrid`: trang đang xem ở `?trang=N` (đếm từ 1, `replace`); không có thì trang chứa bài học tiếp theo.
- **Phiên học dở** (`src/lib/studySession.ts` + `src/hooks/useStudySession.tsx`): Flashcard, Quiz, ChoiceQuiz, CounterQuiz, Ôn tập,
  luyện kana lưu vào sessionStorage `jla:session:<loại>:<pathname>:<hash id đã sắp xếp>` mỗi lần chấm một câu (chỉ id + vị trí +
  kết quả, quá 12 giờ thì bỏ; chấm xong lượt thì xóa). Mở lại bài: `ResumePrompt` "Tiếp tục từ câu 8/20?" (Tiếp tục / Làm lại).
  Đã chấm ≥ 3 câu mà chưa xong: rời trang (điều hướng, Back, đổi ?tab= / ?mode= / ?luyen=; bỏ qua ?xem, ?k, ?trang) hỏi bằng
  `ConfirmDialog` (không dùng `window.confirm`) "Tiến độ đã được lưu". `useLeaveGuard` = `useBlocker` + cờ mounted đặt bằng
  layout effect: useBlocker gỡ blocker trong useEffect cleanup (trễ) nên Back ngay sau khi rời trang từng bị blocker cũ chặn.
  Kana: bộ chữ đang luyện (?luyen=1) nhớ ở `jla:kana-practice-open` để F5 mở lại. Không vào file xuất tiến độ (SRS đã có kết quả).
- Thẻ flashcard: nút lật là `<button role="button" data-flip-card>` trong suốt phủ cả thẻ, mặt thẻ nằm trên với
  `pointer-events-none` (trừ nút / link bên trong) → không lồng nút trong nút (axe). Khung thẻ trên cùng có `data-flashcard-top`
  (test đọc chữ mặt thẻ ở đây). Focus ở nút lật thì phím ← → Z vẫn chạy, Space / Enter để nút tự bấm.
- Test: `tests/preview/ux.spec.ts` (CI): tràn ngang, console / request lỗi, vùng chạm < 44px (Pixel 7), Back khôi phục cuộn +
  `?trang=`, tiếp tục phiên quiz / flashcard, hộp xác nhận khi rời (điều hướng, Back, Esc). Unit: `studySession.test.ts`.

## Không layout shift (bắt buộc)

- `html { scrollbar-gutter: stable }`: trang dài/ngắn, khóa cuộn không làm lệch ngang.
- Trang bài học (từ vựng, kanji, bộ thủ, sổ tay) dùng `LESSON_PAGE` (`w-full` + max-width cố định) chung cho cả
  3 tab; vùng nội dung tab `TAB_AREA` (min-height = vùng flashcard) — `src/components/StudyLayout.tsx`.
- Trang Chữ Hán / Bộ thủ desktop (`WIDE_PANEL`): lưới `minmax(0,1fr)_360px`, panel 360px **luôn** giữ chỗ (chưa chọn
  thì "Chọn một chữ để xem chi tiết"), nội dung dài xuống dòng/cuộn trong panel.
- Danh sách đã biết trước số lượng (`words.length`, `wordCount`, số chữ của bộ): render ngay đúng số hàng skeleton
  (`SkeletonRows`, `DetailSkeleton` trong `LoadState.tsx`) cao bằng hàng thật, khối tối thiểu 2 hàng; nhãn chờ dữ liệu
  giữ chiều cao dòng. Không dùng `PageSkeleton` chung chung trong panel.
- Sheet chi tiết (từ / chữ Hán / trợ số từ) dùng `BottomSheet tall` (cao cố định 88dvh): nội dung tải lười không làm sheet nhảy.
  Khối câu ví dụ luôn giữ cao 3 câu, kể cả khi "Chưa tìm thấy ví dụ" (Tatoeba hết giờ chờ 6 giây). Ô chờ dữ liệu phải có cùng
  số dòng với khi tải xong (vd. phiếu luyện viết hiện đủ các cấp và 30 ô bài khi chưa có dữ liệu).
- Test: `tests/layout-stability.spec.ts` (đo `getBoundingClientRect`, CLS < 0.02).

## Ngăn xếp panel chi tiết

- Bấm mục ở **danh sách chính** (lưới chữ/bộ thủ, kết quả tìm kiếm, sổ tay, từ ở trang chủ, kết quả chat) =
  `stack.open(frame)`: THAY cả ngăn xếp (panel đang mở thì replace mục lịch sử).
- Chỉ thao tác **bên trong panel** (chữ/từ liên quan) mới `stack.push`. Tối đa `MAX_FRAMES = 8` khung kể cả chữ gốc
  `?k=` (bỏ khung cũ nhất, giữ chữ gốc). Test: `tests/detail-stack.spec.ts`.

## Thiết kế (Aizome)

- Màu qua biến CSS trong `src/index.css` (`--ai` chàm, `--paper`, `--kihada`, `--beni`, `--matsu`…), dark mode bằng
  class `.dark` (chỉ đổi giá trị biến). Không viết mã màu trực tiếp trong component.
- `GridCell`: ô giấy tập viết (khung + chữ thập), cỡ chữ theo container (`cqw`), không theo viewport.
- Font Be Vietnam Pro + Noto Sans JP (`lang="ja"` → `font-jp`). Icon là SVG, không dùng emoji.
- Nút ≥ 44px (`min-h-11` / `size-11`); nút biểu tượng nhỏ trong danh sách dày dùng `size-9 pointer-coarse:size-11`, Segmented `sm`
  `pointer-coarse:min-h-11 min-w-11`. Link cả thẻ dùng "stretched link" (`after:absolute after:inset-0`, nút trong thẻ `relative z-10`).
  Ngoại lệ còn lại: tab Hỏi AI dính mép 28×64 (16×64 khi học) – đạt WCAG 2.5.8 AA (≥ 24px). Tôn trọng reduced motion (`MotionConfig reducedMotion="user"`).
- Mobile trước: < 768px có bottom nav (5 mục), < 1024px có header; ≥ 1024px có sidebar.
- iPhone Safari: input/textarea/select ≥ 16px trên màn cảm ứng (`pointer-coarse:text-base`), không khóa zoom
  trong viewport; `touch-action: manipulation`; `overscroll-behavior: none` (html/body), vùng cuộn trong dùng
  `overscroll-contain`; bàn phím ảo xử lý bằng `visualViewport` (xem `AiDock`).
  Khóa cuộn trang: khung Hỏi AI dùng `lockScroll()` (`src/lib/scrollLock.ts`: body `position: fixed; top: -scrollY`,
  vì iOS bỏ qua `overflow: hidden`); BottomSheet và tìm kiếm vẫn dùng `body.style.overflow = 'hidden'`.

## Tính năng hiện có

- Từ vựng N5–N1, từ ghép, từ láy, phó từ, thuật ngữ chuyên ngành: chia bài (cỡ bài tùy chọn), flashcard vuốt,
  quiz, đánh dấu đã học.
- Ôn tập FSRS (4 mức chấm, bước học lại trong ngày, giới hạn mỗi ngày, Cài đặt → Ôn tập; trang Tiến độ: tỷ lệ nhớ
  30 ngày, dự báo 30 ngày, số thẻ theo trạng thái). Quiz có nút Gợi ý (trắc nghiệm bỏ 2 đáp án sai, gõ: chữ đầu).
- Chữ Hán: chia bài theo cấp xuất hiện, flashcard, quiz âm Hán Việt, chi tiết dạng ngăn xếp theo URL
  (`?k=` chữ gốc, `?xem=w:…~k:…~r:…`; desktop là panel/drawer, điện thoại là bottom sheet). Bộ thủ + chữ thuộc bộ.
- Ngữ pháp N5–N1 (N5/N3 có mẫu tự soạn), lọc nhóm, đánh dấu đã kiểm tra.
- Luyện viết: phiếu tập viết PDF / Word (xem mục riêng). Âm On/Kun (KANJIDIC2) trong panel chi tiết chữ Hán.
- Thứ tự nét (KanjiVG): panel chi tiết chữ Hán / bộ thủ / kana (tự phát 1 lần), bảng vẽ tay ("Xem cách viết đúng"),
  phiếu Luyện viết. **Không** có ở mặt sau flashcard (đã bỏ; mặt sau giữ cỡ khung như mặt trước). Chạm khung để vẽ lại.
  Reduced motion: không tự phát.
- Câu ví dụ trong chi tiết từ vựng: Tatoeba (dịch Việt / Anh, nghe, nguồn), "Ví dụ khác", lưu câu vào sổ tay;
  fallback AI tạo câu khi có key.
- Luyện kana: bảng chữ, flashcard (dùng chung `FlashcardSession` với `grader` ghi mức thuộc kana), gõ romaji,
  trắc nghiệm, nghe.
- Sổ tay (nhiều sổ, màu; nhấn giữ nút đánh dấu để lưu nhanh). Tìm kiếm toàn cục (phím `/`), vẽ tay tìm kanji.
- "Hỏi AI": trang `/ai` + khung chat nổi ở mọi trang (`AiDock`, tab lề phải kéo được, Back/Esc thu gọn, chip
  "Hỏi về …" theo mục đang xem). Chế độ: tra từ, ngữ pháp, hội thoại, sửa câu.
  Desktop: khung 400×600, chuyển trang vẫn mở. Tab dính mép phải không được đè nội dung: main có lề phải ≥ 40px từ md
  (`md:pr-10`, `lg:px-10`), drawer chi tiết desktop chừa dải 40px không cuộn bên phải (`pr-10`, vùng cuộn bên trong) cho tab.
  Panel cạnh lưới desktop (Chữ Hán, Cách đếm): Esc bỏ mục đang xem (`useEscapeClose`, nhường sheet / khung AI / ô nhập). Điện thoại (`DOCK_PHONE`: < 768px hoặc màn cảm ứng): sheet gần toàn
  màn hình + lớp nền (chạm thì lắc, không đóng), khóa cuộn, bám bàn phím qua `visualViewport` (ẩn bottom nav),
  bấm bottom nav/header thì thu gọn + chuyển trang (replace mục lịch sử của khung), vuốt header sang phải để thu gọn.
  Chữ gõ dở / vị trí cuộn giữ trong `dockMemory`. Test: `tests/dock.mobile.spec.ts` (chạy cả dev và bản build).
- Trang chủ (xem "Điều hướng và trang chủ"): chữ Hán ngẫu nhiên (không lặp 5 chữ gần nhất; 2 từ đi kèm, thiếu thì tra
  thêm Mazii khi có mạng; con số "x từ" và danh sách cùng một nguồn `mergeKanjiWords`), Ôn tập hôm nay, Học tiếp, lối tắt.
- Cách đếm (助数詞): 49 trợ số từ có bảng + 58 trợ số từ khác, flashcard, quiz, thẻ ôn cho ô hay sai / bất quy tắc.
- PWA (cài đặt, cập nhật, offline), Xuất/Nhập tiến độ, mã mở khóa 4 số (nếu build có `VITE_UNLOCK_CODE`).

## Lỗi đã gặp, không lặp lại

- Lặp basename khi `navigate()` với `window.location` (xem Quy tắc).
- `AnimatePresence initial={false}` ở Layout truyền xuống cả cây con, chặn hiệu ứng mount của trang đầu tiên.
- **Không dùng `AnimatePresence mode="wait"` (exit, giữ trang cũ bằng FrozenOutlet) cho chuyển trang.** Trang đang thoát
  vẫn chạy hook (`useSearchParams`…) và hiệu ứng thoát lồng nhau; chỉ cần một cái không hoàn tất là trang mới không
  bao giờ mount → vùng main trắng (sidebar vẫn còn, URL đã đổi). Layout giờ render `<Outlet />` trong `motion.div key={pathname}`
  chỉ có hiệu ứng vào (opacity/y ~200ms). Vị trí cuộn do `useScrollRestore` (gắn ở Layout) lo cho mọi trang (xem "Giữ vị trí cuộn").
  Vùng main bọc `MainErrorBoundary` + route `errorElement` (`src/components/ErrorPanel.tsx`: có lỗi + nút "Thử lại" / "Tải lại",
  không bao giờ để trống).
- **Trang đang rời đi không được ghi URL.** Mọi `setParams` / `navigate(-n)` của trang riêng (`/kanji`, `useDetailStack`)
  đi qua `useOwnPage()` (`src/hooks/useOwnPage.ts`): chỉ ghi khi còn mount và `router.state.location.pathname` còn là trang
  lúc mount; cleanup khi unmount không được gọi `navigate` / `setParams`. Cả hai vế so sánh phải lấy từ `router.state` (có
  basename), không trộn với `useLocation()` (đã bỏ basename) → trộn thì luôn lệch ở bản production, dev (base `/`) không thấy.
  Test: `tests/preview/page-transition.spec.ts` (bản build, desktop + Pixel 7: chọn chữ/bộ thủ/từ rồi chuyển trang, bấm nhanh
  hai mục; main phải có nội dung, URL chỉ đổi đúng 1 lần mỗi lần bấm).
- Phím tắt toàn trang phải bỏ qua khi focus ở button/a/input/textarea/select (`isInteractiveTarget`).
- `GridCell`: cỡ chữ theo container (`cqw`), không theo viewport.
- React Router cập nhật `location` trong transition: khi một component lười đang tải, `useLocation()` có thể
  chưa thấy mục lịch sử vừa đẩy → bắt Back bằng `popstate` và đọc `history.state`.
- `useNavigationType()` giữ `POP` sau khi lùi; lần tải trang đầu cũng là `POP` → đừng coi đó là bấm Back.
- Nén path thứ tự nét bằng regex làm tròn rồi ghép số: "14.62-0.02" → "14.60" (mất dấu trừ = mất dấu ngăn cách),
  986/1795 chữ hỏng (事 mất nét sổ). Xem quy tắc nén path ở mục Dữ liệu.
- Bộ thủ từng đánh số theo thứ tự dòng Excel (lệch số Khang Hy từ bộ 10, chữ thuộc bộ sai) → luôn dùng số Khang Hy.
- Bấm nút chấm flashcard bằng chuột giữ focus trên nút → Space bấm lại nút thay vì lật thẻ (nút dùng `onMouseDown preventDefault`).
- Font subset bằng HarfBuzz có glyph độ dài lẻ; subset của @pdf-lib/fontkit chép nguyên byte rồi ghi `loca` dạng ngắn
  (offset/2) → mất chữ trong PDF (ガ, キ, ひ… trống). `build-pdf-fonts.mjs` đệm glyph thành bội số 4 byte (`padGlyphs`),
  `fonts.test.ts` kiểm tra. Xem kết quả PDF bằng ảnh render, đừng chỉ trích text (text vẫn đúng dù glyph trống).
- StrictMode chạy effect hai lần ở dev: việc gửi/tự động gửi hoãn một nhịp (`setTimeout 0`) và dọn trong cleanup.

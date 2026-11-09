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
| `npm run lint` | oxlint |
| `npm test` | Vitest (`src/**/*.test.ts`) |
| `npm run test:e2e` | Playwright trên dev server: project `desktop`, `iphone` (WebKit), `android` |
| `npm run test:e2e:preview` | Playwright trên bản build (cần `npm run build` trước), base production |
| `npm run check:secrets` | Quét repo + `dist/` tìm chuỗi giống API key |
| `npm run icons` | Sinh icon PWA trong `public/icons/` |
| `python scripts/convert_xlsx.py <file.xlsx> public/data` | Sinh lại dữ liệu từ Excel (cần `openpyxl`) |
| `python scripts/convert_xlsx.py --check` | Kiểm tra ngữ pháp tự soạn, không cần Excel |

- Windows: lệnh `python` có thể không có, dùng `py`. Lần đầu e2e: `npx playwright install chromium webkit`.
- E2E đầy đủ nặng: máy này nên chạy `--workers=4` (8 worker bị timeout ngẫu nhiên).
- Mã mở khóa: `VITE_UNLOCK_CODE=1234 npm run build` (4 số; bundle chỉ chứa SHA-256). Không đặt thì không hỏi mã.

## Cấu trúc

- `src/pages/` – mỗi route một file, tải lười (khai báo trong `src/main.tsx`).
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
- ID = tiền tố + 8 ký tự SHA-1 của chữ + cách đọc (`n5-1a2b3c4d`, `kj-…`, `gn4-…`): ổn định, là **khóa của SRS,
  sổ tay, URL** → không đổi cách sinh ID.
- `kanji.json`: `firstLevel` = cấp từ vựng đầu tiên có chữ đó, **không phải** cấp kanji JLPT.
- `radicals.json`: đúng **214 bộ, `no` = số Khang Hy** (khối Unicode U+2F00–U+2FD5, NFKC), có `strokes`, `variants`
  (亻 của 人, 阝 ấp = 163 / 阝 phụ = 170 theo tên). Bộ thiếu trong Excel lấy từ `data-source/radicals-extra.json`
  (`auto: true`). `src/data/radical-kanji.json` (Unihan) cũng theo số Khang Hy. Script ghi
  `src/data/radical-id-migration.json` (số cũ theo dòng Excel → số mới); `src/lib/migrations.ts` đổi id `rd-NNN`
  trong SRS + sổ tay một lần mỗi máy (import đầu tiên trong `main.tsx`) và khi nhập file tiến độ cũ (không có
  `radicalIds: 'kangxi'`). Đổi lại cách đánh số bộ thủ thì phải thêm migration mới.

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
- **Dữ liệu người dùng** (localStorage, `jla:v1:*`): `cards` (SRS), `lesson-size`, `kana`, `notebooks`,
  `grammar-checked`, `ai-words` → **có** trong Xuất/Nhập tiến độ (`src/lib/backup.ts`).
  `ai-chats` (tối đa 10 cuộc, cuộc ghim không bị xóa), `ai-settings`, `ai-dock`, `jla:theme` hiện **chưa** có
  trong file xuất. Thêm loại dữ liệu học mới thì thêm vào `backup.ts` (kèm sanitize + test).
- **Mỗi lần xong việc:** lint, build, test (unit + e2e liên quan), commit, push, kiểm tra workflow deploy xanh
  (không có `gh`: dùng `curl https://api.github.com/repos/cuong5401/JapaneseLearnApp/actions/runs`), rồi báo cáo:
  đã thay đổi gì, kết quả test, ảnh chụp (đường dẫn), điều người dùng cần tự làm.
- CI (`.github/workflows/deploy.yml`, push `main`): `npm ci` → lint → test → build (secret `VITE_UNLOCK_CODE`) →
  check:secrets → kiểm tra dist → e2e preview → deploy Pages. Bước nào lỗi thì không deploy.

## Không layout shift (bắt buộc)

- `html { scrollbar-gutter: stable }`: trang dài/ngắn, khóa cuộn không làm lệch ngang.
- Trang bài học (từ vựng, kanji, bộ thủ, sổ tay) dùng `LESSON_PAGE` (`w-full` + max-width cố định) chung cho cả
  3 tab; vùng nội dung tab `TAB_AREA` (min-height = vùng flashcard) — `src/components/StudyLayout.tsx`.
- Trang Chữ Hán / Bộ thủ desktop (`WIDE_PANEL`): lưới `minmax(0,1fr)_360px`, panel 360px **luôn** giữ chỗ (chưa chọn
  thì "Chọn một chữ để xem chi tiết"), nội dung dài xuống dòng/cuộn trong panel.
- Danh sách đã biết trước số lượng (`words.length`, `wordCount`, số chữ của bộ): render ngay đúng số hàng skeleton
  (`SkeletonRows`, `DetailSkeleton` trong `LoadState.tsx`) cao bằng hàng thật, khối tối thiểu 2 hàng; nhãn chờ dữ liệu
  giữ chiều cao dòng. Không dùng `PageSkeleton` chung chung trong panel.
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
- Nút ≥ 44px (`min-h-11`). Tôn trọng reduced motion (`MotionConfig reducedMotion="user"`).
- Mobile trước: < 768px có bottom nav (6 mục), < 1024px có header; ≥ 1024px có sidebar.
- iPhone Safari: input/textarea/select ≥ 16px trên màn cảm ứng (`pointer-coarse:text-base`), không khóa zoom
  trong viewport; `touch-action: manipulation`; `overscroll-behavior: none` (html/body), vùng cuộn trong dùng
  `overscroll-contain`; bàn phím ảo xử lý bằng `visualViewport` (xem `AiDock`).
  Khóa cuộn trang: khung Hỏi AI dùng `lockScroll()` (`src/lib/scrollLock.ts`: body `position: fixed; top: -scrollY`,
  vì iOS bỏ qua `overflow: hidden`); BottomSheet và tìm kiếm vẫn dùng `body.style.overflow = 'hidden'`.

## Tính năng hiện có

- Từ vựng N5–N1, từ ghép, từ láy, phó từ, thuật ngữ chuyên ngành: chia bài (cỡ bài tùy chọn), flashcard vuốt,
  quiz, đánh dấu đã học.
- Ôn tập SRS (thẻ đến hạn, trang Tiến độ).
- Chữ Hán: chia bài theo cấp xuất hiện, flashcard, quiz âm Hán Việt, chi tiết dạng ngăn xếp theo URL
  (`?k=` chữ gốc, `?xem=w:…~k:…~r:…`; desktop là panel/drawer, điện thoại là bottom sheet). Bộ thủ + chữ thuộc bộ.
- Ngữ pháp N5–N1 (N5/N3 có mẫu tự soạn), lọc nhóm, đánh dấu đã kiểm tra.
- Luyện kana: bảng chữ, flashcard (dùng chung `FlashcardSession` với `grader` ghi mức thuộc kana), gõ romaji,
  trắc nghiệm, nghe.
- Sổ tay (nhiều sổ, màu; nhấn giữ nút đánh dấu để lưu nhanh). Tìm kiếm toàn cục (phím `/`), vẽ tay tìm kanji.
- "Hỏi AI": trang `/ai` + khung chat nổi ở mọi trang (`AiDock`, tab lề phải kéo được, Back/Esc thu gọn, chip
  "Hỏi về …" theo mục đang xem). Chế độ: tra từ, ngữ pháp, hội thoại, sửa câu.
  Desktop: khung 400×600, chuyển trang vẫn mở. Điện thoại (`DOCK_PHONE`: < 768px hoặc màn cảm ứng): sheet gần toàn
  màn hình + lớp nền (chạm thì lắc, không đóng), khóa cuộn, bám bàn phím qua `visualViewport` (ẩn bottom nav),
  bấm bottom nav/header thì thu gọn + chuyển trang (replace mục lịch sử của khung), vuốt header sang phải để thu gọn.
  Chữ gõ dở / vị trí cuộn giữ trong `dockMemory`. Test: `tests/dock.mobile.spec.ts` (chạy cả dev và bản build).
- Trang chủ: chữ Hán ngẫu nhiên (không lặp 5 chữ gần nhất; từ đi kèm thiếu thì tra thêm Mazii khi có mạng; con số
  "x từ" và danh sách cùng một nguồn `mergeKanjiWords`), thẻ "cần ôn" có biểu đồ 7 ngày tới + 3 bài tiếp theo.
- PWA (cài đặt, cập nhật, offline), Xuất/Nhập tiến độ, mã mở khóa 4 số (nếu build có `VITE_UNLOCK_CODE`).

## Lỗi đã gặp, không lặp lại

- Lặp basename khi `navigate()` với `window.location` (xem Quy tắc).
- `AnimatePresence initial={false}` ở Layout truyền xuống cả cây con, chặn hiệu ứng mount của trang đầu tiên.
- Phím tắt toàn trang phải bỏ qua khi focus ở button/a/input/textarea/select (`isInteractiveTarget`).
- `GridCell`: cỡ chữ theo container (`cqw`), không theo viewport.
- React Router cập nhật `location` trong transition: khi một component lười đang tải, `useLocation()` có thể
  chưa thấy mục lịch sử vừa đẩy → bắt Back bằng `popstate` và đọc `history.state`.
- `useNavigationType()` giữ `POP` sau khi lùi; lần tải trang đầu cũng là `POP` → đừng coi đó là bấm Back.
- Bộ thủ từng đánh số theo thứ tự dòng Excel (lệch số Khang Hy từ bộ 10, chữ thuộc bộ sai) → luôn dùng số Khang Hy.
- Bấm nút chấm flashcard bằng chuột giữ focus trên nút → Space bấm lại nút thay vì lật thẻ (nút dùng `onMouseDown preventDefault`).
- StrictMode chạy effect hai lần ở dev: việc gửi/tự động gửi hoãn một nhịp (`setTimeout 0`) và dọn trong cleanup.

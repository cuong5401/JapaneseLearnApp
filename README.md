# Kotonoha: học tiếng Nhật

Web app học tiếng Nhật cho người Việt: kana, từ vựng và chữ Hán từ N5 đến N1, thuật ngữ chuyên ngành (IT, điện tử, văn phòng), quiz và ôn tập ngắt quãng.

**Bản web:** https://cuong5401.github.io/JapaneseLearnApp/ (cài được như app trên điện thoại).

## Web dùng cá nhân

Bản trên GitHub Pages là bản đầy đủ (có ngữ pháp N4–N1), dùng cho cá nhân:
- **Không cho công cụ tìm kiếm lập chỉ mục:** thẻ `<meta name="robots" content="noindex, nofollow">` trong `index.html` và `public/robots.txt`.
- **Mã mở khóa 4 số:** lần đầu mở trên một máy phải nhập mã; đúng thì lưu trong localStorage, không hỏi lại. Mã lấy từ secret `VITE_UNLOCK_CODE` lúc build; bundle chỉ chứa mã băm SHA-256, không chứa con số. Không đặt secret thì không có màn nhập mã. Đây là rào chắn người lạ, không phải bảo mật thật: file trong `data/` vẫn tải trực tiếp được, và mã 4 số có thể thử dần.

`npm run build:public` (hoặc `VITE_PUBLIC_BUILD=true`) vẫn có để build bản không kèm ngữ pháp N4–N1 khi cần, nhưng workflow deploy không dùng.

## Chạy dự án

```bash
npm install
npm run dev           # bản đầy đủ: http://localhost:5173
npm run build         # build bản đầy đủ vào dist/ (base /JapaneseLearnApp/)
npm run build:public  # bản không kèm ngữ pháp N4–N1 (không dùng khi deploy)
npm run preview       # xem bản đã build: http://localhost:4173/JapaneseLearnApp/
# Thử màn nhập mã ở máy: VITE_UNLOCK_CODE=1234 npm run build && npm run preview
npm run lint
npm run test:e2e # Playwright: chữ không tràn ô GridCell, không cuộn ngang ở 390–1440px
```

## Deploy

- Mỗi lần push lên `main`, workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) chạy `npm ci → lint → test → build` (bản đầy đủ, mã mở khóa từ secret `VITE_UNLOCK_CODE`), kiểm tra dist có đủ ngữ pháp, `robots.txt`, `404.html`, rồi đưa lên GitHub Pages. Lint hoặc test lỗi thì không deploy.
- Cài đặt một lần trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- Mã mở khóa: **Settings → Secrets and variables → Actions → New repository secret**, tên `VITE_UNLOCK_CODE`, giá trị 4 chữ số; sau đó chạy lại workflow.
- Chạy lại thủ công: tab **Actions → Deploy GitHub Pages → Run workflow**.
- Build dùng `base = /JapaneseLearnApp/`; router và mọi đường dẫn dữ liệu đi theo `import.meta.env.BASE_URL`. `dist/404.html` là bản sao của `index.html`, nên F5 ở trang con không bị 404.

## App trên điện thoại (PWA)

- Android/Chrome/Edge: nút **Cài app** ở cuối sidebar (máy tính) hoặc trang **Tiến độ**.
- iPhone/iPad: mở bằng Safari → nút Chia sẻ → **Thêm vào MH chính**.
- Vỏ app được lưu sẵn; dữ liệu bài học được lưu khi mở, nên **học offline được những bài đã mở**.
- Khi có bản mới, app hiện "Có bản cập nhật" kèm nút **Tải lại**.
- Icon trong `public/icons/` sinh từ thiết kế favicon bằng `npm run icons`.

## Chuyển tiến độ giữa các máy

Tiến độ lưu trong localStorage của từng trình duyệt. Ở trang **Tiến độ**:
- **Xuất tiến độ**: tải file `kotonoha-tien-do-YYYY-MM-DD.json`.
- **Nhập tiến độ**: chọn file đó ở máy khác. Hai bên được gộp, mỗi thẻ giữ bản ôn gần nhất.

Đồng bộ tự động (Supabase) để giai đoạn sau.

## Công nghệ

- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, dark mode theo class `.dark`)
- React Router
- [wanakana](https://github.com/WaniKani/WanaKana) để chuyển romaji ↔ kana khi chấm đáp án
- Web Speech API (`ja-JP`) để đọc phát âm
- Tiến độ lưu trong `localStorage` (sẽ chuyển sang Supabase ở giai đoạn sau)
- vite-plugin-pwa (Workbox) cho service worker và manifest

## Chức năng

| Trang | Đường dẫn |
|---|---|
| Trang chủ: chữ Hán hôm nay, thẻ cần ôn, các bộ từ, chữ Hán, ngữ pháp, thuật ngữ | `/` |
| Bộ từ (N5–N1, Từ ghép, Từ láy, Phó từ): lưới bài, "Học tiếp", Từ chưa thuộc, đổi 20/30/50 từ mỗi bài | `/vocab/n5` |
| Bài học: Danh sách, Flashcard (vuốt để chấm), Quiz | `/vocab/n5/1`, `/vocab/n5/weak` |
| Chi tiết từ: Hán Việt, cách viết khác, từ gốc, ghi chú, từ liên quan (N1), chữ Hán trong từ | `/word/:id` |
| Ngăn xếp chi tiết: bấm từ / chữ Hán / bộ thủ ở bất kỳ đâu (chi tiết chữ Hán, kết quả tìm kiếm, từ liên quan, sổ tay) mở trong panel hoặc bottom sheet, có "← 日" để quay lại; lưu trong URL nên F5 và nút Back hoạt động đúng | `?k=日&xem=w:…~k:…` |
| Chữ Hán chia bài 20/30/50 (lọc theo cấp xuất hiện), mỗi bài: Danh sách, Flashcard (âm Hán Việt + từ tiêu biểu), Quiz âm Hán Việt; thẻ SRS kanji | `/kanji?level=N5&bai=2&mode=flashcards` |
| Bộ thủ chia bài theo số bộ: Danh sách, Flashcard (tên, nghĩa, chữ thuộc bộ), Quiz chọn tên; thẻ SRS `rd-001…` | `/kanji?tab=radicals&bai=1` |
| Sổ tay: nút đánh dấu trên thẻ, dòng từ, chi tiết từ/chữ/bộ, ngữ pháp; lưu vào nhiều sổ, nhấn giữ để lưu nhanh; mỗi sổ chia bài, Flashcard, Quiz, thêm cả sổ vào lịch ôn | `/notebooks`, `/notebooks/:id` |
| Ngữ pháp N5–N1 (N4 nhóm theo bài 26–50; N3, N5 lọc theo nhóm chủ đề `?nhom=`), chi tiết mẫu, "Đã hiểu" đưa vào lịch ôn; mẫu Kotonoha tự soạn có nhãn "chưa kiểm tra" đến khi bấm "Đã kiểm tra" | `/grammar/n3`, `/grammar/n3/:id` |
| Tìm kiếm (phím `/`): chữ Nhật, kana, romaji, Hán Việt, nghĩa tiếng Việt không dấu | hộp tìm kiếm |
| Ôn tập SRS cho từ vựng, chữ Hán, ngữ pháp | `/review` |
| Thuật ngữ IT, điện tử, văn phòng | `/terms/it` |
| Luyện kana: bảng 50 âm, âm đục, âm ghép (Hiragana/Katakana), chọn hàng để luyện, chữ yếu, ôn ngẫu nhiên; phiên có đầu có cuối (gõ romaji, trắc nghiệm, ngược lại, nghe, trộn), câu sai hỏi lại sau 3–5 câu; mức thuộc từng chữ | `/kana` |
| Tiến độ: từ vựng, kanji, ngữ pháp, kana; xuất/nhập tiến độ | `/progress` |

## Dữ liệu

- Dữ liệu học nằm trong `public/data/` (xem [DATA-README.md](DATA-README.md)), sinh từ Excel bằng `scripts/convert_xlsx.py`. **Không sửa tay** các file này; file Excel nguồn (`data-source/*.xlsx`) không đưa lên git.
- Dữ liệu được `fetch` khi cần (`src/lib/dataStore.ts`), cache theo đường dẫn + `hash` trong manifest, không đóng gói vào bundle.
- Ngữ pháp tự soạn: `data-source/grammar-extra/n3.json`, `n5.json` (có trong git, cùng kiểu `GrammarEntry` thêm `group`, `notes`, `related`, `"source": "kotonoha"`, `"auto": true`). Giải thích và câu ví dụ do Kotonoha tự viết, chưa qua người kiểm tra. `scripts/convert_xlsx.py` gộp vào `public/data/grammar/`: mục từ Excel trước, mục tự soạn sau; mẫu đã có trong Excel thì báo lỗi (dùng `related: ["#số chương"]` để trỏ tới). Kiểm tra nhanh không cần Excel: `python scripts/convert_xlsx.py --check`.
- Sheet N3 trong Excel mất tiêu đề phần lớn chương; `data-source/grammar-extra/n3-chapters.json` ghi điểm cắt, tiêu đề và nhóm chủ đề cho 55 chương. Script dừng nếu một id ngữ pháp cũ biến mất (để không mất tiến độ).
- Hook: `useManifest`, `useVocab`, `useKanjiIndex`, `useRadicals`, `useGrammar`, `useEntries(ids)` (`src/hooks/useData.ts`).
- Tiến độ SRS lưu theo `id` trong localStorage; thẻ có ID không còn tồn tại được bỏ qua.
- Thuật ngữ chuyên ngành nhỏ vẫn đóng gói sẵn trong `src/data/terms/`.
- Chữ Hán thuộc từng bộ thủ: `src/data/radical-kanji.json`, sinh bằng `node scripts/build-radical-kanji.mjs <Unihan_IRGSources.txt>` từ trường `kRSUnicode` của [Unicode Unihan](https://www.unicode.org/charts/unihan.html) (© Unicode, Inc., [Unicode License](https://www.unicode.org/license.txt)). Mỗi chữ thuộc đúng một bộ chính.
- Sổ tay chỉ lưu id mục (localStorage `jla:v1:notebooks`) và có trong Xuất / Nhập tiến độ.

## Kiểm tra

```bash
npm test          # Vitest: dataStore, chia bài, tìm kiếm, xuất/nhập tiến độ, phiên luyện kana
npm run test:e2e  # Playwright: bố cục 390–1440px, chữ không tràn ô GridCell, luyện kana
```

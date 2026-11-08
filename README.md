# Kotonoha: học tiếng Nhật

Web app học tiếng Nhật cho người Việt: kana, từ vựng và chữ Hán từ N5 đến N1, thuật ngữ chuyên ngành (IT, điện tử, văn phòng), quiz và ôn tập ngắt quãng.

**Bản web:** https://cuong5401.github.io/JapaneseLearnApp/ (cài được như app trên điện thoại).

## Bản public và bản cá nhân

| | Bản public (GitHub Pages) | Bản cá nhân (chạy ở máy) |
|---|---|---|
| Từ vựng, chữ Hán, bộ thủ, thuật ngữ, kana | Có | Có |
| Ngữ pháp N4–N1 (soạn từ giáo trình) | Không, mục Ngữ pháp hiện "Phần ngữ pháp chỉ có trong bản cá nhân" | Có |
| Lệnh | `npm run build:public` hoặc `VITE_PUBLIC_BUILD=true npm run build` | `npm run dev`, `npm run build` |

Bản public bỏ `dist/data/grammar/n4–n1.json` sau khi build và sửa `dist/data/manifest.json` cho khớp (plugin `kotonohaDist` trong `vite.config.ts`). Các file ngữ pháp vẫn nằm trong `public/data` của repo.

## Chạy dự án

```bash
npm install
npm run dev           # bản đầy đủ: http://localhost:5173
npm run build         # build bản đầy đủ vào dist/ (base /JapaneseLearnApp/)
npm run build:public  # build bản public như trên GitHub Pages
npm run preview       # xem bản đã build: http://localhost:4173/JapaneseLearnApp/
npm run lint
npm run test:e2e # Playwright: chữ không tràn ô GridCell, không cuộn ngang ở 390–1440px
```

## Deploy

- Mỗi lần push lên `main`, workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) chạy `npm ci → lint → test → build` (với `VITE_PUBLIC_BUILD=true`), kiểm tra dist không còn ngữ pháp N4–N1, rồi đưa lên GitHub Pages. Lint hoặc test lỗi thì không deploy.
- Cài đặt một lần trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
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
| Chữ Hán (lọc theo cấp xuất hiện), Bộ thủ, Quiz âm Hán Việt | `/kanji`, `/kanji?tab=radicals` |
| Ngữ pháp N4–N1 (N4 nhóm theo bài 26–50), chi tiết mẫu, "Đã hiểu" đưa vào lịch ôn | `/grammar/n2`, `/grammar/n2/:id` |
| Tìm kiếm (phím `/`): chữ Nhật, kana, romaji, Hán Việt, nghĩa tiếng Việt không dấu | hộp tìm kiếm |
| Ôn tập SRS cho từ vựng, chữ Hán, ngữ pháp | `/review` |
| Thuật ngữ IT, điện tử, văn phòng | `/terms/it` |
| Luyện kana: bảng 50 âm, âm đục, âm ghép (Hiragana/Katakana), chọn hàng để luyện, chữ yếu, ôn ngẫu nhiên; phiên có đầu có cuối (gõ romaji, trắc nghiệm, ngược lại, nghe, trộn), câu sai hỏi lại sau 3–5 câu; mức thuộc từng chữ | `/kana` |
| Tiến độ: từ vựng, kanji, ngữ pháp, kana; xuất/nhập tiến độ | `/progress` |

## Dữ liệu

- Dữ liệu học nằm trong `public/data/` (xem [DATA-README.md](DATA-README.md)), sinh từ Excel bằng `scripts/convert_xlsx.py`. **Không sửa tay** các file này; file Excel nguồn (`data-source/*.xlsx`) không đưa lên git.
- Dữ liệu được `fetch` khi cần (`src/lib/dataStore.ts`), cache theo đường dẫn + `hash` trong manifest, không đóng gói vào bundle.
- Hook: `useManifest`, `useVocab`, `useKanjiIndex`, `useRadicals`, `useGrammar`, `useEntries(ids)` (`src/hooks/useData.ts`).
- Tiến độ SRS lưu theo `id` trong localStorage; thẻ có ID không còn tồn tại được bỏ qua.
- Thuật ngữ chuyên ngành nhỏ vẫn đóng gói sẵn trong `src/data/terms/`.

## Kiểm tra

```bash
npm test          # Vitest: dataStore, chia bài, tìm kiếm, xuất/nhập tiến độ, phiên luyện kana
npm run test:e2e  # Playwright: bố cục 390–1440px, chữ không tràn ô GridCell, luyện kana
```

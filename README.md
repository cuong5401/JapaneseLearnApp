# Kotonoha: học tiếng Nhật

Web app học tiếng Nhật cho người Việt: kana, từ vựng và chữ Hán từ N5 đến N1, thuật ngữ chuyên ngành (IT, điện tử, văn phòng), quiz và ôn tập ngắt quãng.

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # kiểm tra kiểu + build production
npm run lint
npm run test:e2e # Playwright: chữ không tràn ô GridCell, không cuộn ngang ở 390–1440px
```

## Công nghệ

- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, dark mode theo class `.dark`)
- React Router
- [wanakana](https://github.com/WaniKani/WanaKana) để chuyển romaji ↔ kana khi chấm đáp án
- Web Speech API (`ja-JP`) để đọc phát âm
- Tiến độ lưu trong `localStorage` (sẽ chuyển sang Supabase ở giai đoạn sau)

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
| Luyện kana, Tiến độ | `/kana`, `/progress` |

## Dữ liệu

- Dữ liệu học nằm trong `public/data/` (xem [DATA-README.md](DATA-README.md)), sinh từ Excel bằng `scripts/convert_xlsx.py`. **Không sửa tay** các file này; file Excel nguồn (`data-source/*.xlsx`) không đưa lên git.
- Dữ liệu được `fetch` khi cần (`src/lib/dataStore.ts`), cache theo đường dẫn + `hash` trong manifest, không đóng gói vào bundle.
- Hook: `useManifest`, `useVocab`, `useKanjiIndex`, `useRadicals`, `useGrammar`, `useEntries(ids)` (`src/hooks/useData.ts`).
- Tiến độ SRS lưu theo `id` trong localStorage; thẻ có ID không còn tồn tại được bỏ qua.
- Thuật ngữ chuyên ngành nhỏ vẫn đóng gói sẵn trong `src/data/terms/`.

## Kiểm tra

```bash
npm test          # Vitest: dataStore, chia bài, tìm kiếm
npm run test:e2e  # Playwright: bố cục 390–1440px, chữ không tràn ô GridCell
```

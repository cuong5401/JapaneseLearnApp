# Dữ liệu Kotonoha

Sinh từ file Excel `TU-VUNG-NGU-PHAP-N5-1.xlsx` bằng `scripts/convert_xlsx.py`.

## Chép vào dự án

```
public/data/          ← toàn bộ thư mục data/ (JSON + manifest + báo cáo)
scripts/convert_xlsx.py
src/types/data.ts
```

Để trong `public/` nên Vite không đóng gói vào bundle: trang nào cần thì `fetch('/data/vocab/n5.json')`, tải lần đầu xong trình duyệt tự cache.

## Các file

| File | Nội dung |
|---|---|
| `manifest.json` | Danh sách file, số mục, dung lượng, `hash` (đổi khi nội dung đổi) |
| `vocab/n5.json` … `n1.json` | Từ vựng theo cấp, giữ đúng thứ tự trong Excel |
| `vocab/compounds.json` | Từ ghép (sheet "từ ghép n23") |
| `vocab/onomatopoeia.json` | Từ láy |
| `vocab/adverbs.json` | Phó từ (sheet "Trợ từ") |
| `kanji/kanji.json` | Chỉ mục chữ Hán: âm Hán Việt + các từ chứa chữ đó |
| `kanji/radicals.json` | Bộ thủ |
| `grammar/n4.json` … `n1.json` | Ngữ pháp (N4 theo bài 26–50) |
| `import-report.md` | Dòng bị bỏ, trùng, thiếu cách đọc… để rà lại Excel |

Kiểu dữ liệu chi tiết: `src/types/data.ts`.

## Cập nhật khi sửa Excel

```
pip install openpyxl
python scripts/convert_xlsx.py data-source/TU-VUNG-NGU-PHAP.xlsx public/data
```

ID tính từ chữ + cách đọc, nên chạy lại không làm mất tiến độ SRS (trừ khi bạn sửa chính chữ hoặc cách đọc của từ đó).

## Lưu ở trình duyệt

- **Dữ liệu từ vựng / ngữ pháp**: không cần lưu vào localStorage (giới hạn ~5 MB, đọc ghi chậm với chuỗi lớn). Cứ `fetch` file JSON; muốn dùng offline thì cache bằng Service Worker (PWA) hoặc IndexedDB, dùng `hash` trong manifest để biết khi nào cần tải lại.
- **localStorage** chỉ nên giữ thứ nhỏ: tiến độ SRS (theo `id`), cài đặt, bài đang học dở.

## Lưu ý về dữ liệu

- `kanji.json` → `firstLevel` là cấp từ vựng đầu tiên trong file của bạn có chữ đó, **không phải** cấp kanji JLPT chính thức.
- N1 không có cột Hán Việt; 805 từ N1 thiếu cách đọc (thường là cụm từ). Xem `import-report.md`.
- Ngữ pháp được tách tự động từ văn bản chép từ PDF: `title`, `meaning`, `examples` có thể sót; `body` luôn giữ toàn bộ nội dung để hiển thị.
- Sheet "ngữ pháp n5" trống nên `grammar/n5.json` rỗng.

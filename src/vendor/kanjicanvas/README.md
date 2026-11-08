# KanjiCanvas (vendor)

Nhận dạng chữ Hán viết tay, từ [KanjiCanvas](https://github.com/asdfjkl/kanjicanvas). Copyright (c) 2019 Dominik Klein, Kanji Canvas. MIT License, xem [LICENSE.TXT](LICENSE.TXT).

| File | Nguồn |
|---|---|
| `kanji-canvas.js` | `docs/resources/javascript/kanji-canvas.js`, commit `a9214105f156def3b96930e5fcf10b7652b7a1f7`, chép nguyên (chỉ thêm comment nguồn ở đầu) |
| `ref-patterns.js` | `docs/resources/javascript/ref-patterns.js` cùng commit, **đã rút gọn**: tọa độ làm tròn 1 chữ số thập phân, bỏ khối test vector. Bản gốc 6,7 MB còn 2,1 MB (gzip ~0,7 MB); top 10 ứng viên trùng khớp với bản gốc trên các bộ nét thử. Sinh lại bằng `node scripts/compact-ref-patterns.mjs <ref-patterns.js gốc>` |
| `LICENSE.TXT` | `LICENSE.TXT` của repo |

Kotonoha chỉ dùng phần so khớp của thư viện (xem `src/lib/handwriting/recognize.ts`), không dùng canvas và listener của nó. Hai file chỉ được tải trong Web Worker khi mở bảng vẽ, không nằm trong bundle chính và không được precache.

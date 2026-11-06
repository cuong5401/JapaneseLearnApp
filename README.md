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
| Trang chủ: chữ Hán hôm nay, số thẻ cần ôn, các cấp độ, thuật ngữ | `/` |
| Luyện kana (hiragana/katakana, âm cơ bản, âm đục, âm ghép), gõ romaji | `/kana` |
| Tổng quan một cấp độ hoặc một nhóm thuật ngữ | `/level/N5`, `/terms/it` |
| Flashcard từ vựng | `/level/N5/flashcards`, `/terms/it/flashcards` |
| Chữ Hán: âm On/Kun, Hán Việt, từ ghép | `/level/N5/kanji` |
| Quiz trắc nghiệm hoặc gõ cách đọc | `/level/N5/quiz`, `/terms/it/quiz` |
| Ôn tập SRS (SM-2 rút gọn) | `/review` |
| Tiến độ theo cấp độ và nhóm thuật ngữ | `/progress` |

## Cấu trúc

```
src/
  types/index.ts         Kiểu dữ liệu: VocabItem, KanjiItem, SrsCard, Deck…
  data/
    vocab/n5.json…n1.json
    kanji/n5.json…n1.json
    terms/it.json, electronics.json, office.json
    kana.ts              Bảng kana (katakana + romaji sinh tự động)
    index.ts             Registry: getVocab, getKanji, getTerms, ENTRY_BY_ID
  lib/
    srs.ts               Thuật toán SM-2 rút gọn
    storage.ts           Interface ProgressStore + bản localStorage
    progress.ts          Kho tiến độ dùng chung (useSyncExternalStore)
    answer.ts            Chuẩn hóa và so khớp đáp án romaji/kana
    speech.ts            Phát âm qua Web Speech API
  hooks/                 useProgress, useTheme, useDeck
  components/            Layout, GridCell, SpeakButton, ProgressBar, PageHeader
  pages/                 Home, Kana, DeckHub, Flashcards, Kanji, Quiz, Review, Progress
```

## Thêm dữ liệu

1. Thêm mục vào file JSON tương ứng trong `src/data/`, theo đúng kiểu trong `src/types/index.ts`.
2. ID phải ổn định và không trùng (`n5-v-021`, `n5-k-021`, `it-021`…), vì tiến độ SRS lưu theo ID.
3. Muốn thêm nhóm thuật ngữ mới: thêm khóa vào `TERM_CATEGORIES` (`src/types`), tạo file JSON và đăng ký trong `src/data/index.ts` (`TERMS`, `TERM_INFO`).

## Ôn tập ngắt quãng

- Đánh dấu "Đã học" trong flashcard/kanji hoặc trả lời quiz sẽ tạo thẻ ôn.
- Khi ôn: Quên (q=1), Khó (3), Nhớ (4), Dễ (5). Khoảng cách 1 → 6 → khoảng cách × hệ số dễ.
- "Đã thuộc" = khoảng cách ôn từ 21 ngày trở lên.

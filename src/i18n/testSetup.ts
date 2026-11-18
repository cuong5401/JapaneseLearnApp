// Vitest: nạp từ điển tiếng Việt đồng bộ để t() trả đúng chữ (app thật nạp lười trong main.tsx).
import { __setDictForTest, type Dict } from '.'
import vi from './vi'

__setDictForTest('vi', vi as Dict)

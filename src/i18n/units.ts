/**
 * Đơn vị đếm truyền vào chuỗi dịch dưới dạng MÃ (không phải chữ), để mỗi ngôn ngữ tự chọn từ và số nhiều:
 * "{n} {unit, select, word {từ} char {chữ} …}" (vi) · "{n, plural, one {# {unit, select, word {word} …}} other {…}}" (en).
 */
export type CountUnit = 'word' | 'char' | 'radical' | 'item' | 'card' | 'question'

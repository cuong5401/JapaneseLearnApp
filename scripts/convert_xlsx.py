#!/usr/bin/env python3
"""
Chuyển file Excel từ vựng / ngữ pháp sang các file JSON cho web Kotonoha.

Cách chạy:
    pip install openpyxl
    python scripts/convert_xlsx.py duong-dan/TU-VUNG-NGU-PHAP.xlsx public/data

Kết quả (thư mục đích):
    manifest.json             danh sách file, số mục, phiên bản
    vocab/n5.json … n1.json   từ vựng theo cấp
    vocab/compounds.json      từ ghép (sheet "từ ghép n23")
    vocab/onomatopoeia.json   từ láy
    vocab/adverbs.json        phó từ (sheet "Trợ từ")
    kanji/kanji.json          chỉ mục chữ Hán, tổng hợp từ cột Hán Việt
    kanji/radicals.json       bộ thủ
    grammar/n4.json … n1.json ngữ pháp
    import-report.md          các dòng bị bỏ / nghi lỗi để rà lại

Chạy lại bao nhiêu lần cũng được: ID tính từ nội dung (chữ + cách đọc) nên tiến độ SRS không mất.
"""
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, OrderedDict, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

# ---------------------------------------------------------------- tiện ích chung

KANA_RE = re.compile(r'^[぀-ヿー々・ー〜～\s]+$')
JP_RE = re.compile(r'[぀-ヿ㐀-鿿々]')
KANJI_RE = re.compile(r'[㐀-鿿々]')
LATIN_RE = re.compile(r'^[A-Za-z][A-Za-z\s\-\'.]*$')
SPLIT_ALT_RE = re.compile(r'\s*[、,／/・\n]\s*')
POS_MAP = {'N': 'danh từ', 'V': 'động từ', 'A': 'tính từ'}

report = defaultdict(list)  # sheet -> [dòng mô tả]


def clean(v):
    """Chuỗi sạch: bỏ khoảng trắng lạ, gộp dấu cách; số nguyên dạng 1.0 -> '1'."""
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).replace(' ', ' ').replace('　', ' ').replace('_x000c_', '')
    s = re.sub(r'[ \t]+', ' ', s).strip()
    return '' if s in ('#N/A', '#REF!', '#VALUE!') else s


def cap_first(s):
    return s[:1].upper() + s[1:] if s else s


def make_id(prefix, *parts):
    h = hashlib.sha1('|'.join(parts).encode('utf-8')).hexdigest()[:8]
    return f'{prefix}-{h}'


def split_alts(s):
    parts = [p for p in SPLIT_ALT_RE.split(s) if p]
    return parts or ['']


def rows_of(ws):
    for i, r in enumerate(ws.iter_rows(values_only=True), start=1):
        if any(clean(c) for c in r):
            yield i, r


def col(r, i):
    return clean(r[i]) if i < len(r) else ''


# ---------------------------------------------------------------- từ vựng

class VocabSheet:
    def __init__(self, key, label):
        self.key = key
        self.label = label
        self.items = OrderedDict()  # id -> item

    def add(self, sheet, rowno, word, reading, meaning, hanviet='', pos='', weak=False, note=''):
        word, reading, meaning = clean(word), clean(reading), clean(meaning)
        if not word:
            report[sheet].append(f'dòng {rowno}: bỏ, thiếu chữ (nghĩa: "{meaning}")')
            return None
        if not meaning:
            report[sheet].append(f'dòng {rowno}: "{word}" thiếu nghĩa')

        words = split_alts(word)
        # Ô chữ là kana còn ô cách đọc lại có kanji -> hai cột bị đảo
        if reading and KANJI_RE.search(reading) and not KANJI_RE.search(word):
            report[sheet].append(f'dòng {rowno}: "{word}" / "{reading}" có vẻ đảo cột, đã đổi chỗ')
            words, reading = split_alts(reading), word
        origin = ''
        if reading and LATIN_RE.match(reading):  # ví dụ シリーズ | series
            origin, reading = reading, ''
        readings = split_alts(reading) if reading else ['']
        main_word = words[0]
        main_reading = readings[0]
        if not main_reading and KANA_RE.match(main_word):
            main_reading = main_word
        if not main_reading:
            report[sheet].append(f'dòng {rowno}: "{main_word}" thiếu cách đọc')
        elif not KANA_RE.match(main_reading):
            report[sheet].append(f'dòng {rowno}: "{main_word}" cách đọc "{main_reading}" không phải kana')

        item = OrderedDict()
        item['id'] = make_id(self.key, main_word, main_reading)
        item['word'] = main_word
        item['reading'] = main_reading
        item['meaning'] = cap_first(meaning)
        if hanviet:
            item['hanViet'] = clean(hanviet)
        if pos:
            item['pos'] = POS_MAP.get(clean(pos), clean(pos))
        alts = [w for w in words[1:] if w != main_word]
        if alts:
            item['alt'] = alts
        r_alts = [r for r in readings[1:] if r and r != main_reading]
        if r_alts:
            item['readingAlt'] = r_alts
        if origin:
            item['origin'] = origin
        if note and note.lower() != meaning.lower():
            item['note'] = note
        if weak:
            item['weak'] = True

        old = self.items.get(item['id'])
        if old:
            if item['meaning'] and item['meaning'] not in old['meaning']:
                old['meaning'] = f"{old['meaning']}; {item['meaning']}"
            report[sheet].append(f'dòng {rowno}: "{main_word}" trùng, đã gộp nghĩa')
            return old
        self.items[item['id']] = item
        return item

    def to_list(self):
        return list(self.items.values())


def is_flag(v):
    return clean(v) not in ('', '0')


def read_n5_n4(ws, key, label):
    vs = VocabSheet(key, label)
    for n, r in rows_of(ws):
        if col(r, 0) == '漢字':
            continue
        vs.add(ws.title, n, r[0], col(r, 1), col(r, 3), col(r, 2), col(r, 5), is_flag(r[4]) if len(r) > 4 else False)
    return vs


def read_n3(ws):
    vs = VocabSheet('n3', 'N3')
    for n, r in rows_of(ws):
        if col(r, 1) == '漢字':
            continue
        vs.add(ws.title, n, r[1], col(r, 3), col(r, 4), col(r, 2), col(r, 6), is_flag(r[5]) if len(r) > 5 else False)
    return vs


def read_n2(ws, ref_ws):
    ref = OrderedDict()
    for n, r in rows_of(ref_ws):
        if col(r, 1) == '漢字':
            continue
        w = col(r, 1)
        if w:
            ref[w] = {'reading': col(r, 2), 'hv': col(r, 3), 'meaning': col(r, 4), 'row': n}
    vs = VocabSheet('n2', 'N2')
    seen = set()
    for n, r in rows_of(ws):
        if col(r, 0) == 'hán tự':
            continue
        w = col(r, 0)
        hv = col(r, 3) or (ref.get(w) or {}).get('hv', '')
        vs.add(ws.title, n, w, col(r, 1), col(r, 2), hv, note=col(r, 4))
        seen.add(w)
    extra = 0
    for w, d in ref.items():
        if w not in seen:
            vs.add(ref_ws.title, d['row'], w, d['reading'], d['meaning'], d['hv'])
            extra += 1
    report[ws.title].append(f'thêm {extra} từ chỉ có trong sheet "N2.for ref"')
    return vs


def read_n1(ws):
    vs = VocabSheet('n1', 'N1')
    parent = None
    for n, r in rows_of(ws):
        num = col(r, 0)
        item = vs.add(ws.title, n, r[1], col(r, 2), col(r, 3))
        if not item:
            continue
        if num:
            parent = item
            item['no'] = int(num) if num.isdigit() else num
        elif parent is not None and parent is not item:
            item['parent'] = parent['id']
            parent.setdefault('related', [])
            if item['id'] not in parent['related']:
                parent['related'].append(item['id'])
    return vs


def read_simple(ws, key, label, word_i, reading_i, meaning_i, hv_i=None):
    vs = VocabSheet(key, label)
    for n, r in rows_of(ws):
        hv = col(r, hv_i) if hv_i is not None else ''
        vs.add(ws.title, n, r[word_i], col(r, reading_i), col(r, meaning_i), hv)
    return vs


# ---------------------------------------------------------------- chữ Hán

def norm_hv(s):
    s = unicodedata.normalize('NFC', s.strip()).upper()
    return s.split('/')[0].strip()


def build_kanji(vocab_by_level, compounds):
    """Ghép từng chữ Hán trong từ với âm Hán Việt cùng vị trí (chỉ khi số chữ = số âm)."""
    data = OrderedDict()
    level_order = ['n5', 'n4', 'n3', 'n2', 'n1']
    sources = [(lv, vocab_by_level[lv]) for lv in level_order] + [('compound', compounds)]
    skipped = 0
    for lv, items in sources:
        for it in items:
            hv = it.get('hanViet')
            if not hv:
                continue
            chars = KANJI_RE.findall(it['word'])
            sylls = [norm_hv(x) for x in re.split(r'[\s\-]+', hv.split('/')[0]) if x.strip()]
            if not chars or len(chars) != len(sylls):
                skipped += 1
                continue
            for ch, sy in zip(chars, sylls):
                k = data.setdefault(ch, {'kanji': ch, 'hv': Counter(), 'level': None, 'words': []})
                k['hv'][sy] += 1
                if lv != 'compound' and k['level'] is None:
                    k['level'] = lv.upper()
                if it['id'] not in k['words']:
                    k['words'].append(it['id'])
    out = []
    for ch, k in data.items():
        common = k['hv'].most_common()
        top = common[0][1]
        # âm phụ chỉ giữ khi xuất hiện ≥2 lần và ≥20% âm chính (loại lỗi gõ, ghép lệch)
        hvs = [common[0][0]] + [h for h, n in common[1:] if n >= 2 and n >= top * 0.2]
        out.append(OrderedDict([
            ('id', make_id('kj', ch)),
            ('kanji', ch),
            ('hanViet', hvs[0]),
            *([('hanVietAlt', hvs[1:4])] if len(hvs) > 1 else []),
            ('firstLevel', k['level']),
            ('words', k['words'][:40]),
            ('wordCount', len(k['words'])),
        ]))
    order = {'N5': 0, 'N4': 1, 'N3': 2, 'N2': 3, 'N1': 4, None: 5}
    out.sort(key=lambda x: (order[x['firstLevel']], -x['wordCount']))
    report['kanji'].append(f'{skipped} từ không ghép được (số chữ Hán khác số âm Hán Việt)')
    return out


def read_radicals(ws):
    out = []
    for n, r in rows_of(ws):
        if col(r, 0) == 'BỘ THỦ':
            continue
        out.append(OrderedDict([('no', len(out) + 1), ('radical', col(r, 0)), ('name', col(r, 1)), ('meaning', col(r, 2))]))
    return out


# ---------------------------------------------------------------- ngữ pháp

FW_DIGITS = str.maketrans('０１２３４５６７８９．', '0123456789.')
CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
NOISE_RE = re.compile(
    r'(FPT University|Japanese Language Training Division|^完全マスター\s+日本語能力試験|'
    r'^日本語能力試験一級文法\s|^©|編集・翻訳|^神戸・河内)'
)


def sheet_lines(ws):
    out = []
    for _, r in rows_of(ws):
        raw = r[0] if r else None
        if isinstance(raw, (int, float)):  # số trang / số mục rời rạc từ PDF
            continue
        cells = [clean(c) for c in r if clean(c)]
        line = ' '.join(cells)
        if not line or NOISE_RE.search(line) or '\x0c' in str(raw or ''):
            continue
        out.append(line)
    # bỏ dòng furigana: chỉ có kana, nằm ngay trên một dòng có chữ Hán
    res = []
    for i, line in enumerate(out):
        nxt = out[i + 1] if i + 1 < len(out) else ''
        if KANA_RE.match(line) and KANJI_RE.search(nxt) and (re.search(r'\s{1}', line) or len(line) <= 6):
            continue
        res.append(line)
    # mũi tên Wingdings bị đọc thành "à" giữa hai cụm tiếng Nhật
    res = [re.sub(r'(?<=[　-鿿）」～\w])\s+à\s+(?=[　-鿿（「～])', ' → ', l) for l in res]
    return [re.sub(r'\s{2,}', '  ', l) for l in res]


def join_wrapped(lines):
    """Gộp dòng tiếng Việt bị ngắt giữa câu (dòng sau bắt đầu bằng chữ thường)."""
    out = []
    for l in lines:
        if out and re.match(r'^[a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ(]', l) \
                and not JP_RE.search(l[:2]):
            out[-1] = out[-1] + ' ' + l
        else:
            out.append(l)
    return out


def split_ja_vi(line):
    """Tách 'câu Nhật。Câu Việt' trên cùng một dòng."""
    m = re.match(r'^(.*[　-鿿。？！）」])\s*([A-ZÀ-Ỹ…].*)$', line)
    if m and JP_RE.search(m.group(1)):
        return m.group(1).strip(), m.group(2).strip()
    return line, ''


def extract_fields(level, body):
    meaning, connection, examples, notes = '', '', [], []
    i = 0
    while i < len(body):
        l = body[i]
        nxt = body[i + 1] if i + 1 < len(body) else ''
        if re.match(r'^(A |B |C )?意味', l) or l.startswith('＊ Ý nghĩa'):
            rest = re.sub(r'^(A |B |C )?意味\s*|^＊ Ý nghĩa:?\s*', '', l)
            if not meaning:
                meaning = (rest + (' ' + nxt if nxt and not JP_RE.search(nxt) and not nxt.startswith(('接続', '用例', '①')) else '')).strip()
        elif l.startswith('接続') and not connection:
            connection = l.replace('接続', '', 1).strip()
        elif level == 'n3' and i < 12 and not meaning and re.match(r'^Ý nghĩa( \d)?:\s*\S', l):
            meaning = re.sub(r'\s*Ví dụ:?$', '', re.sub(r'^Ý nghĩa( \d)?:\s*', '', l)).strip()
        elif level == 'n3' and i < 12 and not connection and re.match(r'^(\d\. )?Cấu trúc( \d)?:', l):
            rest = re.sub(r'^(\d\. )?Cấu trúc( \d)?:\s*', '', l).strip()
            if not rest and nxt and not nxt.startswith(('Ý nghĩa', 'Ví dụ')) and nxt[:1] not in CIRCLED:
                rest = nxt.strip(' ')
            connection = rest
        elif l[:1] in CIRCLED:
            ja, vi = split_ja_vi(l[1:].strip())
            if not vi and nxt and not JP_RE.search(nxt[:6]) and nxt[:1] not in CIRCLED:
                vi = nxt.lstrip('→ ').strip()
                i += 1
            examples.append({'ja': ja, 'vi': vi})
        elif l.startswith(('注意', '* Chú ý', '＊ Lưu ý', '* Lưu ý')):
            notes.append(l)
        i += 1
    return meaning, connection, examples


def make_grammar_item(level, no, title, body, lesson=None):
    body = join_wrapped(body)
    meaning, connection, examples = extract_fields(level, body)
    item = OrderedDict()
    item['id'] = make_id(f'g{level}', str(lesson or ''), str(no), title)
    item['level'] = level.upper()
    if lesson:
        item['lesson'] = lesson
    item['no'] = no
    item['title'] = title
    if meaning:
        item['meaning'] = meaning
    if connection:
        item['connection'] = connection
    if examples:
        item['examples'] = examples
    item['body'] = body
    return item


def parse_grammar_n4(ws):
    """Ngữ pháp N4 chia theo bài 第26課…第50課; trong bài tách theo mục đánh số 1．2．…"""
    lines = sheet_lines(ws)
    items, lesson, no, title, body, expect = [], None, 0, '', [], 1

    def flush():
        if lesson is None or not body:
            return
        if no == 0:  # bài không có mục đánh số: cả bài là một mục
            items.append(make_grammar_item('n4', 1, f'Bài {lesson}', list(body), lesson))
        else:
            items.append(make_grammar_item('n4', no, title, list(body), lesson))

    for l in lines:
        compact = l.translate(FW_DIGITS).replace(' ', '')
        m = re.match(r'^第(\d+)課$', compact)
        if m:
            flush()
            lesson, no, title, body, expect = int(m.group(1)), 0, '', [], 1
            continue
        h = re.match(r'^([0-9０-９]{1,2})[．.]\s+(.+)$', l)
        if lesson and h and int(h.group(1).translate(FW_DIGITS)) == expect:
            if no:  # mục trước
                flush()
                body = []
            # phần mở đầu trước mục 1 được giữ lại làm đầu mục 1
            no, title = expect, h.group(2).strip()
            expect += 1
            continue
        if lesson:
            body.append(l)
    flush()
    return items


def parse_grammar_n3(ws, chapters_file=None):
    lines = sheet_lines(ws)
    chapters, cur = [], None
    for l in lines:
        m = re.match(r'^(\d+)\.\s*\[Ngữ pháp (N\d)\]\s*(.+)$', l)
        if m:
            title = m.group(3).strip().lstrip(':： ')
            if m.group(2) != 'N3':
                title = f'{title} (ôn {m.group(2)})'
            cur = [int(m.group(1)), title, []]
            chapters.append(cur)
            continue
        if cur:
            cur[2].append(l)
    if chapters_file and chapters_file.exists():
        chapters = split_chapters(chapters, json.loads(chapters_file.read_text(encoding='utf-8'))['chapters'])
    return [make_grammar_item('n3', *c) for c in chapters]


def split_chapters(chapters, splits):
    """Cắt thân chương theo n3-chapters.json (tiêu đề bị mất trong Excel). Lỗi nếu không tìm thấy dòng cắt."""
    norm = lambda s: re.sub(r'\s+', ' ', s).strip()
    by_parent = defaultdict(list)
    for s in splits:
        by_parent[s['parent']].append(s)
    out = []
    for no, title, body in chapters:
        pieces, start, pos = [], 0, 0
        cur_no, cur_title = no, title
        for s in by_parent.pop(no, []):
            target = norm(s['match'])
            hit = next((i for i in range(pos + 1, len(body))
                        if (norm(body[i]) == target if s.get('exact') else norm(body[i]).startswith(target))), None)
            if hit is None:
                raise SystemExit(f'n3-chapters.json: không tìm thấy "{s["match"]}" trong chương {no} (cho chương {s["no"]})')
            pieces.append([cur_no, cur_title, body[start:hit]])
            start, pos, cur_no, cur_title = hit, hit, s['no'], s['title']
        pieces.append([cur_no, cur_title, body[start:]])
        out.extend(pieces)
    if by_parent:
        raise SystemExit(f'n3-chapters.json: không có chương cha {sorted(by_parent)}')
    nos = [c[0] for c in out]
    if nos != sorted(nos) or len(set(nos)) != len(nos):
        raise SystemExit(f'n3-chapters.json: số chương không tăng dần: {nos}')
    return out


# ---------------------------------------------------------------- ngữ pháp tự soạn (data-source/grammar-extra)

EXTRA_DIR = Path(__file__).resolve().parent.parent / 'data-source' / 'grammar-extra'
GRAMMAR_GROUPS = {
    'n3': ['Ôn tập N4', 'Thời điểm', 'Nguyên nhân – kết quả', 'Suy đoán – truyền đạt', 'Đối chiếu – tương phản',
           'So sánh – mức độ', 'Nhấn mạnh – giới hạn', 'Liệt kê – bổ sung', 'Điều kiện – giả định', 'Quan điểm – đề tài',
           'Ý chí – nghĩa vụ – cảm xúc', 'Động từ ghép – trợ động từ', 'Văn nói'],
    'n5': ['Trợ từ', 'Câu cơ bản', 'Chỉ thị – nghi vấn', 'Tính từ', 'Động từ – thể ます', 'Thể て', 'Mong muốn – rủ rê',
           'Xin phép – cấm – yêu cầu', 'So sánh', 'Thời gian – trình tự'],
}
EXTRA_KEYS = {'title', 'group', 'meaning', 'connection', 'examples', 'notes', 'related', 'source', 'auto'}
LEVEL_RANK = {'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5}


def title_keys(title):
    """Các cách viết của một tiêu đề, đã chuẩn hóa, để phát hiện trùng ('～ばかり / ～たばかり' → {ばかり, たばかり})."""
    t = re.sub(r'\((?:[^)]*[A-Za-zÀ-ỹ][^)]*)\)', '', title)  # bỏ chú thích tiếng Việt trong ngoặc
    keys = set()
    for part in re.split(r'[/／、,]', t):
        k = re.sub(r'[～〜\s・]', '', part).replace('（', '(').replace('）', ')')
        if k:
            keys.add(k)
            keys.add(re.sub(r'\(.*?\)', '', k))
    return {k for k in keys if k}


def validate_extra(level, items, kanji_level=None):
    """Kiểm tra file tự soạn. Trả về (lỗi, cảnh báo)."""
    errors, warnings, seen = [], [], {}
    groups = GRAMMAR_GROUPS[level]
    max_rank = LEVEL_RANK['N3'] if level == 'n3' else LEVEL_RANK['N4']
    for n, it in enumerate(items, 1):
        where = f'{level}.json #{n} {it.get("title", "?")}'
        unknown = set(it) - EXTRA_KEYS
        if unknown:
            errors.append(f'{where}: trường lạ {sorted(unknown)}')
        for k in ('title', 'group', 'meaning', 'connection'):
            if not isinstance(it.get(k), str) or not it[k].strip():
                errors.append(f'{where}: thiếu {k}')
        if it.get('group') not in groups:
            errors.append(f'{where}: nhóm "{it.get("group")}" không có trong danh sách')
        if it.get('source') != 'kotonoha' or it.get('auto') is not True:
            errors.append(f'{where}: cần "source": "kotonoha" và "auto": true')
        ex = it.get('examples')
        if not isinstance(ex, list) or not 3 <= len(ex) <= 4:
            errors.append(f'{where}: cần 3–4 ví dụ')
        else:
            for e in ex:
                if not isinstance(e, dict) or set(e) != {'ja', 'vi'} or not e['ja'].strip() or not e['vi'].strip():
                    errors.append(f'{where}: ví dụ phải có đủ ja và vi: {e}')
                elif not JP_RE.search(e['ja']):
                    errors.append(f'{where}: câu ví dụ không có chữ Nhật: {e["ja"]}')
                elif kanji_level is not None:
                    for ch in KANJI_RE.findall(e['ja']):
                        lv = kanji_level.get(ch)
                        if lv is None:
                            warnings.append(f'{where}: chữ {ch} không có trong kanji.json ({e["ja"]})')
                        elif LEVEL_RANK[lv] > max_rank:
                            warnings.append(f'{where}: chữ {ch} xuất hiện từ {lv} ({e["ja"]})')
        notes = it.get('notes')
        if not isinstance(notes, list) or not notes or not all(isinstance(x, str) and x.strip() for x in notes):
            errors.append(f'{where}: cần ít nhất một lưu ý (notes)')
        rel = it.get('related', [])
        if not isinstance(rel, list) or not all(isinstance(x, str) for x in rel):
            errors.append(f'{where}: related phải là danh sách chuỗi')
        # Trong cùng cấp: so cả tiêu đề (kể cả chú thích "(thời gian)"), bỏ ～ và khoảng trắng.
        k = re.sub(r'[～〜\s]', '', it.get('title', ''))
        if k in seen:
            errors.append(f'{where}: trùng tiêu đề với mục #{seen[k]}')
        seen[k] = n
    return errors, warnings


def load_extra(level):
    p = EXTRA_DIR / f'{level}.json'
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else []


def merge_extra(level, excel_items, kanji_level):
    """Mục Excel trước, mục tự soạn sau. Mẫu đã có trong Excel thì báo lỗi (dùng related "#số" để trỏ tới)."""
    extra = load_extra(level)
    errors, warnings = validate_extra(level, extra, kanji_level)
    excel_keys = {}
    for g in excel_items:
        for k in title_keys(g['title']):
            excel_keys[k] = g
    for it in extra:
        for k in title_keys(it['title']):
            if k in excel_keys:
                errors.append(f'{level}.json {it["title"]}: đã có trong Excel (chương {excel_keys[k]["no"]} {excel_keys[k]["title"]}), ghi related "#{excel_keys[k]["no"]}" thay vì tạo lại')
    by_no = {g['no']: g for g in excel_items}
    ids = {it['title']: make_id(f'g{level}', 'kotonoha', it['title']) for it in extra}
    start = max((g['no'] for g in excel_items), default=0)
    out = list(excel_items)
    for n, it in enumerate(extra, 1):
        related = []
        for r in it.get('related', []):
            if r.startswith('#'):
                g = by_no.get(int(r[1:])) if r[1:].isdigit() else None
                if not g:
                    errors.append(f'{level}.json {it["title"]}: không có chương Excel {r}')
                else:
                    related.append(g['id'])
            elif r in ids:
                related.append(ids[r])
            else:
                errors.append(f'{level}.json {it["title"]}: related "{r}" không khớp mục nào')
        item = OrderedDict()
        item['id'] = ids[it['title']]
        item['level'] = level.upper()
        item['no'] = start + n
        item['title'] = it['title']
        item['meaning'] = it['meaning']
        item['connection'] = it['connection']
        item['examples'] = it['examples']
        item['notes'] = it['notes']
        item['group'] = it['group']
        if related:
            item['related'] = related
        item['source'] = 'kotonoha'
        item['auto'] = True
        item['body'] = []
        out.append(item)
    if errors:
        raise SystemExit('Lỗi ngữ pháp tự soạn:\n  ' + '\n  '.join(errors))
    report[f'grammar-extra {level}'].extend(warnings)
    return out


def apply_excel_groups(level, items):
    p = EXTRA_DIR / f'{level}-chapters.json'
    if not p.exists():
        return items
    groups = json.loads(p.read_text(encoding='utf-8')).get('groups', {})
    for g in items:
        grp = groups.get(str(g['no']))
        if grp:
            if grp not in GRAMMAR_GROUPS[level]:
                raise SystemExit(f'{p.name}: nhóm "{grp}" của chương {g["no"]} không có trong danh sách')
            g['group'] = grp
    missing = [g['no'] for g in items if 'group' not in g]
    if groups and missing:
        raise SystemExit(f'{p.name}: chưa gán nhóm cho chương {missing}')
    return items


def check_extra(data_dir):
    """Chỉ kiểm tra file tự soạn (không cần Excel): python scripts/convert_xlsx.py --check [public/data]"""
    kanji = json.loads((Path(data_dir) / 'kanji/kanji.json').read_text(encoding='utf-8'))
    kanji_level = {k['kanji']: k['firstLevel'] for k in kanji}
    ok = True
    for level in ('n3', 'n5'):
        items = load_extra(level)
        errors, warnings = validate_extra(level, items, kanji_level)
        titles = {it.get('title') for it in items}
        for it in items:
            for r in it.get('related', []):
                if not r.startswith('#') and r not in titles:
                    warnings.append(f'{it.get("title")}: related "{r}" chưa có (lỗi khi chạy import nếu vẫn thiếu)')
        counts = Counter(it.get('group') for it in items)
        print(f'{level}: {len(items)} mẫu, {len(errors)} lỗi, {len(warnings)} cảnh báo')
        for g in GRAMMAR_GROUPS[level]:
            if counts[g]:
                print(f'   {counts[g]:3}  {g}')
        for e in errors:
            print('  LỖI', e)
        for w in warnings:
            print('  cảnh báo', w)
        ok = ok and not errors
    return ok


def parse_grammar_book(ws, level, head_re):
    lines = sheet_lines(ws)
    # bỏ bìa + mục lục: lấy từ sau dòng mục lục cuối cùng (có chuỗi "....")
    last_toc = max((i for i, l in enumerate(lines) if re.search(r'\.{6,}\s*\d*$', l)), default=-1)
    lines = lines[last_toc + 1:]
    items, cur, expect = [], None, 1
    for l in lines:
        m = head_re.match(l)
        if m:
            n, title = int(m.group(1).translate(FW_DIGITS)), m.group(2).strip()
            # số mục tăng dần (cho phép file gốc thiếu vài mục), tiêu đề ngắn và có tiếng Nhật
            if expect <= n <= expect + 45 and len(title) <= 60 and JP_RE.search(title):
                if n != expect:
                    report[ws.title].append(f'thiếu mục {expect}–{n - 1} trong file gốc')
                if cur:
                    items.append(make_grammar_item(level, *cur))
                cur = [n, title, []]
                expect = n + 1
                continue
        if cur:
            cur[2].append(l)
    if cur:
        items.append(make_grammar_item(level, *cur))
    return items


# ---------------------------------------------------------------- xuất file

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    # mỗi mục một dòng: vừa gọn vừa dễ đọc diff trên git
    if isinstance(data, list):
        body = '[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in data) + '\n]\n'
    else:
        body = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    path.write_text(body, encoding='utf-8', newline='\n')
    return body.encode('utf-8')


def main(xlsx, out_dir):
    out = Path(out_dir)
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    S = {ws.title: ws for ws in wb.worksheets}

    vocab = OrderedDict()
    vocab['n5'] = read_n5_n4(S['N5'], 'n5', 'N5').to_list()
    vocab['n4'] = read_n5_n4(S['N4'], 'n4', 'N4').to_list()
    vocab['n3'] = read_n3(S['N3']).to_list()
    vocab['n2'] = read_n2(S['N2'], S['N2.for ref']).to_list()
    vocab['n1'] = read_n1(S['N1']).to_list()
    extra = OrderedDict()
    extra['compounds'] = read_simple(S['từ ghép n23'], 'cp', 'Từ ghép', 0, 2, 3, 1).to_list()
    extra['onomatopoeia'] = read_simple(S['Từ láy'], 'ono', 'Từ láy', 1, 2, 3).to_list()
    extra['adverbs'] = read_simple(S['Trợ từ'], 'adv', 'Phó từ', 1, 2, 3).to_list()

    kanji = build_kanji(vocab, extra['compounds'])
    radicals = read_radicals(S['bộ thủ'])

    grammar = OrderedDict()
    kanji_level = {k['kanji']: k['firstLevel'] for k in kanji}
    grammar['n5'] = merge_extra('n5', [], kanji_level)  # sheet "ngữ pháp n5" trống: chỉ có mục tự soạn
    grammar['n4'] = parse_grammar_n4(S['ngữ pháp n4'])
    n3_excel = apply_excel_groups('n3', parse_grammar_n3(S['ngữ pháp n3'], EXTRA_DIR / 'n3-chapters.json'))
    grammar['n3'] = merge_extra('n3', n3_excel, kanji_level)
    grammar['n2'] = parse_grammar_book(S['ngữ pháp n2'], 'n2', re.compile(r'^([0-9０-９]{1,3})\s+(\S.*)$'))
    grammar['n1'] = parse_grammar_book(S['ngữ pháp n1'], 'n1', re.compile(r'^([0-9０-９]{1,3})[.．]\s*(\S.*)$'))

    # id cũ phải còn (tiến độ SRS gắn theo id)
    for lv, items in grammar.items():
        old = out / f'grammar/{lv}.json'
        if old.exists():
            gone = {g['id'] for g in json.loads(old.read_text(encoding='utf-8'))} - {g['id'] for g in items}
            if gone:
                raise SystemExit(f'grammar/{lv}.json: mất {len(gone)} id cũ ({sorted(gone)[:5]}…), dừng để không mất tiến độ')

    files = []

    def emit(rel, data, kind, title, level=None):
        b = write_json(out / rel, data)
        files.append(OrderedDict([
            ('path', rel), ('kind', kind), ('title', title), *([('level', level)] if level else []),
            ('count', len(data)), ('bytes', len(b)), ('hash', hashlib.sha1(b).hexdigest()[:10]),
        ]))

    for lv, items in vocab.items():
        emit(f'vocab/{lv}.json', items, 'vocab', f'Từ vựng {lv.upper()}', lv.upper())
    titles = {'compounds': 'Từ ghép', 'onomatopoeia': 'Từ láy', 'adverbs': 'Phó từ'}
    for k, items in extra.items():
        emit(f'vocab/{k}.json', items, 'vocab', titles[k])
    emit('kanji/kanji.json', kanji, 'kanji', 'Chữ Hán')
    emit('kanji/radicals.json', radicals, 'radicals', 'Bộ thủ')
    for lv, items in grammar.items():
        emit(f'grammar/{lv}.json', items, 'grammar', f'Ngữ pháp {lv.upper()}', lv.upper())

    manifest = OrderedDict([
        ('version', datetime.now(timezone.utc).strftime('%Y%m%d%H%M')),
        ('source', Path(xlsx).name),
        ('generatedAt', datetime.now(timezone.utc).isoformat(timespec='seconds')),
        ('pageSize', 20),
        ('files', files),
    ])
    write_json(out / 'manifest.json', manifest)

    # báo cáo
    lines = ['# Báo cáo chuyển đổi', '', f'Nguồn: `{Path(xlsx).name}`', '', '| File | Số mục | Dung lượng |', '|---|---:|---:|']
    for f in files:
        lines.append(f"| {f['path']} | {f['count']} | {f['bytes'] / 1024:.0f} KB |")
    lines += ['', '- Sheet "ngữ pháp n5" trống: grammar/n5.json chỉ gồm mục tự soạn (data-source/grammar-extra/n5.json).',
              '- Sheet "ngữ pháp n3" mất phần lớn tiêu đề chương: cắt lại theo data-source/grammar-extra/n3-chapters.json.', '']
    for sheet, msgs in report.items():
        lines += [f'## {sheet} ({len(msgs)})', ''] + [f'- {m}' for m in msgs] + ['']
    (out / 'import-report.md').write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    return files


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) >= 2 and sys.argv[1] == '--check':
        sys.exit(0 if check_extra(sys.argv[2] if len(sys.argv) > 2 else 'public/data') else 1)
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    for f in main(sys.argv[1], sys.argv[2]):
        print(f"{f['path']:28} {f['count']:6} mục  {f['bytes'] / 1024:7.0f} KB")

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


def parse_grammar_n3(ws):
    lines = sheet_lines(ws)
    items, cur = [], None
    for l in lines:
        m = re.match(r'^(\d+)\.\s*\[Ngữ pháp (N\d)\]\s*(.+)$', l)
        if m:
            if cur:
                items.append(make_grammar_item('n3', *cur))
            title = m.group(3).strip().lstrip(':： ')
            if m.group(2) != 'N3':
                title = f'{title} (ôn {m.group(2)})'
            cur = [int(m.group(1)), title, []]
            continue
        if cur:
            cur[2].append(l)
    if cur:
        items.append(make_grammar_item('n3', *cur))
    return items


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
    path.write_text(body, encoding='utf-8')
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
    grammar['n5'] = []  # sheet "ngữ pháp n5" đang trống
    grammar['n4'] = parse_grammar_n4(S['ngữ pháp n4'])
    grammar['n3'] = parse_grammar_n3(S['ngữ pháp n3'])
    grammar['n2'] = parse_grammar_book(S['ngữ pháp n2'], 'n2', re.compile(r'^([0-9０-９]{1,3})\s+(\S.*)$'))
    grammar['n1'] = parse_grammar_book(S['ngữ pháp n1'], 'n1', re.compile(r'^([0-9０-９]{1,3})[.．]\s*(\S.*)$'))

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
    lines += ['', '- Sheet "ngữ pháp n5" trống nên grammar/n5.json rỗng.', '']
    for sheet, msgs in report.items():
        lines += [f'## {sheet} ({len(msgs)})', ''] + [f'- {m}' for m in msgs] + ['']
    (out / 'import-report.md').write_text('\n'.join(lines), encoding='utf-8')
    return files


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    for f in main(sys.argv[1], sys.argv[2]):
        print(f"{f['path']:28} {f['count']:6} mục  {f['bytes'] / 1024:7.0f} KB")

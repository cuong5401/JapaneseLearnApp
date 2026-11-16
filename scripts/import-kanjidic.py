#!/usr/bin/env python3
"""
Sinh âm On / Kun, số nét, cấp JLPT cũ từ KANJIDIC2 (EDRDG, CC BY-SA 4.0) cho web Kotonoha.

Cách chạy (chỉ cần Python, không cần thư viện ngoài):
    py scripts/import-kanjidic.py                          tải kanjidic2.xml.gz mới nhất từ edrdg.org
    py scripts/import-kanjidic.py --file kanjidic2.xml.gz  dùng file đã tải sẵn (.xml hoặc .xml.gz)

Chỉ lấy chữ có trong public/data/kanji/kanji.json, bộ thủ (radicals.json, cả dạng biến thể) và chữ có dữ liệu
thứ tự nét (strokes/index.json). Chữ không có trong KANJIDIC2 thì bỏ qua (app để trống).
Kết quả:
    public/data/kanji/kanji-readings.json   { source, version, chars: { "一": { on, kun, s, jlpt? } } }
        on   : âm On (katakana), theo thứ tự của KANJIDIC2
        kun  : âm Kun (hiragana), giữ nguyên ký hiệu của KANJIDIC2: "." ngăn okurigana (ひと.つ),
               "-" đứng trước/sau là tiền tố/hậu tố (ひと-, -び)
        s    : số nét
        jlpt : cấp JLPT cũ (1–4) nếu có
    public/data/import-report-kanjidic.md
Không nằm trong manifest (app fetch trực tiếp như strokes/index.json; service worker cache /data/*.json).
"""
import gzip
import io
import json
import sys
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
OUT = DATA / 'kanji' / 'kanji-readings.json'
REPORT = DATA / 'import-report-kanjidic.md'
URL = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz'
SOURCE = 'KANJIDIC2 (EDRDG), CC BY-SA 4.0, https://www.edrdg.org/wiki/index.php/KANJIDIC_Project'


def is_kana(c):
    return 0x3040 <= ord(c) <= 0x30FF


def wanted_chars():
    kanji = json.loads((DATA / 'kanji/kanji.json').read_text(encoding='utf-8'))
    radicals = json.loads((DATA / 'kanji/radicals.json').read_text(encoding='utf-8'))
    chars = {k['kanji'] for k in kanji}
    for r in radicals:
        chars.add(r['radical'])
        chars.update(r.get('variants', []))
    index = DATA / 'strokes' / 'index.json'
    if index.exists():
        chars.update(json.loads(index.read_text(encoding='utf-8')).get('chars', ''))
    return sorted(c for c in chars if len(c) == 1 and not is_kana(c))


def read_xml(path):
    if path is None:
        print(f'Tải {URL}…')
        req = urllib.request.Request(URL, headers={'User-Agent': 'kotonoha-import-kanjidic'})
        with urllib.request.urlopen(req) as r:
            raw = r.read()
    else:
        raw = Path(path).read_bytes()
    if raw[:2] == b'\x1f\x8b':
        raw = gzip.decompress(raw)
    print(f'KANJIDIC2: {len(raw) / 1e6:.1f} MB XML')
    return raw


def parse(raw, wanted):
    wanted = set(wanted)
    out = {}
    version = ''
    # iterparse để không giữ cả cây XML (~15 MB) trong bộ nhớ.
    for _event, el in ET.iterparse(io.BytesIO(raw), events=('end',)):
        if el.tag == 'date_of_creation':
            version = (el.text or '').strip()
        if el.tag != 'character':
            continue
        lit = el.findtext('literal')
        if lit in wanted:
            on, kun = [], []
            for r in el.iterfind('reading_meaning/rmgroup/reading'):
                text = (r.text or '').strip()
                if not text:
                    continue
                kind = r.get('r_type')
                if kind == 'ja_on' and text not in on:
                    on.append(text)
                elif kind == 'ja_kun' and text not in kun:
                    kun.append(text)
            entry = {'on': on, 'kun': kun}
            strokes = el.findtext('misc/stroke_count')
            if strokes:
                entry['s'] = int(strokes)
            jlpt = el.findtext('misc/jlpt')
            if jlpt:
                entry['jlpt'] = int(jlpt)
            out[lit] = entry
        el.clear()
    return out, version


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # console Windows (cp932) không in được tiếng Việt
    args = sys.argv[1:]
    path = args[args.index('--file') + 1] if '--file' in args else None
    wanted = wanted_chars()
    chars, version = parse(read_xml(path), wanted)
    missing = [c for c in wanted if c not in chars]
    ordered = {c: chars[c] for c in wanted if c in chars}
    body = json.dumps({'source': SOURCE, 'version': version, 'chars': ordered}, ensure_ascii=False, separators=(',', ':'))
    OUT.write_text(body + '\n', encoding='utf-8', newline='\n')
    no_reading = [c for c, e in ordered.items() if not e['on'] and not e['kun']]
    REPORT.write_text(
        '\n'.join([
            '# Báo cáo âm đọc (KANJIDIC2)',
            '',
            f'- Bản KANJIDIC2: {version}',
            f'- Có dữ liệu: {len(ordered)}/{len(wanted)} chữ, {len(body.encode()) / 1024:.0f} KB',
            f'- Không có trong KANJIDIC2 ({len(missing)}): {"".join(missing) or "—"}',
            f'- Có trong KANJIDIC2 nhưng không có âm On/Kun ({len(no_reading)}): {"".join(no_reading) or "—"}',
            '',
        ]),
        encoding='utf-8',
        newline='\n',
    )
    print(f'Đã ghi {OUT.relative_to(ROOT)}: {len(ordered)} chữ, thiếu {len(missing)}.')


if __name__ == '__main__':
    main()

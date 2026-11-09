#!/usr/bin/env python3
"""
Sinh dữ liệu thứ tự nét từ KanjiVG (Ulrich Apel, CC BY-SA 3.0) cho web Kotonoha.

Cách chạy (chỉ cần Python, không cần thư viện ngoài):
    py scripts/import-strokes.py                      tải bản release mới nhất (*-main.zip) từ GitHub
    py scripts/import-strokes.py --zip kanjivg-main.zip   dùng file zip đã tải sẵn

Chỉ lấy chữ có trong public/data/kanji/kanji.json, bộ thủ (radicals.json, cả dạng biến thể),
hiragana và katakana. Kết quả:
    public/data/strokes/<hex>.json     { char, strokes: [{ d, n, x, y }] }  (tọa độ làm tròn 1 chữ số)
    public/data/strokes/index.json     { source, version, chars }  app đọc trước, chữ không có thì không tải (tránh 404)
    public/data/import-report-strokes.md
"""
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
OUT = DATA / 'strokes'
API = 'https://api.github.com/repos/KanjiVG/kanjivg/releases/latest'
SVG = '{http://www.w3.org/2000/svg}'
KANA = [chr(c) for c in range(0x3041, 0x3097)] + [chr(c) for c in range(0x30A1, 0x30FB)]
NUM = re.compile(r'-?\d*\.?\d+(?:e-?\d+)?')
MATRIX = re.compile(r'matrix\(\s*1\s+0\s+0\s+1\s+([-\d.]+)\s+([-\d.]+)\s*\)')


def wanted_chars():
    kanji = json.loads((DATA / 'kanji/kanji.json').read_text(encoding='utf-8'))
    radicals = json.loads((DATA / 'kanji/radicals.json').read_text(encoding='utf-8'))
    chars = {k['kanji'] for k in kanji}
    for r in radicals:
        chars.add(r['radical'])
        chars.update(r.get('variants', []))
    chars.update(KANA)
    return sorted(c for c in chars if len(c) == 1)


def fetch_zip():
    with urllib.request.urlopen(urllib.request.Request(API, headers={'User-Agent': 'kotonoha-import-strokes'})) as r:
        release = json.load(r)
    asset = next(a for a in release['assets'] if a['name'].endswith('-main.zip'))
    print(f"Tải {asset['name']} ({asset['size'] / 1e6:.1f} MB)…")
    with urllib.request.urlopen(asset['browser_download_url']) as r:
        return zipfile.ZipFile(io.BytesIO(r.read())), release['tag_name']


def fmt(v):
    s = f'{round(float(v), 1):.1f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def compact_path(d):
    """Làm tròn mọi số 1 chữ số thập phân, bỏ khoảng trắng thừa (lệnh tương đối vẫn giữ nguyên)."""
    out = NUM.sub(lambda m: fmt(m.group()), d)
    out = re.sub(r'\s*,\s*', ',', out)
    out = re.sub(r'\s+', ' ', out).strip()
    return re.sub(r',(?=-)', '', out)  # "1,-2" -> "1-2"


def parse_svg(text, char):
    root = ET.fromstring(text)
    strokes = []
    for p in root.iter(f'{SVG}path'):
        m = re.search(r'-s(\d+)$', p.get('id', ''))
        if m:
            strokes.append({'n': int(m.group(1)), 'd': compact_path(p.get('d', ''))})
    strokes.sort(key=lambda s: s['n'])
    nums = {}
    for t in root.iter(f'{SVG}text'):
        m = MATRIX.search(t.get('transform', ''))
        if m and (t.text or '').strip().isdigit():
            nums[int(t.text.strip())] = (float(m.group(1)), float(m.group(2)))
    out = []
    for s in strokes:
        x, y = nums.get(s['n'], (0.0, 0.0))
        out.append({'d': s['d'], 'n': s['n'], 'x': float(fmt(x)), 'y': float(fmt(y))})
    if [s['n'] for s in out] != list(range(1, len(out) + 1)):
        raise ValueError(f'{char}: thứ tự nét không liên tục')
    return {'char': char, 'strokes': out}


def main(argv):
    if '--zip' in argv:
        path = Path(argv[argv.index('--zip') + 1])
        zf, version = zipfile.ZipFile(path), re.sub(r'\D', '', path.stem)[:8] or path.stem
    else:
        zf, version = fetch_zip()
    names = {n.split('/')[-1]: n for n in zf.namelist() if n.endswith('.svg')}
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.json'):
        old.unlink()
    have, missing, total = [], [], 0
    for ch in wanted_chars():
        name = f'{ord(ch):05x}.svg'
        if name not in names:
            missing.append(ch)
            continue
        data = parse_svg(zf.read(names[name]).decode('utf-8'), ch)
        body = json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'
        (OUT / f'{ord(ch):x}.json').write_text(body, encoding='utf-8', newline='\n')
        total += len(body.encode('utf-8'))
        have.append(ch)
    index = {'source': 'KanjiVG (Ulrich Apel), CC BY-SA 3.0, https://kanjivg.tagaini.net', 'version': version, 'chars': ''.join(have)}
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    avg = total / max(1, len(have))
    lines = [
        '# Báo cáo thứ tự nét (KanjiVG)', '',
        f'- Bản KanjiVG: {version}',
        f'- Có dữ liệu: {len(have)} chữ, tổng {total / 1024:.0f} KB, trung bình {avg / 1024:.2f} KB/chữ',
        f'- Không có trong KanjiVG ({len(missing)}): {"".join(missing)}', '',
    ]
    (DATA / 'import-report-strokes.md').write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1:])

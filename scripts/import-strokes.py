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


SVG_TOKEN = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)|([\s,]+)|(.)')
ARITY = {'m': 2, 'l': 2, 't': 2, 'c': 6, 's': 4, 'q': 4, 'h': 1, 'v': 1, 'z': 0}


def path_segments(d):
    """Tách path SVG thành [(lệnh, [số…]), …] theo đúng ngữ pháp (số dính nhau "1.5.5", "14.62-0.02").
    Lặp lệnh ngầm được tách thành từng đoạn (M thừa tham số → L). Sai cú pháp thì ValueError."""
    tokens = []
    for cmd, num, _sep, junk in SVG_TOKEN.findall(d):
        if junk:
            raise ValueError(f'ký tự lạ "{junk}" trong path')
        if cmd:
            tokens.append(cmd)
        elif num:
            tokens.append(float(num))
    segs, i = [], 0
    while i < len(tokens):
        cmd = tokens[i]
        if not isinstance(cmd, str):
            raise ValueError('path bắt đầu bằng số, thiếu lệnh')
        if cmd in 'Aa':
            raise ValueError('lệnh cung A không được hỗ trợ')
        i += 1
        n = ARITY[cmd.lower()]
        if n == 0:
            segs.append((cmd, []))
            continue
        first = True
        while True:
            args = tokens[i:i + n]
            if len(args) < n or any(isinstance(a, str) for a in args):
                if first:
                    raise ValueError(f'lệnh {cmd} thiếu tham số')
                break
            segs.append((cmd, args))
            i += n
            if cmd in 'Mm':
                cmd = 'L' if cmd == 'M' else 'l'
            first = False
            if i >= len(tokens) or isinstance(tokens[i], str):
                break
    return segs


def absolute_points(segs):
    """Mọi điểm (điều khiển + điểm cuối) theo tọa độ tuyệt đối, kèm điểm cuối mỗi đoạn."""
    x = y = sx = sy = 0.0
    pts, ends = [], []
    for cmd, a in segs:
        lc, rel = cmd.lower(), cmd.islower()
        if lc == 'z':
            x, y = sx, sy
        elif lc == 'h':
            x = x + a[0] if rel else a[0]
            pts.append((x, y))
        elif lc == 'v':
            y = y + a[0] if rel else a[0]
            pts.append((x, y))
        else:
            ox, oy = (x, y) if rel else (0.0, 0.0)
            seg = [(ox + a[k], oy + a[k + 1]) for k in range(0, len(a), 2)]
            pts.extend(seg)
            x, y = seg[-1]
            if lc == 'm':
                sx, sy = x, y
        ends.append((x, y))
    return pts, ends


def compact_path(d):
    """Làm tròn 1 chữ số thập phân, giữ lệnh tương đối nhưng KHÔNG cộng dồn sai số: mỗi tọa độ tương đối
    = round(tuyệt đối) - round(điểm đầu đoạn). Giữa hai số luôn có phẩy, chỉ bỏ khi số sau âm sau làm tròn;
    không bao giờ ra "-0" (lỗi cũ: "14.62-0.02" → "14.60" làm hỏng path)."""
    out = []
    x = y = sx = sy = 0.0
    for cmd, a in path_segments(d):
        lc, rel = cmd.lower(), cmd.islower()
        bx, by = round(x, 1), round(y, 1)  # điểm đầu đoạn đã làm tròn (bản nén sẽ đứng ở đây)
        vals = []
        if lc == 'z':
            x, y = sx, sy
        elif lc in 'hv':
            if lc == 'h':
                x = x + a[0] if rel else a[0]
                vals.append(round(x, 1) - bx if rel else x)
            else:
                y = y + a[0] if rel else a[0]
                vals.append(round(y, 1) - by if rel else y)
        else:
            ox, oy = (x, y) if rel else (0.0, 0.0)
            for k in range(0, len(a), 2):
                ax, ay = ox + a[k], oy + a[k + 1]
                vals += [round(ax, 1) - bx, round(ay, 1) - by] if rel else [ax, ay]
            x, y = ox + a[-2], oy + a[-1]
            if lc == 'm':
                sx, sy = x, y
        body = ''
        for j, v in enumerate(vals):
            s = fmt(v)
            body += s if j == 0 or s.startswith('-') else ',' + s
        out.append(cmd + body)
    return ''.join(out)


def verify_path(orig, compact, where):
    """Bản nén đúng cú pháp, không có "-0", mọi điểm lệch bản gốc < 0.5 (thực tế ≤ 0.1)."""
    if re.search(r'-0(?![.\d]*[1-9])', compact):
        raise SystemExit(f'{where}: path có "-0": {compact}')
    try:
        a_segs, b_segs = path_segments(orig), path_segments(compact)
    except ValueError as e:
        raise SystemExit(f'{where}: path sai cú pháp ({e}): {compact}')
    if [c.lower() for c, _ in a_segs] != [c.lower() for c, _ in b_segs]:
        raise SystemExit(f'{where}: số / loại đoạn khác bản gốc')
    pa, ea = absolute_points(a_segs)
    pb, eb = absolute_points(b_segs)
    if len(pa) != len(pb):
        raise SystemExit(f'{where}: số điểm khác bản gốc')
    worst = max(max(abs(p[0] - q[0]), abs(p[1] - q[1])) for p, q in zip(pa + ea, pb + eb))
    if worst >= 0.5:
        raise SystemExit(f'{where}: lệch {worst:.2f} so với bản gốc')
    return worst


def parse_svg(text, char):
    root = ET.fromstring(text)
    strokes = []
    for p in root.iter(f'{SVG}path'):
        m = re.search(r'-s(\d+)$', p.get('id', ''))
        if m:
            orig = p.get('d', '')
            d = compact_path(orig)
            verify_path(orig, d, f'{char} nét {m.group(1)}')
            strokes.append({'n': int(m.group(1)), 'd': d})
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

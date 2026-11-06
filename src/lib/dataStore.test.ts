import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __testing, dataStore, indexById, loadFile, loadManifest, pathForId, request } from './dataStore'

const manifest = {
  version: '1',
  source: 'test.xlsx',
  generatedAt: '2026-11-06',
  pageSize: 20,
  files: [
    { path: 'vocab/n5.json', kind: 'vocab', title: 'N5', level: 'N5', count: 2, bytes: 10, hash: 'aaa' },
    { path: 'kanji/kanji.json', kind: 'kanji', title: 'Kanji', count: 1, bytes: 10, hash: 'bbb' },
  ],
}

const files: Record<string, unknown> = {
  'vocab/n5.json': [
    { id: 'n5-00000001', word: '私', reading: 'わたし', meaning: 'Tôi' },
    { id: 'n5-00000002', word: '水', reading: 'みず', meaning: 'Nước' },
  ],
  'kanji/kanji.json': [{ id: 'kj-00000001', kanji: '水', hanViet: 'THỦY', firstLevel: 'N5', words: [], wordCount: 0 }],
}

function mockFetch(fail: Set<string> = new Set()) {
  const calls: string[] = []
  const fetcher = vi.fn(async (url: string) => {
    calls.push(url)
    const path = url.replace(/^.*\/data\//, '').replace(/\?.*$/, '')
    if (fail.has(path)) return { ok: false, status: 500, json: async () => null }
    const body = path === 'manifest.json' ? manifest : files[path]
    return body === undefined ? { ok: false, status: 404, json: async () => null } : { ok: true, status: 200, json: async () => body }
  })
  __testing.setFetcher(fetcher)
  return { fetcher, calls }
}

const settle = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => __testing.reset())

describe('dataStore', () => {
  it('tải manifest rồi tải file kèm hash trong URL', async () => {
    const { calls } = mockFetch()
    const data = await loadFile<{ id: string }[]>('vocab/n5.json')
    expect(data).toHaveLength(2)
    expect(calls[0]).toMatch(/manifest\.json/)
    expect(calls[1]).toMatch(/vocab\/n5\.json\?v=aaa$/)
  })

  it('cache theo path + hash: gọi nhiều lần chỉ fetch một lần', async () => {
    const { fetcher } = mockFetch()
    await Promise.all([loadFile('vocab/n5.json'), loadFile('vocab/n5.json'), loadFile('vocab/n5.json')])
    await loadManifest()
    // 1 manifest + 1 file
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('file không có trong manifest thì báo lỗi rõ ràng', async () => {
    mockFetch()
    await expect(loadFile('vocab/khong-co.json')).rejects.toThrow(/manifest/)
  })

  it('request() phát trạng thái loading → ready cho người đăng ký', async () => {
    mockFetch()
    const seen: string[] = []
    const off = dataStore.subscribe(() => seen.push(dataStore.get('kanji/kanji.json')?.status ?? '-'))
    request('kanji/kanji.json')
    await settle()
    await settle()
    off()
    expect(seen[0]).toBe('loading')
    expect(dataStore.get('kanji/kanji.json')?.status).toBe('ready')
  })

  it('lỗi tải thì trạng thái error, request(force) thử lại được', async () => {
    mockFetch(new Set(['vocab/n5.json']))
    request('vocab/n5.json')
    await settle()
    await settle()
    expect(dataStore.get('vocab/n5.json')?.status).toBe('error')
    expect(dataStore.get('vocab/n5.json')?.error).toMatch(/500/)

    // Không force: giữ nguyên lỗi; force: tải lại và thành công.
    mockFetch()
    request('vocab/n5.json')
    expect(dataStore.get('vocab/n5.json')?.status).toBe('error')
    request('vocab/n5.json', true)
    await settle()
    await settle()
    expect(dataStore.get('vocab/n5.json')?.status).toBe('ready')
  })
})

describe('pathForId', () => {
  it('suy ra file theo tiền tố ID', () => {
    expect(pathForId('n5-e1ea452d')).toBe('vocab/n5.json')
    expect(pathForId('n1-be312b26')).toBe('vocab/n1.json')
    expect(pathForId('cp-d69843fc')).toBe('vocab/compounds.json')
    expect(pathForId('ono-47eaaeb5')).toBe('vocab/onomatopoeia.json')
    expect(pathForId('adv-7974c45b')).toBe('vocab/adverbs.json')
    expect(pathForId('kj-1cb63f35')).toBe('kanji/kanji.json')
    expect(pathForId('gn4-713c6e97')).toBe('grammar/n4.json')
  })

  it('ID cũ của bộ mẫu và thuật ngữ có sẵn không thuộc public/data', () => {
    expect(pathForId('n5-v-001')).toBeNull()
    expect(pathForId('n5-k-001')).toBeNull()
    expect(pathForId('it-001')).toBeNull()
    expect(pathForId('zz-12345678')).toBeNull()
  })

  it('indexById dựng bảng tra một lần cho mỗi mảng', () => {
    const list = files['vocab/n5.json'] as { id: string }[]
    const a = indexById(list)
    expect(a.get('n5-00000002')).toBe(list[1])
    expect(indexById(list)).toBe(a)
  })
})

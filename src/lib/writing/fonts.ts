import viUrl from '../../assets/fonts/be-vietnam-pro-regular.ttf?url'
import viBoldUrl from '../../assets/fonts/be-vietnam-pro-bold.ttf?url'
import kleeUrl from '../../assets/fonts/klee-one-semibold.ttf?url'
import jpUrl from '../../assets/fonts/noto-sans-jp-bold.ttf?url'
import type { FontFiles } from './pdf'

/**
 * Font nhúng vào phiếu (subset sẵn bằng scripts/build-pdf-fonts.mjs, SIL OFL 1.1). Tên file có hash nên service
 * worker cache vĩnh viễn sau lần xuất đầu (xem vite.config.ts) → lần sau xuất được khi offline.
 */
export const FONT_URLS = { vi: viUrl, viBold: viBoldUrl, jp: jpUrl, klee: kleeUrl }

/** Tên font Klee One dùng trong bản xem trước / ảnh PNG cho Word (nạp bằng FontFace khi cần). */
export const KLEE_FAMILY = 'Kotonoha Klee One'

let files: Promise<FontFiles> | null = null

export function loadFontFiles(): Promise<FontFiles> {
  const get = (url: string) =>
    fetch(url).then((r) => (r.ok ? r.arrayBuffer().then((b) => new Uint8Array(b)) : Promise.reject(new Error(`Lỗi ${r.status} khi tải font`))))
  files ??= Promise.all([get(viUrl), get(viBoldUrl), get(jpUrl), get(kleeUrl)])
    .then(([vi, viBold, jp, klee]) => ({ vi, viBold, jp, klee }))
    .catch((e) => {
      files = null
      throw e
    })
  return files
}

let klee: Promise<void> | null = null

/** Nạp Klee One vào document (xem trước, vẽ PNG) – chỉ khi có chữ thiếu dữ liệu nét. */
export function loadKleeFace(): Promise<void> {
  klee ??= new FontFace(KLEE_FAMILY, `url(${kleeUrl})`)
    .load()
    .then((f) => {
      document.fonts.add(f)
    })
    .catch(() => {
      klee = null
    })
  return klee
}

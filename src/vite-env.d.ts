/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** true khi build bản web công khai (GitHub Pages): không có ngữ pháp lấy từ sách. */
declare const __PUBLIC_BUILD__: boolean

/** SHA-256 của "kotonoha-unlock:" + mã 4 số; rỗng = không cần mở khóa. */
declare const __UNLOCK_HASH__: string

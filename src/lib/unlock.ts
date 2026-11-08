/**
 * Mã mở khóa đơn giản cho web dùng cá nhân: chặn người lạ, không phải bảo mật thật.
 *  - Bundle chỉ chứa SHA-256 của mã (__UNLOCK_HASH__, sinh lúc build từ VITE_UNLOCK_CODE).
 *  - Nhập đúng một lần thì lưu mã băm vào localStorage; đổi mã ở lần build sau thì máy cũ phải nhập lại.
 */
const SALT = 'kotonoha-unlock:'
const KEY = 'jla:unlock'

export const UNLOCK_HASH: string = typeof __UNLOCK_HASH__ === 'string' ? __UNLOCK_HASH__ : ''

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const hashCode = (code: string) => sha256Hex(SALT + code)

export function isUnlocked(hash = UNLOCK_HASH): boolean {
  if (!hash) return true
  try {
    return localStorage.getItem(KEY) === hash
  } catch {
    return false
  }
}

/** Kiểm tra mã; đúng thì ghi nhớ trên máy này. */
export async function tryUnlock(code: string, hash = UNLOCK_HASH): Promise<boolean> {
  if (!hash) return true
  const ok = (await hashCode(code)) === hash
  if (ok) {
    try {
      localStorage.setItem(KEY, hash)
    } catch {
      // Không lưu được (chế độ riêng tư): vẫn mở cho phiên này.
    }
  }
  return ok
}

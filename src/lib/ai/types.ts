import { t } from '../../i18n'
/** Lớp AI dùng chung: giao diện chat không phụ thuộc nhà cung cấp (Gemini, Claude, mock khi test). */

export type ProviderId = 'gemini' | 'claude' | 'mock'

export interface AiImage {
  mime: 'image/png' | 'image/jpeg'
  /** base64, không có tiền tố data: */
  data: string
}

export interface AiMessage {
  role: 'user' | 'assistant'
  text: string
  image?: AiImage
}

export interface AiRequest {
  apiKey: string
  model: string
  system: string
  messages: AiMessage[]
  signal?: AbortSignal
}

export interface AiProvider {
  id: ProviderId
  /** Trả lời dần: mỗi phần tử là một mẩu chữ mới. Lỗi ném ra là AiError. */
  stream(req: AiRequest): AsyncIterable<string>
}

export type AiErrorKind = 'auth' | 'quota' | 'network' | 'busy' | 'bad_request' | 'refusal' | 'aborted' | 'unknown'

export class AiError extends Error {
  kind: AiErrorKind
  status?: number
  constructor(kind: AiErrorKind, message: string = kind, status?: number) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
    this.status = status
  }
}

/** Đổi mã HTTP thành loại lỗi (dùng chung cho mọi nhà cung cấp gọi bằng fetch). */
export function errorFromStatus(status: number, detail = ''): AiError {
  if (status === 401 || status === 403) return new AiError('auth', detail, status)
  if (status === 429) return new AiError('quota', detail, status)
  if (status === 503 || status === 529 || status === 500 || status === 502) return new AiError('busy', detail, status)
  if (status === 400 || status === 404) return new AiError('bad_request', detail, status)
  return new AiError('unknown', detail, status)
}

/** Thông báo cho người dùng. Không bao giờ chứa API key. */
export function aiErrorText(e: unknown): string {
  const err = e instanceof AiError ? e : new AiError('unknown')
  switch (err.kind) {
    case 'auth':
      return t('types.apiKeyKhongDung')
    case 'quota':
      return t('types.daHetLuotMien')
    case 'network':
      return t('types.khongKetNoiDuoc')
    case 'busy':
      return t('types.mayChuAiDang')
    case 'bad_request':
      return t('types.yeuCauKhongHop')
    case 'refusal':
      return t('types.aiTuChoiTra')
    case 'aborted':
      return t('types.daDung')
    default:
      return t('types.coLoiKhiGoi')
  }
}

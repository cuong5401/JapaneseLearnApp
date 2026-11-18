import { t, type MessageKey } from '../i18n'

/* i18n-ignore-start: tên nhóm là giá trị trong dữ liệu (khớp convert_xlsx.py); hiển thị qua groupLabel() */
/** Thứ tự nhóm chủ đề ngữ pháp; trùng với GRAMMAR_GROUPS trong scripts/convert_xlsx.py. */
export const GRAMMAR_GROUPS: Record<'N3' | 'N5', readonly string[]> = {
  N3: [
    'Ôn tập N4',
    'Thời điểm',
    'Nguyên nhân – kết quả',
    'Suy đoán – truyền đạt',
    'Đối chiếu – tương phản',
    'So sánh – mức độ',
    'Nhấn mạnh – giới hạn',
    'Liệt kê – bổ sung',
    'Điều kiện – giả định',
    'Quan điểm – đề tài',
    'Ý chí – nghĩa vụ – cảm xúc',
    'Động từ ghép – trợ động từ',
    'Văn nói',
  ],
  N5: [
    'Trợ từ',
    'Câu cơ bản',
    'Chỉ thị – nghi vấn',
    'Tính từ',
    'Động từ – thể ます',
    'Thể て',
    'Mong muốn – rủ rê',
    'Xin phép – cấm – yêu cầu',
    'So sánh',
    'Thời gian – trình tự',
  ],
}
/* i18n-ignore-end */

/** Nhóm có mặt trong danh sách, theo thứ tự chuẩn (nhóm lạ xếp cuối). */
export function groupsOf(items: readonly { group?: string }[], level: string): string[] {
  const order = GRAMMAR_GROUPS[level as 'N3' | 'N5'] ?? []
  const present = [...new Set(items.map((g) => g.group).filter((g): g is string => Boolean(g)))]
  const rank = (g: string) => (order.includes(g) ? order.indexOf(g) : order.length)
  return present.sort((a, b) => rank(a) - rank(b))
}

/* i18n-ignore-start */
const LABEL_KEYS: Record<string, MessageKey> = {
  'Ôn tập N4': 'grammarGroup.onTapN4',
  'Thời điểm': 'grammarGroup.thoiDiem',
  'Nguyên nhân – kết quả': 'grammarGroup.nguyenNhanKetQua',
  'Suy đoán – truyền đạt': 'grammarGroup.suyDoanTruyenDat',
  'Đối chiếu – tương phản': 'grammarGroup.doiChieuTuongPhan',
  'So sánh – mức độ': 'grammarGroup.soSanhMucDo',
  'Nhấn mạnh – giới hạn': 'grammarGroup.nhanManhGioiHan',
  'Liệt kê – bổ sung': 'grammarGroup.lietKeBoSung',
  'Điều kiện – giả định': 'grammarGroup.dieuKienGiaDinh',
  'Quan điểm – đề tài': 'grammarGroup.quanDiemDeTai',
  'Ý chí – nghĩa vụ – cảm xúc': 'grammarGroup.yChiNghiaVuCamXuc',
  'Động từ ghép – trợ động từ': 'grammarGroup.dongTuGhepTroDongTu',
  'Văn nói': 'grammarGroup.vanNoi',
  'Trợ từ': 'grammarGroup.troTu',
  'Câu cơ bản': 'grammarGroup.cauCoBan',
  'Chỉ thị – nghi vấn': 'grammarGroup.chiThiNghiVan',
  'Tính từ': 'grammarGroup.tinhTu',
  'Động từ – thể ます': 'grammarGroup.dongTuTheMasu',
  'Thể て': 'grammarGroup.the',
  'Mong muốn – rủ rê': 'grammarGroup.mongMuonRuRe',
  'Xin phép – cấm – yêu cầu': 'grammarGroup.xinPhepCamYeuCau',
  'So sánh': 'grammarGroup.soSanh',
  'Thời gian – trình tự': 'grammarGroup.thoiGianTrinhTu',
}
/* i18n-ignore-end */

/** Tên nhóm để hiển thị theo ngôn ngữ giao diện (nhóm lạ giữ nguyên). */
export const groupLabel = (g: string) => (LABEL_KEYS[g] ? t(LABEL_KEYS[g]) : g)

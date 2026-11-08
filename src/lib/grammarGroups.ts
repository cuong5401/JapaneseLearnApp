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

/** Nhóm có mặt trong danh sách, theo thứ tự chuẩn (nhóm lạ xếp cuối). */
export function groupsOf(items: readonly { group?: string }[], level: string): string[] {
  const order = GRAMMAR_GROUPS[level as 'N3' | 'N5'] ?? []
  const present = [...new Set(items.map((g) => g.group).filter((g): g is string => Boolean(g)))]
  const rank = (g: string) => (order.includes(g) ? order.indexOf(g) : order.length)
  return present.sort((a, b) => rank(a) - rank(b))
}

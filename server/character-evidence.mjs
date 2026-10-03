// Reviewed passage boundaries for popular questions. All answers remain verbatim
// excerpts of the current dataset; changed or missing passages fall back to search.
const passages = [
  { character: 'ngo-quyen', topic: /\bbach dang\b/, chunk: 'LS6_B18_C016', from: 'Chiến thắng Bạch Đằng năm 938', to: 'lâu dài cho dân tộc.' },
  { character: 'ngo-quyen', topic: /\bcoc\b/, chunk: 'LS6_B18_C013', from: 'Nếu sai người đem cọc lớn', to: 'không cho chiếc nào ra thoát.?' },
  { character: 'ly-cong-uan', topic: /\b(doi do|dai la)\b/, intent: 'reason', chunk: 'LS7_B15_C005', from: 'thành Đại La,...', to: 'mãi muôn đời' },
  { character: 'ly-cong-uan', topic: /\bthang long\b/, intent: 'reason', chunk: 'LS7_B15_C004', from: 'Sự kiện dời đô mở ra', to: 'phát triển mới cho nước nhà.' },
  { character: 'le-loi', topic: /\blam son\b/, intent: 'reason', chunk: 'LS7_B19_C015', from: 'Thắng lợi của khởi nghĩa Lam Sơn do', to: 'hoàn thành thắng lợi nhiệm vụ giải phóng đất nước.' },
  { character: 'quang-trung', topic: /\b(ngoc hoi|dong da)\b/, intent: 'date', chunk: 'LS8_B08_C019', from: 'Ngày 30 - 1 - 1789', to: 'tấn công đồn Ngọc Hồi (thành phố hà nội).' },
  { character: 'quang-trung', topic: /\bquan thanh\b/, chunk: 'LS11_B07_C016', from: 'Trong cuộc kháng chiến chống quân Thanh', to: 'chỉ trong thời gian ngắn.' },
  { character: 'vo-nguyen-giap', topic: /\bdien bien phu\b/, intent: 'date', chunk: 'LS9_B15_C016', from: 'Chiến dịch Điện Biên Phủ diễn ra', to: 'và chia làm ba đợt.' },
  { character: 'vo-nguyen-giap', topic: /\btuyen truyen giai phong quan\b/, intent: 'date', chunk: 'LS9_B08_C016', from: 'Ngày 22 - 12 - 1944', to: 'được thành lập tại Cao Bằng.' },
]

export function reviewedPassage(dataset, character, query, intent, years) {
  for (const passage of passages) {
    if (passage.character !== character || !passage.topic.test(query) || (passage.intent && passage.intent !== intent)) continue
    const chunk = dataset.chunksById.get(passage.chunk)
    if (!chunk) continue
    const start = chunk.text.indexOf(passage.from)
    const end = chunk.text.indexOf(passage.to, start)
    if (start < 0 || end < start) continue
    const quote = chunk.text.slice(start, end + passage.to.length)
    if (years.some((year) => !quote.includes(year))) continue
    return { chunk, quote }
  }
  return null
}

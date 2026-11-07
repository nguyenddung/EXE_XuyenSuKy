// Reviewed passage boundaries for popular questions, located by lesson and by their first and last words so a
// dataset rebuild that renumbers chunks keeps them. All answers remain verbatim excerpts of the current dataset;
// changed or missing passages fall back to search.
const passages = [
  { character: 'ngo-quyen', topic: /\bbach dang\b/, lesson: 'LS6_B18', from: 'Chiến thắng Bạch Đằng năm 938', to: 'lâu dài cho dân tộc.' },
  { character: 'ngo-quyen', topic: /\bcoc\b/, lesson: 'LS6_B18', from: 'Nếu sai người đem cọc lớn', to: 'không cho chiếc nào ra thoát.' },
  { character: 'ly-cong-uan', topic: /\b(doi do|dai la)\b/, intent: 'reason', lesson: 'LS7_B11', from: 'thành Đại La...', to: 'mãi muôn đời' },
  { character: 'ly-cong-uan', topic: /\bthang long\b/, intent: 'reason', lesson: 'LS7_B11', from: 'Sử chép, khi thuyền nhà vua', to: '(có nghĩa là Rồng bay lên).' },
  { character: 'le-loi', topic: /\blam son\b/, intent: 'reason', lesson: 'LS7_B16', from: 'Khởi nghĩa Lam Sơn thắng lợi là do', to: 'giành thắng lợi cuối cùng.' },
  { character: 'ly-thuong-kiet', topic: /\b(chu dong tien cong|tien cong (quan )?tong|tien cong truoc)\b/, intent: 'reason', lesson: 'LS7_B12', from: 'Sau khi ổn định được biên giới phía Nam', to: '“tiến công trước để tự vệ”.' },
  { character: 'quang-trung', topic: /\b(ngoc hoi|dong da)\b/, intent: 'date', lesson: 'LS8_B08', from: 'Ngày 30 – 1 – 1789', to: 'tấn công đồn Ngọc Hồi (thành phố Hà Nội).' },
  { character: 'quang-trung', topic: /\bquan thanh\b/, lesson: 'LS11_B07', from: 'Trong cuộc kháng chiến chống quân Thanh', to: 'chỉ trong thời gian ngắn.' },
  { character: 'vo-nguyen-giap', topic: /\bdien bien phu\b/, intent: 'date', lesson: 'LS9_B15', from: 'Chiến dịch Điện Biên Phủ diễn ra', to: 'và chia làm ba đợt.' },
  { character: 'vo-nguyen-giap', topic: /\btuyen truyen giai phong quan\b/, intent: 'date', lesson: 'LS9_B08', from: 'Ngày 22 – 12 – 1944', to: 'được thành lập tại Cao Bằng.' },
]

export function reviewedPassage(dataset, character, query, intent, years) {
  for (const passage of passages) {
    if (passage.character !== character || !passage.topic.test(query) || (passage.intent && passage.intent !== intent)) continue
    let found = null
    for (const chunk of dataset.lessonChunks.get(passage.lesson) || []) {
      const start = chunk.text.indexOf(passage.from)
      const end = start < 0 ? -1 : chunk.text.indexOf(passage.to, start)
      if (end >= start && start >= 0) { found = { chunk, quote: chunk.text.slice(start, end + passage.to.length) }; break }
    }
    if (!found) continue
    const { chunk, quote } = found
    if (years.some((year) => !quote.includes(year))) continue
    return { chunk, quote }
  }
  return null
}

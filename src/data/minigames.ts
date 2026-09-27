export const games = [
  { id: 'timeline', title: 'Xếp dòng sử', tag: 'TƯ DUY TRÌNH TỰ', description: 'Cỗ máy thời gian bị xáo trộn. Đưa 5 dấu mốc trở về đúng vị trí!', icon: '⌛', time: '2–3 phút', reward: 60, color: 'sand' },
  { id: 'memory', title: 'Lật thẻ ký ức', tag: 'GHI NHỚ LIÊN KẾT', description: 'Lật thẻ, tìm cặp nhân vật và dấu ấn. Bạn nhớ được bao nhiêu?', icon: '✦', time: '2–4 phút', reward: 60, color: 'green' },
  { id: 'detective', title: 'Thám tử nhân vật', tag: 'SUY LUẬN TỪ MANH MỐI', description: 'Mở hồ sơ bí mật, nối các manh mối và tìm ra nhân vật ẩn danh.', icon: '⌕', time: '3–4 phút', reward: 80, color: 'rose' },
  { id: 'strategy', title: 'Mật lệnh Bạch Đằng', tag: 'RA QUYẾT ĐỊNH', description: 'Đọc địa hình, quan sát con nước và lựa chọn kế sách qua 3 chặng.', icon: '⚑', time: '2–3 phút', reward: 80, color: 'blue' },
] as const
export type GameId = typeof games[number]['id']
export const milestones = [
  { year: 40, label: 'Hai Bà Trưng khởi nghĩa' },
  { year: 938, label: 'Ngô Quyền chiến thắng trên sông Bạch Đằng' },
  { year: 1010, label: 'Lý Công Uẩn dời đô về Thăng Long' },
  { year: 1288, label: 'Nhà Trần chiến thắng Bạch Đằng' },
  { year: 1789, label: 'Quang Trung đại phá quân Thanh' },
]
export const pairs = [
  { name: 'Trần Hưng Đạo', image: 'tran-hung-dao', legacy: 'Bạch Đằng · 1288', explanation: 'Trần Hưng Đạo chỉ huy quân dân nhà Trần đánh bại quân Nguyên trên sông Bạch Đằng năm 1288.' },
  { name: 'Lý Thường Kiệt', image: 'ly-thuong-kiet', legacy: 'Phòng tuyến Như Nguyệt', explanation: 'Phòng tuyến trên sông Như Nguyệt gắn với cuộc kháng chiến chống Tống do Lý Thường Kiệt chỉ huy.' },
  { name: 'Quang Trung', image: 'quang-trung', legacy: 'Ngọc Hồi – Đống Đa · 1789', explanation: 'Quang Trung lãnh đạo cuộc tiến công đánh bại quân Thanh vào mùa xuân Kỷ Dậu 1789.' },
  { name: 'Hai Bà Trưng', image: 'hai-ba-trung', legacy: 'Khởi nghĩa · năm 40', explanation: 'Trưng Trắc và Trưng Nhị lãnh đạo cuộc khởi nghĩa năm 40 chống sự đô hộ của nhà Hán.' },
]
export const cases = [
  { answer: 2, clues: ['Nhân vật gắn với phong trào Tây Sơn.', 'Cuộc hành quân nổi tiếng diễn ra vào mùa xuân Kỷ Dậu.', 'Chiến thắng Ngọc Hồi – Đống Đa năm 1789 gắn với vị hoàng đế này.'] },
  { answer: 0, clues: ['Một danh tướng thời nhà Trần.', 'Giữ vai trò Quốc công Tiết chế trong kháng chiến chống Nguyên – Mông.', 'Tên thật là Trần Quốc Tuấn.'] },
  { answer: 3, clues: ['Hồ sơ này có hai người cùng lãnh đạo.', 'Cuộc khởi nghĩa diễn ra vào năm 40.', 'Hai chị em mang tên Trưng Trắc và Trưng Nhị.'] },
]
export const decisions = [
  { title: 'Đọc dòng sông', scene: 'Năm 1288. Bạn đang tìm hiểu cách quân dân nhà Trần chuẩn bị trận địa. Yếu tố nào cần quan sát trước tiên?', options: ['Chỉ đếm số thuyền', 'Địa hình và quy luật thủy triều', 'Màu sắc cờ hiệu'], answer: 1, explanation: 'Địa hình sông nước và thủy triều giúp tổ chức trận địa cọc và chọn thời điểm tác chiến phù hợp.' },
  { title: 'Giấu trận địa', scene: 'Bãi cọc đã được chuẩn bị. Khi nào có thể dẫn thuyền đối phương vào mà chưa để lộ cọc?', options: ['Khi nước lên che khuất bãi cọc', 'Khi nước cạn lộ hết cọc', 'Bất cứ lúc nào, không cần quan sát'], answer: 0, explanation: 'Lúc nước lên, cọc bị che khuất. Quân Trần dùng thuyền nhẹ khiêu chiến, dẫn đối phương vào trận địa.' },
  { title: 'Chọn thời cơ', scene: 'Thuyền đối phương đã vào trận địa. Nước đang rút. Điều gì tạo nên lợi thế?', options: ['Bãi cọc tự di chuyển', 'Thuyền lớn dễ vượt qua cọc hơn', 'Cọc lộ ra, thuyền mắc cạn; các lực lượng phối hợp tiến công'], answer: 2, explanation: 'Khi nước rút, bãi cọc cản thuyền, kết hợp với tiến công của quân Trần. Chiến thắng đến từ sự chuẩn bị và phối hợp, không chỉ riêng những chiếc cọc.' },
]
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}

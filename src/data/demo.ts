export interface DemoQuestion {
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
}

export interface DemoActivity {
  id: string
  kind: 'lesson' | 'challenge'
  title: string
  intro: string
  reward: number
  question: DemoQuestion
}

export const demoAccount = {
  id: 'minh',
  name: 'Minh',
  email: 'minh@xuyensuki.vn',
  password: 'demo123',
  avatar: 'M',
  baseXp: 750,
  leaderboardXp: 2350,
  streak: 7,
} as const

export const lessons: Record<number, DemoActivity & { chapter: string }> = {
  6: {
    id: 'lesson-6', kind: 'lesson', title: 'Nhà nước Văn Lang ra đời', chapter: 'Khởi nguồn lịch sử',
    intro: 'Cùng tìm hiểu nhà nước đầu tiên trong lịch sử Việt Nam.', reward: 50,
    question: { prompt: 'Nhà nước đầu tiên của người Việt cổ có tên là gì?', options: ['Âu Lạc', 'Văn Lang', 'Đại Việt', 'Đại Cồ Việt'], answerIndex: 1, explanation: 'Văn Lang là nhà nước đầu tiên của người Việt cổ, gắn với thời đại các Vua Hùng.' },
  },
  7: {
    id: 'lesson-7', kind: 'lesson', title: 'Ba lần kháng chiến chống Nguyên – Mông', chapter: 'Đại Việt thời Trần',
    intro: 'Khám phá hào khí Đông A và cách quân dân nhà Trần bảo vệ Đại Việt.', reward: 50,
    question: { prompt: 'Ai là Quốc công Tiết chế chỉ huy quân Đại Việt chống Nguyên – Mông?', options: ['Lý Thường Kiệt', 'Trần Hưng Đạo', 'Quang Trung', 'Ngô Quyền'], answerIndex: 1, explanation: 'Trần Hưng Đạo, tên thật Trần Quốc Tuấn, giữ vai trò Quốc công Tiết chế trong cuộc kháng chiến.' },
  },
  8: {
    id: 'lesson-8', kind: 'lesson', title: 'Việt Nam dưới triều Nguyễn', chapter: 'Việt Nam thời cận đại',
    intro: 'Bước vào giai đoạn nhiều biến động của lịch sử thế kỷ XIX.', reward: 50,
    question: { prompt: 'Triều đại phong kiến cuối cùng của Việt Nam là triều đại nào?', options: ['Nhà Lê', 'Nhà Tây Sơn', 'Nhà Nguyễn', 'Nhà Trần'], answerIndex: 2, explanation: 'Nhà Nguyễn là triều đại phong kiến cuối cùng trong lịch sử Việt Nam.' },
  },
  9: {
    id: 'lesson-9', kind: 'lesson', title: 'Cách mạng tháng Tám', chapter: 'Việt Nam hiện đại',
    intro: 'Tìm hiểu bước ngoặt đưa đất nước đến nền độc lập năm 1945.', reward: 50,
    question: { prompt: 'Cách mạng tháng Tám diễn ra vào năm nào?', options: ['1930', '1945', '1954', '1975'], answerIndex: 1, explanation: 'Cách mạng tháng Tám thành công năm 1945, mở ra kỷ nguyên độc lập.' },
  },
}

export const challengeActivities: Record<string, DemoActivity> = {
  timeline: {
    id: 'challenge-timeline', kind: 'challenge', title: 'Dòng thời gian', intro: 'Chọn sự kiện diễn ra sớm nhất để mở khóa 30 XP.', reward: 30,
    question: { prompt: 'Sự kiện nào diễn ra sớm nhất?', options: ['Chiến thắng Bạch Đằng năm 938', 'Nhà Trần thành lập', 'Cách mạng tháng Tám', 'Quang Trung đại phá quân Thanh'], answerIndex: 0, explanation: 'Chiến thắng Bạch Đằng của Ngô Quyền diễn ra năm 938.' },
  },
  identity: {
    id: 'challenge-identity', kind: 'challenge', title: 'Ai là nhân vật?', intro: 'Đọc dữ kiện và chọn đúng nhân vật lịch sử.', reward: 30,
    question: { prompt: 'Ai gắn với chiến thắng Ngọc Hồi – Đống Đa năm 1789?', options: ['Lê Lợi', 'Quang Trung', 'Ngô Quyền', 'Trần Hưng Đạo'], answerIndex: 1, explanation: 'Quang Trung lãnh đạo cuộc hành quân thần tốc đại phá quân Thanh năm 1789.' },
  },
  quiz: {
    id: 'challenge-quiz', kind: 'challenge', title: 'Trắc nghiệm nhanh', intro: 'Một câu hỏi nhanh để khởi động bộ trắc nghiệm.', reward: 30,
    question: { prompt: 'Lý Công Uẩn dời đô về Thăng Long vào năm nào?', options: ['938', '1010', '1077', '1225'], answerIndex: 1, explanation: 'Năm 1010, Lý Công Uẩn dời đô từ Hoa Lư về Thăng Long.' },
  },
}

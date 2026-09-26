import type { Challenge } from '../types'

export const challenges: Challenge[] = [
  { id: 'timeline', title: 'Dòng thời gian', description: 'Sắp xếp các sự kiện theo đúng thứ tự.', action: 'Chơi ngay', type: 'timeline', color: 'peach' },
  { id: 'identity', title: 'Ai là nhân vật?', description: 'Đoán nhân vật lịch sử qua các dữ kiện.', action: 'Chơi ngay', type: 'identity', color: 'mint' },
  { id: 'quiz', title: 'Trắc nghiệm nhanh', description: 'Một câu hỏi nhanh để kiểm tra kiến thức.', action: 'Bắt đầu', type: 'quiz', color: 'amber' },
]

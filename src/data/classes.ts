import type { SchoolClass } from '../types'

export const classes: SchoolClass[] = [
  { grade: 6, subtitle: 'Khởi nguồn lịch sử', topics: ['Văn Lang', 'Âu Lạc', 'Bắc thuộc'], progress: 35, theme: 'amber' },
  { grade: 7, subtitle: 'Thời đại các triều đại', topics: ['Nhà Lý', 'Nhà Trần', 'Nhà Lê'], progress: 60, recommended: true, theme: 'mint' },
  { grade: 8, subtitle: 'Việt Nam thời cận đại', topics: ['Nhà Nguyễn', 'Pháp xâm lược', 'Phong trào yêu nước'], progress: 15, theme: 'peach' },
  { grade: 9, subtitle: 'Việt Nam hiện đại', topics: ['Cách mạng tháng Tám', 'Kháng chiến chống Pháp', 'Kháng chiến chống Mỹ'], progress: 0, theme: 'blue' },
  { grade: 10, subtitle: 'Tri thức và văn minh', topics: ['Sử học', 'Văn minh', 'Di sản'], progress: 0, theme: 'amber' },
  { grade: 11, subtitle: 'Thế giới và Việt Nam', topics: ['Cách mạng', 'Độc lập', 'Cải cách'], progress: 0, theme: 'mint' },
  { grade: 12, subtitle: 'Lịch sử thế giới hiện đại', topics: ['Quan hệ quốc tế', 'Việt Nam', 'Hồ Chí Minh'], progress: 0, theme: 'peach' },
]

// Shared by the landing page and the dashboard so both open the same entry lesson for each era.
export const eras = [
  { title: 'Thời tiền sử', image: 'prehistoric', lessonId: 'LS6_B05', grade: 6 },
  { title: 'Văn Lang – Âu Lạc', image: 'vanlang', lessonId: 'LS6_B14', grade: 6 },
  { title: 'Thời Bắc thuộc', image: 'bac-thuoc', lessonId: 'LS6_B15', grade: 6 },
  { title: 'Thời Lý', image: 'ly', lessonId: 'LS7_B15', grade: 7 },
  { title: 'Thời Trần', image: 'tran', lessonId: 'LS7_B16', grade: 7 },
  { title: 'Thời Lê sơ', image: 'le', lessonId: 'LS7_B20', grade: 7 },
] as const

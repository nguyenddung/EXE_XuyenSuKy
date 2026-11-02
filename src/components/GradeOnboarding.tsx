import { useState } from 'react'
/** `permanent`: a signed-in student's grade is kept with the account (only an admin changes it later). */
export function GradeOnboarding({ grade, onSelect, permanent = false }: { grade: number; onSelect: (grade: number) => void; permanent?: boolean }) {
  const [selected, setSelected] = useState(grade)
  return <section className="auth-card grade-onboarding" aria-labelledby="grade-title"><span className="section-kicker">HÀNH TRÌNH HỌC TẬP</span><h1 id="grade-title">Bạn đang học lớp mấy?</h1><p>{permanent ? 'Chọn lớp em đang học. Xuyên Sử Ký sẽ chỉ hiện bài học, hành trình và nhân vật của lớp này; muốn đổi lớp, hãy nhờ quản trị viên.' : 'Chọn lớp để nhận bài giảng SGK phù hợp. Khi học thử, bạn có thể đổi lớp bất cứ lúc nào.'}</p><div className="grade-options">{[6, 7, 8, 9, 10, 11, 12].map(value => <button type="button" key={value} aria-pressed={value === selected} onClick={() => setSelected(value)}>Lớp {value}</button>)}</div><button className="button-primary" onClick={() => onSelect(selected)}>Bắt đầu học lớp {selected}</button></section>
}

import { useState } from 'react'
export function GradeOnboarding({ grade, onSelect }: { grade: number; onSelect: (grade: number) => void }) {
  const [selected, setSelected] = useState(grade)
  return <section className="auth-card grade-onboarding" aria-labelledby="grade-title"><span className="section-kicker">HÀNH TRÌNH HỌC TẬP</span><h1 id="grade-title">Bạn đang học lớp mấy?</h1><p>Chọn lớp để nhận bài giảng SGK phù hợp. Bạn có thể đổi lớp trong thư viện bất cứ lúc nào.</p><div className="grade-options">{[6, 7, 8, 9, 10, 11, 12].map(value => <button type="button" key={value} aria-pressed={value === selected} onClick={() => setSelected(value)}>Lớp {value}</button>)}</div><button className="button-primary" onClick={() => onSelect(selected)}>Bắt đầu học lớp {selected}</button></section>
}

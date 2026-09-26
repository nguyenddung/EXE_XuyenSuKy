import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Gift, X } from 'lucide-react'
import type { DemoActivity } from '../data/demo'

interface Props {
  activity: DemoActivity
  alreadyCompleted: boolean
  onComplete: (id: string, reward: number) => void
  onClose: () => void
  onViewProgress: () => void
}

export function ActivityModal({ activity, alreadyCompleted, onComplete, onClose, onViewProgress }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [completedOnOpen] = useState(alreadyCompleted)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const correct = selected === activity.question.answerIndex

  useEffect(() => {
    titleRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = oldOverflow }
  }, [onClose])

  function checkAnswer() {
    if (selected === null) return
    setChecked(true)
    if (correct && !completedOnOpen) onComplete(activity.id, activity.reward)
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="activity-title" className="activity-modal">
    <div className="activity-header"><span className="section-kicker">{activity.kind === 'lesson' ? 'BÀI HỌC TƯƠNG TÁC' : 'THỬ THÁCH LỊCH SỬ'}</span><button type="button" className="modal-close" aria-label="Đóng bài học" onClick={onClose}><X size={21} /></button><h2 id="activity-title" tabIndex={-1} ref={titleRef}>{activity.title}</h2><p>{activity.intro}</p><span className="activity-reward"><Gift size={15} /> +{activity.reward} XP khi trả lời đúng</span></div>
    <div className="activity-content"><h3>{activity.question.prompt}</h3><div className="answer-options" role="group" aria-label="Chọn đáp án">{activity.question.options.map((option, index) => <button key={option} type="button" onClick={() => { if (!checked || !correct) { setSelected(index); setChecked(false) } }} className={`answer-option ${selected === index ? 'selected' : ''} ${checked && selected === index ? correct ? 'is-correct' : 'is-wrong' : ''}`} aria-pressed={selected === index}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
      {checked && <div className={`answer-feedback ${correct ? 'success' : 'retry'}`} role="status">{correct ? <><CheckCircle2 size={19} /><div><strong>Chính xác! {completedOnOpen ? 'Bạn đã hoàn thành phần này.' : `Bạn nhận được ${activity.reward} XP.`}</strong><p>{activity.question.explanation}</p></div></> : <><span>↻</span><div><strong>Chưa đúng, hãy thử lại nhé.</strong><p>Chọn một đáp án khác rồi kiểm tra lại.</p></div></>}</div>}
      <div className="activity-actions">{checked && correct ? <button type="button" className="button-primary" onClick={onViewProgress}>Xem thành quả <ArrowRight size={17} /></button> : <button type="button" className="button-primary" onClick={checkAnswer} disabled={selected === null}>Kiểm tra đáp án <ArrowRight size={17} /></button>}<button type="button" className="button-text" onClick={onClose}>Để sau</button></div>
    </div>
  </section></div>
}

import { Award, Flame, RotateCcw, Star, Trophy } from 'lucide-react'
import { demoAccount } from '../data/demo'
import { rankingsFor } from '../data/leaderboard'
import type { DemoSession } from '../hooks/useDemoSession'

interface Props { session: DemoSession; learningStreak: number; onLogin: () => void; onReset: () => void }

export function UserProgress({ session, learningStreak, onLogin, onReset }: Props) {
  const totalXp = (session.loggedIn ? demoAccount.baseXp : 0) + session.earnedXp
  const level = 5 + Math.floor(totalXp / 1000)
  const currentXp = totalXp % 1000
  const badges = session.loggedIn ? ['Nhà Trần', 'Bạch Đằng', 'Quiz Master'] : []
  if (session.completedActivities.some(id => id.startsWith('lesson-'))) badges.push('Nhà khám phá')
  if (session.completedActivities.some(id => id.startsWith('challenge-'))) badges.push('Chinh phục thử thách')
  if (session.completedActivities.some(id => id.startsWith('minigame-'))) badges.push('Nhà giải mã lịch sử')
  const ranks = rankingsFor(session)

  return (
    <section id="progress" className="section-space bg-cream" aria-labelledby="progress-title">
      <div className="page-shell grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="profile-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-kicker">GÓC NHÀ SỬ HỌC</span>
              <h2 id="progress-title">{session.loggedIn ? <>Xin chào, {(session.name || demoAccount.name)}! <span>✦</span></> : 'Tiến độ học thử của bạn'}</h2>
              <p>{session.loggedIn
                ? `Lớp ${session.grade} · ${session.completedActivities.length} hoạt động đã hoàn thành`
                : `Lớp ${session.grade} · ${session.completedActivities.length} hoạt động. Tiến độ chỉ lưu trên trình duyệt này; đăng nhập để giữ hồ sơ và làm quiz.`}</p>
            </div>
            <div className="profile-avatar">{session.loggedIn ? (session.name?.slice(0, 1).toUpperCase() || demoAccount.avatar) : 'B'}</div>
          </div>
          <div className="level-panel">
            <span className="level-icon"><Star size={23} fill="currentColor" /></span>
            <div className="flex-1"><span>CẤP ĐỘ {level}</span><strong>Nhà Sử Học Cấp {level}</strong></div>
            <span className="level-flame"><Flame size={17} fill="currentColor" /> {learningStreak} ngày</span>
          </div>
          <div className="xp-row"><span>Điểm kinh nghiệm</span><strong>{currentXp} <small>/ 1000 XP</small></strong></div>
          <div className="progress-track xp-track"><span style={{ width: `${currentXp / 10}%` }} /></div>
          <div className="badge-heading"><Award size={18} /><strong>Huy hiệu đã mở khóa</strong></div>
          <div className="badges">{badges.length ? badges.map(badge => <span key={badge}>✦ {badge}</span>) : <span>Hoàn thành hoạt động đầu tiên để mở huy hiệu</span>}</div>
          {session.loggedIn
            ? <button type="button" className="reset-demo" onClick={onReset}><RotateCcw size={14} /> Đặt lại dữ liệu demo</button>
            : <button type="button" className="profile-login" onClick={onLogin}>Đăng nhập để lưu tiến độ →</button>}
        </div>
        <div className="leaderboard-card">
          <div className="leaderboard-heading">
            <div><span className="section-kicker">BẢNG VINH DANH</span><h2>Những nhà thám hiểm nổi bật</h2></div>
            <Trophy size={29} />
          </div>
          <div className="leaderboard-list">
            {ranks.map((entry, index) => <div className={`leaderboard-entry ${entry.isMe ? 'is-me' : ''}`} key={entry.name}>
              <span className="rank">0{index + 1}</span>
              <span className={`leader-avatar leader-${index}`}>{entry.avatar}</span>
              <strong>{entry.name}</strong>
              <span className="leader-points">{entry.xp.toLocaleString('vi-VN')} XP</span>
            </div>)}
          </div>
          <p className="leaderboard-note">Tiếp tục học để leo cao trên bảng xếp hạng!</p>
        </div>
      </div>
    </section>
  )
}

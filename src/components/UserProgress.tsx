import { Award, Flame, RotateCcw, Star, Trophy } from 'lucide-react'
import { demoAccount } from '../data/demo'
import { leaderboard } from '../data/leaderboard'
import type { DemoSession } from '../hooks/useDemoSession'

interface Props { session: DemoSession; onLogin: () => void; onReset: () => void }

export function UserProgress({ session, onLogin, onReset }: Props) {
  const totalXp = demoAccount.baseXp + session.earnedXp
  const level = 5 + Math.floor(totalXp / 1000)
  const currentXp = totalXp % 1000
  const badges = ['Nhà Trần', 'Bạch Đằng', 'Quiz Master']
  if (session.completedActivities.some(id => id.startsWith('lesson-'))) badges.push('Nhà khám phá')
  if (session.completedActivities.some(id => id.startsWith('challenge-'))) badges.push('Chinh phục thử thách')
  if (session.completedActivities.some(id => id.startsWith('minigame-'))) badges.push('Nhà giải mã lịch sử')
  const ranks = leaderboard.map(entry => entry.name === demoAccount.name ? { ...entry, xp: demoAccount.leaderboardXp + session.earnedXp } : entry).sort((a, b) => b.xp - a.xp)

  return (
    <section id="progress" className="section-space bg-cream" aria-labelledby="progress-title">
      <div className="page-shell grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="profile-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-kicker">GÓC NHÀ SỬ HỌC</span>
              <h2 id="progress-title">Xin chào, {demoAccount.name}! <span>✦</span></h2>
              <p>{session.loggedIn
                ? `Lớp ${session.grade} · ${session.completedActivities.length} hoạt động đã hoàn thành`
                : 'Hồ sơ mẫu của Minh. XP minigame lưu trên trình duyệt; đăng nhập để mở bài học.'}</p>
            </div>
            <div className="profile-avatar">{demoAccount.avatar}</div>
          </div>
          <div className="level-panel">
            <span className="level-icon"><Star size={23} fill="currentColor" /></span>
            <div className="flex-1"><span>CẤP ĐỘ {level}</span><strong>Nhà Sử Học Cấp {level}</strong></div>
            <span className="level-flame"><Flame size={17} fill="currentColor" /> {demoAccount.streak} ngày</span>
          </div>
          <div className="xp-row"><span>Điểm kinh nghiệm</span><strong>{currentXp} <small>/ 1000 XP</small></strong></div>
          <div className="progress-track xp-track"><span style={{ width: `${currentXp / 10}%` }} /></div>
          <div className="badge-heading"><Award size={18} /><strong>Huy hiệu đã mở khóa</strong></div>
          <div className="badges">{badges.map(badge => <span key={badge}>✦ {badge}</span>)}</div>
          {session.loggedIn
            ? <button type="button" className="reset-demo" onClick={onReset}><RotateCcw size={14} /> Đặt lại dữ liệu demo</button>
            : <button type="button" className="profile-login" onClick={onLogin}>Đăng nhập để bắt đầu →</button>}
        </div>
        <div className="leaderboard-card">
          <div className="leaderboard-heading">
            <div><span className="section-kicker">BẢNG VINH DANH</span><h2>Những nhà thám hiểm nổi bật</h2></div>
            <Trophy size={29} />
          </div>
          <div className="leaderboard-list">
            {ranks.map((entry, index) => <div className="leaderboard-entry" key={entry.name}>
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

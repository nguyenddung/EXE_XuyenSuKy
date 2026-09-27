import { ArrowUpRight, Check, Gamepad2, Trophy } from 'lucide-react'
import { games, type GameId } from '../data/minigames'
interface Props { completedActivities: string[]; onTry: (id: GameId) => void }
export function ChallengeSection({ completedActivities, onTry }: Props) {
  const count = games.filter(game => completedActivities.includes(`minigame-${game.id}`)).length
  return <section id="challenges" className="section-space arcade-section" aria-labelledby="challenges-title"><div className="page-shell">
    <div className="section-heading"><div><span className="section-kicker">PHÒNG CHƠI XUYÊN THỜI GIAN</span><h2 id="challenges-title">Chơi một ván. Nhớ một trang sử.</h2><p>Bốn cách chơi, bốn cách khám phá. Sai cũng là một bước để hiểu thêm.</p></div><span className="arcade-progress"><Trophy size={18} /> {count}/4 đã chinh phục</span></div>
    <div className="arcade-grid">{games.map((game, index) => { const done = completedActivities.includes(`minigame-${game.id}`); return <article className={`game-card game-${game.color}`} key={game.id}><div className="game-card-top"><span>0{index + 1} / PHÒNG THỬ THÁCH</span><span>{game.time}</span></div><div className="game-art" aria-hidden="true"><span>{game.icon}</span><i>{game.id === 'timeline' ? '40 — ? — 1789' : game.id === 'memory' ? 'GHÉP ĐÔI DẤU ẤN' : game.id === 'detective' ? 'HỒ SƠ BÍ MẬT' : 'ĐỊA HÌNH × THỜI CƠ'}</i></div><span className="game-tag">{game.tag}</span><h3>{game.title}</h3><p>{game.description}</p><div className="game-card-bottom"><span>{done ? <><Check size={15} /> Đã nhận XP</> : `+${game.reward} XP`}</span><button onClick={() => onTry(game.id)} type="button">{done ? 'Chơi lại' : 'Vào chơi'} <ArrowUpRight size={17} /></button></div></article> })}</div>
    <p className="arcade-note"><Gamepad2 size={16} /> Chơi ngay không cần đăng nhập · Tiến độ lưu trên trình duyệt · Không giới hạn thời gian</p>
  </div></section>
}

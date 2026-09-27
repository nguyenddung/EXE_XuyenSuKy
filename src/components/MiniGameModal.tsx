import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowRight, Lightbulb, RotateCcw, Trophy, X } from 'lucide-react'
import { cases, decisions, games, milestones, pairs, shuffle, type GameId } from '../data/minigames'

type Finish = (summary: string, stars: number) => void
function Feedback({ children }: { children: React.ReactNode }) { return <div className="game-feedback" role="status">{children}</div> }

function TimelineGame({ finish }: { finish: Finish }) {
  const [order, setOrder] = useState(() => shuffle(milestones))
  const [checks, setChecks] = useState(0)
  const [hint, setHint] = useState(false)
  const [message, setMessage] = useState('')
  function move(index: number, direction: number) { setOrder(old => { const next = [...old]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next }); setMessage('') }
  function check() { const correct = order.filter((item, i) => item.year === milestones[i].year).length; setChecks(checks + 1); if (correct === order.length) finish('Bạn đã nối đúng 5 dấu mốc từ năm 40 đến 1789. Nhớ phân biệt hai chiến thắng Bạch Đằng: Ngô Quyền năm 938 và nhà Trần năm 1288.', hint ? 1 : checks === 0 ? 3 : 2); else setMessage(`${correct}/5 vị trí chính xác. Hãy tìm sự kiện sớm nhất trước, rồi kiểm tra lại. Bạn không mất lượt!`) }
  return <><p className="game-instruction">Dùng nút ↑ ↓ để xếp từ <strong>sớm nhất đến muộn nhất</strong>. Có thể dùng bàn phím Tab và Enter.</p><ol className="timeline-puzzle">{order.map((item, index) => <li key={item.year}><span className="slot-number">{index + 1}</span><span>{item.label}{hint && <small>Năm {item.year}</small>}</span><div><button aria-label={`Đưa ${item.label} lên`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button aria-label={`Đưa ${item.label} xuống`} disabled={index === order.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button></div></li>)}</ol>{message && <Feedback>{message}</Feedback>}<div className="game-controls"><button className="button-primary" onClick={check}>Kiểm tra dòng sử <ArrowRight size={16} /></button><button className="game-text-button" onClick={() => setHint(true)} disabled={hint}><Lightbulb size={16} /> {hint ? 'Đã mở năm gợi ý' : 'Gợi ý năm'}</button></div></>
}

function MemoryGame({ finish }: { finish: Finish }) {
  const [deck] = useState(() => shuffle(pairs.flatMap((pair, pairId) => [{ pairId, type: 'person', text: pair.name }, { pairId, type: 'legacy', text: pair.legacy }])))
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [turns, setTurns] = useState(0)
  const isPair = open.length === 2 && deck[open[0]].pairId === deck[open[1]].pairId
  function reveal(index: number) { if (open.length === 2 || open.includes(index) || matched.includes(deck[index].pairId)) return; const next = [...open, index]; setOpen(next); if (next.length === 2) { setTurns(turns + 1); if (deck[next[0]].pairId === deck[index].pairId) setMatched([...matched, deck[index].pairId]) } }
  return <><p className="game-instruction">Lật hai thẻ để ghép <strong>nhân vật ↔ dấu ấn</strong>. Đọc giải thích rồi tiếp tục. Không cần chạy đua với đồng hồ.</p><div className="game-meter"><span>{matched.length}/4 cặp đã tìm</span><span>{turns} lượt lật</span></div><div className="memory-grid">{deck.map((card, index) => { const shown = open.includes(index) || matched.includes(card.pairId); return <button key={index} className={`memory-tile ${shown ? 'revealed' : ''} ${matched.includes(card.pairId) ? 'matched' : ''}`} onClick={() => reveal(index)} disabled={matched.includes(card.pairId) || open.includes(index) || open.length === 2} aria-label={shown ? card.text : `Lật thẻ ${index + 1}`} aria-pressed={shown}>{shown ? <>{card.type === 'person' && <img src={`/images/characters/${pairs[card.pairId].image}.webp`} alt="" />}<span>{card.text}</span></> : <><b>✦</b><small>XUYÊN SỬ KÍ</small></>}</button> })}</div>{open.length === 2 && <Feedback><strong>{isPair ? 'Đúng cặp rồi! ' : 'Hai thẻ chưa cùng một dấu ấn. '}</strong>{isPair ? pairs[deck[open[0]].pairId].explanation : 'Ghi nhớ vị trí, úp lại và thử cặp khác.'}</Feedback>}{open.length === 2 && <button className="button-primary" onClick={() => matched.length === pairs.length ? finish(`Bạn ghép đủ 4 cặp trong ${turns} lượt. Liên kết tên người với dấu ấn giúp nhớ lâu hơn việc học từng tên riêng lẻ.`, turns <= 6 ? 3 : turns <= 10 ? 2 : 1) : setOpen([])}>{matched.length === pairs.length ? 'Nhận thành quả' : isPair ? 'Tìm cặp tiếp theo' : 'Úp thẻ và thử tiếp'} <ArrowRight size={16} /></button>}</>
}

function DetectiveGame({ finish }: { finish: Finish }) {
  const [round, setRound] = useState(0)
  const [clues, setClues] = useState(1)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [points, setPoints] = useState(0)
  const current = cases[round]
  function choose(index: number) { if (solved) return; if (index === current.answer) { setSolved(true); setPoints(points + Math.max(1, 4 - clues - wrong.length)) } else { setWrong([...wrong, index]) } }
  function next() { if (round === cases.length - 1) finish(`Bạn giải mã cả 3 hồ sơ, đạt ${points}/9 điểm suy luận. Mỗi manh mối bổ sung giúp thu hẹp lựa chọn; luôn đối chiếu nhiều dữ kiện trước khi kết luận.`, points >= 8 ? 3 : points >= 5 ? 2 : 1); else { setRound(round + 1); setClues(1); setWrong([]); setSolved(false) } }
  return <><div className="game-meter"><span>Hồ sơ 0{round + 1} / 03</span><span>{points} điểm suy luận</span></div><p className="game-instruction">Nhận diện nhân vật với ít manh mối nhất. Mở thêm gợi ý khi cần; bạn vẫn nhận đủ XP khi giải hết hồ sơ.</p><div className="clue-list">{current.clues.slice(0, clues).map((clue, index) => <p key={clue}><span>0{index + 1}</span>{clue}</p>)}</div><button className="game-text-button" disabled={clues === 3 || solved} onClick={() => setClues(clues + 1)}><Lightbulb size={16} /> Mở manh mối ({clues}/3)</button><div className="suspect-grid">{pairs.map((pair, index) => <button key={pair.name} className={`suspect ${solved && index === current.answer ? 'correct' : ''}`} onClick={() => choose(index)} disabled={solved || wrong.includes(index)}><img src={`/images/characters/${pair.image}.webp`} alt="" /><span>{pair.name}</span>{wrong.includes(index) && <small>Đã loại trừ</small>}</button>)}</div>{(wrong.length > 0 || solved) && <Feedback>{solved ? pairs[current.answer].explanation : 'Chưa khớp hồ sơ. Hãy đọc kỹ dữ kiện hoặc mở thêm manh mối.'}</Feedback>}{solved && <button className="button-primary" onClick={next}>{round === 2 ? 'Hoàn tất điều tra' : 'Mở hồ sơ tiếp theo'} <ArrowRight size={16} /></button>}</>
}

function StrategyGame({ finish }: { finish: Finish }) {
  const [stage, setStage] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const current = decisions[stage]
  const correct = selected === current.answer
  function choose(index: number) { if (correct) return; setSelected(index); if (index !== current.answer) setMistakes(mistakes + 1) }
  function next() { if (stage === 2) finish('Bạn đã giải được mật lệnh: hiểu địa hình → tận dụng nước lên → phối hợp khi nước rút. Đây là mô phỏng học tập giản lược, không phải tái dựng đầy đủ trận chiến.', mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1); else { setStage(stage + 1); setSelected(null) } }
  return <><div className={`river-scene river-stage-${stage}`} aria-hidden="true"><span className="river-land">BẠCH ĐẰNG · 1288</span><div className="river-boats">⛵　⛵　⛵</div><div className="river-stakes">▲　▲　▲　▲　▲</div><small>{stage === 0 ? 'Quan sát địa hình' : stage === 1 ? 'Triều lên · cọc chìm' : 'Triều rút · cọc lộ'}</small></div><div className="game-meter"><span>Chặng {stage + 1}/3</span><span>Mô phỏng chiến thuật</span></div><h3 className="game-question">{current.title}</h3><p className="game-instruction">{current.scene}</p><div className="strategy-options">{current.options.map((option, index) => <button className={`${selected === index ? correct ? 'correct' : 'incorrect' : ''}`} key={option} onClick={() => choose(index)} disabled={correct} aria-pressed={selected === index}><b>{String.fromCharCode(65 + index)}</b>{option}</button>)}</div>{selected !== null && <Feedback><strong>{correct ? 'Kế sách hợp lý. ' : 'Hãy cân nhắc lại. '}</strong>{correct ? current.explanation : stage === 0 ? 'Số lượng chưa đủ để quyết định; hãy quan sát môi trường tự nhiên.' : stage === 1 ? 'Nếu cọc lộ rõ, đối phương có thể phát hiện và tránh trận địa.' : 'Hãy kết hợp tác động của nước rút với trận địa và lực lượng.'}</Feedback>}{correct && <button className="button-primary" onClick={next}>{stage === 2 ? 'Hoàn tất mật lệnh' : 'Sang chặng tiếp theo'} <ArrowRight size={16} /></button>}<a className="game-source" href="https://baotanglichsuquocgia.vn/vi/Articles/3096/18594/tim-hieu-ve-nhung-chiec-coc-bach-djang-nam-1288-hien-djang-trung-bay-o-bao-tang-lich-su-quoc-gia.html" target="_blank" rel="noreferrer">Đọc thêm: Cọc Bạch Đằng · Bảo tàng Lịch sử Quốc gia ↗</a></>
}

interface Props { gameId: GameId; completed: boolean; onComplete: (id: string, reward: number) => void; onClose: () => void }
export function MiniGameModal({ gameId, completed, onComplete, onClose }: Props) {
  const game = games.find(item => item.id === gameId)!
  const [result, setResult] = useState<{ summary: string; stars: number } | null>(null)
  const [run, setRun] = useState(0)
  const [rewarded, setRewarded] = useState(completed)
  const [newReward, setNewReward] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const closeRef = useRef(onClose); closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; heading.current?.focus()
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'Tab') {
        const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? [])
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => { document.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  useEffect(() => { if (result) { heading.current?.focus(); panel.current?.scrollTo({ top: 0 }) } }, [result])
  function finish(summary: string, stars: number) { if (result) return; if (!rewarded) { onComplete(`minigame-${gameId}`, game.reward); setRewarded(true); setNewReward(true) } setResult({ summary, stars }) }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} className="minigame-modal" role="dialog" aria-modal="true" aria-labelledby="game-title"><header className="minigame-header"><span className="section-kicker">{game.tag}</span><button className="modal-close" aria-label="Đóng minigame" onClick={onClose}><X size={21} /></button><h2 id="game-title" ref={heading} tabIndex={-1}>{result ? 'Thêm một trang sử được mở!' : game.title}</h2><p>{rewarded ? 'Chơi lại để luyện tập · XP chỉ nhận một lần mỗi trò' : `Hoàn thành để nhận ${game.reward} XP · Không giới hạn lượt thử`}</p></header><div className="minigame-body">{result ? <div className="game-result"><Trophy size={50} /><div className="result-stars" aria-label={`${result.stars} trên 3 sao`}>{'★'.repeat(result.stars)}<span>{'☆'.repeat(3 - result.stars)}</span></div><h3>{newReward ? `+${game.reward} XP vào hành trình!` : 'Một lượt luyện tập thật tốt!'}</h3><p>{result.summary}</p><small>Tiến độ được lưu trên trình duyệt này. Sao phản ánh lượt chơi; không ảnh hưởng XP.</small><div className="game-controls"><button className="button-primary" onClick={() => { setResult(null); setNewReward(false); setRun(run + 1) }}><RotateCcw size={16} /> Chơi lại</button><button className="button-outline" onClick={onClose}>Khám phá trò khác</button></div></div> : <div key={run}>{gameId === 'timeline' ? <TimelineGame finish={finish} /> : gameId === 'memory' ? <MemoryGame finish={finish} /> : gameId === 'detective' ? <DetectiveGame finish={finish} /> : <StrategyGame finish={finish} />}</div>}</div></section></div>
}

import { MiniGameModal } from '../components/MiniGameModal'
import type { GameId } from '../data/minigames'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HomeWelcome } from '../components/HomeWelcome'
import { ImageCredits } from '../components/ImageCredits'
import type { Character } from '../types'
import type { DemoActivity } from '../data/demo'
import { demoAccount, lessons } from '../data/demo'
import { useDemoSession } from '../hooks/useDemoSession'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { ClassSelection } from '../components/ClassSelection'
import { ContinueJourney } from '../components/ContinueJourney'
import { HistoryTimeline } from '../components/HistoryTimeline'
import { CharacterSection } from '../components/CharacterSection'
import { CharacterChatModal } from '../components/CharacterChatModal'
import { ChallengeSection } from '../components/ChallengeSection'
import { UserProgress } from '../components/UserProgress'
import { StatsSection } from '../components/StatsSection'
import { Footer } from '../components/Footer'
import { LoginModal } from '../components/LoginModal'
import { ActivityModal } from '../components/ActivityModal'

export function HomePage({ landing = false }: { landing?: boolean }) {
  const navigate = useNavigate()
  useEffect(() => {
    const target = window.location.hash.slice(1)
    if (target) document.getElementById(target)?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [landing])
  const { session, login, logout, selectGrade, reset, completeActivity } = useDemoSession()
  const [activeGame, setActiveGame] = useState<GameId | null>(null)
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null)
  const [activeActivity, setActiveActivity] = useState<DemoActivity | null>(null)
  const [pendingActivity, setPendingActivity] = useState<DemoActivity | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  function openActivity(activity: DemoActivity) {
    if (session.loggedIn) setActiveActivity(activity)
    else { setPendingActivity(activity); setLoginOpen(true) }
  }

  function handleLogin(email: string, password: string) {
    if (!login(email, password)) return false
    setLoginOpen(false)
    setNotice(`Chào mừng ${demoAccount.name} trở lại!`)
    if (pendingActivity) { setActiveActivity(pendingActivity); setPendingActivity(null) }
    if (landing) navigate('/home')
    return true
  }

  function handleSelectGrade(grade: number) {
    selectGrade(grade)
    if (landing) { navigate('/home'); return }
    document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' })
    setNotice(`Đã chọn Lớp ${grade}. Hãy mở bài học để khám phá!`)
  }

  function viewProgress() {
    setActiveActivity(null)
    window.setTimeout(() => document.getElementById('progress')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div id="top" className={landing ? 'landing-page' : 'learning-page'}>
      <Navbar
        loggedIn={session.loggedIn}
        onLogin={() => setLoginOpen(true)}
        onLogout={() => {
          logout()
          setNotice('Bạn đã đăng xuất. Tiến độ demo vẫn được lưu trên trình duyệt này.')
        }}
      />
      <main>
        {landing ? <Hero /> : <HomeWelcome session={session} />}

        {!landing && <ContinueJourney
          grade={session.grade}
          completed={session.completedActivities.includes(`lesson-${session.grade}`)}
          onContinue={() => openActivity(lessons[session.grade])}
        />}
        <ClassSelection selectedGrade={session.grade} completedActivities={session.completedActivities} onSelect={handleSelectGrade} />
        <HistoryTimeline />
        <CharacterSection onChat={setActiveCharacter} />
        <ChallengeSection completedActivities={session.completedActivities} onTry={setActiveGame} />
        {!landing && <UserProgress
          session={session}
          onLogin={() => setLoginOpen(true)}
          onReset={() => {
            reset()
            setNotice('Đã đặt lại hành trình demo của Minh.')
          }}
        />}
        <StatsSection />
      </main>
      <ImageCredits />
      <Footer />
      {notice && <div className="toast" role="status">✦ {notice}</div>}
      {activeGame && <MiniGameModal key={activeGame} gameId={activeGame} completed={session.completedActivities.includes(`minigame-${activeGame}`)} onComplete={completeActivity} onClose={() => setActiveGame(null)} />}
      {activeCharacter && <CharacterChatModal key={activeCharacter.id} character={activeCharacter} onClose={() => setActiveCharacter(null)} />}
      {loginOpen && <LoginModal onClose={() => { setLoginOpen(false); setPendingActivity(null) }} onLogin={handleLogin} />}
      {activeActivity && <ActivityModal
        key={activeActivity.id}
        activity={activeActivity}
        alreadyCompleted={session.completedActivities.includes(activeActivity.id)}
        onComplete={completeActivity}
        onClose={() => setActiveActivity(null)}
        onViewProgress={viewProgress}
      />}
    </div>
  )
}

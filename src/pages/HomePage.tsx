import { LearningHub } from '../components/LearningHub'
import { useLearningJournal, streak } from '../hooks/useLearningJournal'
import { useHistoryDataset } from '../hooks/useHistoryDataset'
import { MiniGameModal } from '../components/MiniGameModal'
import type { GameId } from '../data/minigames'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dashboard } from '../components/Dashboard'
import { ImageCredits } from '../components/ImageCredits'
import type { Character } from '../types'
import type { DemoActivity } from '../data/demo'
import { demoAccount } from '../data/demo'
import { useDemoSession } from '../hooks/useDemoSession'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { ClassSelection } from '../components/ClassSelection'
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
  const learning = useLearningJournal()
  const dataset = useHistoryDataset()
  const [librarySource, setLibrarySource] = useState<'dataset' | 'demo'>(() => {
    try { return sessionStorage.getItem('xuyen-su-ky-library-source') === 'demo' ? 'demo' : 'dataset' } catch { return 'dataset' }
  })
  useEffect(() => { try { sessionStorage.setItem('xuyen-su-ky-library-source', librarySource) } catch { /* Reading still works without storage. */ } }, [librarySource])
  const [requestedLessonId, setRequestedLessonId] = useState<string | null>(null)
  const recommendation = dataset.metadata?.grades.find((item) => item.grade === session.grade)?.recommendation
  const gradeRead = learning.journal.read.filter((id) => id.startsWith(`LS${session.grade}_B`)).length
  const gradeCount = dataset.metadata?.grades.find((item) => item.grade === session.grade)?.lessonCount || 0
  function completeLearning(id: string, reward: number) {
    completeActivity(id, reward)
    learning.record(id, id.startsWith('minigame-') ? 'game' : 'quiz')
  }
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
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })
    setNotice(`Đã chọn Lớp ${grade}. Hãy mở bài học để khám phá!`)
  }

  function viewProgress() {
    setActiveActivity(null)
    window.setTimeout(() => document.getElementById('progress')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const sections = <>
        <ClassSelection selectedGrade={session.grade} completedActivities={session.completedActivities} onSelect={handleSelectGrade} metadata={dataset.metadata} readLessons={learning.journal.read} />
        <LearningHub learning={learning} grade={session.grade} completed={session.completedActivities} onQuiz={openActivity} dataset={dataset} source={librarySource} onSourceChange={setLibrarySource} requestedLessonId={requestedLessonId} onRequestHandled={() => setRequestedLessonId(null)} />
        <HistoryTimeline />
        <CharacterSection onChat={setActiveCharacter} />
        <ChallengeSection completedActivities={session.completedActivities} onTry={setActiveGame} />
        {!landing && <UserProgress
          session={session}
          learningStreak={streak(learning.journal.events)}
          onLogin={() => setLoginOpen(true)}
          onReset={() => {
            if (!window.confirm('Đặt lại toàn bộ tiến độ, bài đã lưu và ghi chú trên trình duyệt này?')) return
            reset()
            learning.resetJournal()
            setNotice('Đã đặt lại hành trình demo của Minh.')
          }}
        />}
        <StatsSection />
      </>

  return (
    <div className={landing ? 'landing-page' : 'learning-page'}>
      {landing ? <>
        <Navbar loggedIn={session.loggedIn} onLogin={() => setLoginOpen(true)} onLogout={() => { logout(); setNotice('Bạn đã đăng xuất. Tiến độ demo vẫn được lưu trên trình duyệt này.') }} />
        <main><Hero />{sections}</main><ImageCredits /><Footer />
      </> : <Dashboard
        session={session}
        readCount={gradeRead}
        gradeCount={gradeCount}
        recommendedLessonId={recommendation?.id}
        learningStreak={streak(learning.journal.events)}
        onLogin={() => setLoginOpen(true)}
        onLogout={() => { logout(); setNotice('Bạn đã đăng xuất. Tiến độ demo vẫn được lưu trên trình duyệt này.') }}
        onOpenLesson={(id) => { setLibrarySource('dataset'); setRequestedLessonId(id) }}
        onSelectGrade={selectGrade}
        onQuiz={openActivity}
        onGame={setActiveGame}
        onChat={setActiveCharacter}
      >{sections}<ImageCredits /><Footer /></Dashboard>}
      {notice && <div className="toast" role="status">✦ {notice}</div>}
      {activeGame && <MiniGameModal key={activeGame} gameId={activeGame} completed={session.completedActivities.includes(`minigame-${activeGame}`)} onComplete={completeLearning} onClose={() => setActiveGame(null)} />}
      {activeCharacter && <CharacterChatModal key={activeCharacter.id} character={activeCharacter} onClose={() => setActiveCharacter(null)} onOpenLesson={(id) => { setActiveCharacter(null); setLibrarySource('dataset'); setRequestedLessonId(id) }} />}
      {loginOpen && <LoginModal onClose={() => { setLoginOpen(false); setPendingActivity(null) }} onLogin={handleLogin} />}
      {activeActivity && <ActivityModal
        key={activeActivity.id}
        activity={activeActivity}
        alreadyCompleted={session.completedActivities.includes(activeActivity.id)}
        onComplete={completeLearning}
        onClose={() => setActiveActivity(null)}
        onViewProgress={viewProgress}
      />}
    </div>
  )
}

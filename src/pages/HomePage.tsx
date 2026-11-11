import { GradeOnboarding } from '../components/GradeOnboarding'
import { LearningHub } from '../components/LearningHub'
import { useLearningJournal, streak } from '../hooks/useLearningJournal'
import { useHistoryDataset } from '../hooks/useHistoryDataset'
import { MiniGameModal } from '../components/MiniGameModal'
import type { GameId } from '../data/minigames'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LessonCollection } from '../components/StudyPlan'
import { Dashboard } from '../components/Dashboard'
import { ImageCredits } from '../components/ImageCredits'
import type { Character, CharacterInteractionMode } from '../types'
import type { DemoActivity } from '../data/demo'
import { gradeLocked, hasAppAccess, isLearner, storageOwner, useDemoSession } from '../hooks/useDemoSession'
import { chooseOwnGrade, findUserByEmail, readSchool, syncProgress, writeSchool, type Role } from '../lib/school'
import { Navbar } from '../components/Navbar'
import { Hero, LandingCta } from '../components/Hero'
import { ClassSelection } from '../components/ClassSelection'
import { HistoryTimeline } from '../components/HistoryTimeline'
import { CharacterSection } from '../components/CharacterSection'
import { CharacterChatModal } from '../components/CharacterChatModal'
import { CompanionWidget } from '../components/CompanionWidget'
import { ChallengeSection } from '../components/ChallengeSection'
import { UserProgress } from '../components/UserProgress'
import { StatsSection } from '../components/StatsSection'
import { Footer } from '../components/Footer'
import { LoginModal } from '../components/LoginModal'
import { ActivityModal } from '../components/ActivityModal'
import { JourneySection } from '../components/JourneySection'
import type { JourneyLaunch } from '../components/LessonJourney'
import { useJourney } from '../hooks/useJourney'
import { showSection } from '../lib/sections'
import { historyApi } from '../lib/historyApi'

export function HomePage({ landing = false }: { landing?: boolean }) {
  const navigate = useNavigate()
  // The learning app positions its own sections (see Dashboard); the landing page is one long page.
  useEffect(() => {
    if (!landing) return
    const target = window.location.hash.slice(1)
    if (target) document.getElementById(target)?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [landing])
  const { session, login, startGuest, logout, selectGrade, reset, completeActivity, recordGame } = useDemoSession()
  const authenticated = hasAppAccess(session)
  // A signed-in student sees only their own grade; grade choices stay on the landing page and in guest mode.
  const locked = !landing && gradeLocked(session)
  const chatOwner = storageOwner(session)
  const learning = useLearningJournal()
  const dataset = useHistoryDataset()
  const [librarySource, setLibrarySource] = useState<'dataset' | 'demo'>(() => {
    try { return sessionStorage.getItem('xuyen-su-ky-library-source') === 'demo' ? 'demo' : 'dataset' } catch { return 'dataset' }
  })
  useEffect(() => { try { sessionStorage.setItem('xuyen-su-ky-library-source', librarySource) } catch { /* Reading still works without storage. */ } }, [librarySource])
  const [requestedCollection, setRequestedCollection] = useState<{ filter: LessonCollection; token: number } | null>(null)
  const [requestedLessonId, setRequestedLessonId] = useState<string | null>(null)
  const location = useLocation()
  // Era cards on the landing page hand over the lesson to open once the dashboard mounts.
  useEffect(() => {
    const request = location.state as { lessonId?: string; grade?: number } | null
    if (landing || !request?.lessonId) return
    if (gradeLocked(session) && !request.lessonId.startsWith(`LS${session.grade}_B`)) {
      navigate(location.pathname, { replace: true, state: null })
      setNotice(`Bài này thuộc lớp khác. Tài khoản của em học Lớp ${session.grade}.`)
      return
    }
    if (request.grade) selectGrade(request.grade)
    setLibrarySource('dataset')
    setRequestedLessonId(request.lessonId)
    navigate(location.pathname, { replace: true, state: null })
    window.setTimeout(() => showSection('library'), 60)
  }, [landing, location.state])
  const recommendation = dataset.metadata?.grades.find((item) => item.grade === session.grade)?.recommendation
  const gradeRead = learning.journal.read.filter((id) => id.startsWith(`LS${session.grade}_B`)).length
  const gradeCount = dataset.metadata?.grades.find((item) => item.grade === session.grade)?.lessonCount || 0
  const journey = useJourney(session.grade, locked)
  const [journeyLaunch, setJourneyLaunch] = useState<(JourneyLaunch & { token: number }) | null>(null)
  // Journey XP is earned per answer and stored with the journey progress; progress panels show it with activity XP.
  const progressSession = { ...session, earnedXp: session.earnedXp + journey.totalXp }
  function completeLearning(id: string, reward: number) {
    completeActivity(id, reward)
    learning.record(id, id.startsWith('minigame-') ? 'game' : 'quiz')
  }
  const [activeGame, setActiveGame] = useState<GameId | null>(null)
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null)
  const [characterMode, setCharacterMode] = useState<CharacterInteractionMode>('chat')
  // Text and voice conversations with the AI characters are for signed-in members; a guest signs in first and the chosen conversation then opens.
  const [pendingCharacter, setPendingCharacter] = useState<{ character: Character; mode: CharacterInteractionMode } | null>(null)
  function openCharacter(character: Character, mode: CharacterInteractionMode = 'chat') {
    if (!session.loggedIn) { setPendingActivity(null); setPendingCharacter({ character, mode }); setLoginOpen(true); return }
    setCharacterMode(mode); setActiveCharacter(character)
  }
  // A character who cannot know about a later time hands the student over to one who lived then.
  async function switchCharacter(characterId: string) {
    try { const next = await historyApi<Character>(`characters/${characterId}`); setCharacterMode('chat'); setActiveCharacter(next) }
    catch (error) { setNotice((error as Error).message) }
  }
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
    else { setPendingCharacter(null); setPendingActivity(activity); setLoginOpen(true) }
  }

  async function handleLogin(email: string, password: string, remember: boolean, role: Role) {
    const result = await login(email, password, remember, role)
    if (result !== true) return result
    setLoginOpen(false)
    // Teachers and admins start in their own area; students stay where they signed in.
    const member = findUserByEmail(readSchool(), email)
    if (member && member.role !== 'student') { navigate(member.role === 'admin' ? '/admin' : '/giao-vien'); return true }
    setNotice(`Chào mừng ${email.trim().split('@')[0]} trở lại!`)

    return true
  }

  useEffect(() => {
    if (session.loggedIn && session.gradeSelected && pendingActivity && !loginOpen) {
      setActiveActivity(pendingActivity); setPendingActivity(null)
    }
  }, [session.loggedIn, session.gradeSelected, pendingActivity, loginOpen])
  // The learning app asks a new account for its grade first; the landing page never does, so the conversation opens right away there.
  useEffect(() => {
    if (session.loggedIn && (landing || session.gradeSelected) && pendingCharacter && !loginOpen) {
      setCharacterMode(pendingCharacter.mode); setActiveCharacter(pendingCharacter.character); setPendingCharacter(null)
    }
  }, [session.loggedIn, session.gradeSelected, landing, pendingCharacter, loginOpen])

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  // Lessons live in the learning app; from the landing page they go through sign-in first.
  function openLessonFromLanding(lessonId: string) {
    navigate('/home', { state: { lessonId } })
  }

  // Landing page: visitors pick a grade and start learning it (in guest mode unless already signed in).
  function startGrade(grade: number) {
    if (!session.loggedIn && !session.guest) startGuest()
    selectGrade(grade)
    navigate('/home#library')
  }

  function handleSelectGrade(grade: number) {
    selectGrade(grade)
    showSection('library')
    setNotice(`Đã chọn Lớp ${grade}. Hãy mở bài học để khám phá!`)
  }

  function viewProgress() {
    setActiveActivity(null)
    window.setTimeout(() => showSection('progress'), 50)
  }

  const classSelection = <ClassSelection selectedGrade={session.grade} completedActivities={session.completedActivities} onSelect={handleSelectGrade} metadata={dataset.metadata} readLessons={learning.journal.read} />
  // A lesson read in the library opens its mission (or the map) in Hành trình, which shows that chapter first.
  function launchJourney(launch: JourneyLaunch) {
    journey.select(launch.journeyId)
    setJourneyLaunch({ ...launch, token: Date.now() })
    window.setTimeout(() => showSection('journey'), 60)
  }
  function readLesson(id: string) {
    setLibrarySource('dataset'); setRequestedLessonId(id)
    window.setTimeout(() => showSection('library'), 60)
  }
  const journeySection = <JourneySection state={journey} grade={session.grade} onChat={openCharacter} onNotice={setNotice} onRecord={learning.record} launch={journeyLaunch} onLaunched={() => setJourneyLaunch(null)} onReadLesson={readLesson} />
  const learningHub = <LearningHub onCollectionHandled={() => setRequestedCollection(null)} requestedCollection={requestedCollection} learning={learning} grade={session.grade} completed={session.completedActivities} onQuiz={openActivity} dataset={dataset} source={librarySource} onSourceChange={setLibrarySource} requestedLessonId={requestedLessonId} onRequestHandled={() => setRequestedLessonId(null)} journeys={journey} onJourney={launchJourney} gradeLocked={locked} />
  const timeline = <HistoryTimeline />
  const characters = <CharacterSection onChat={openCharacter} lockedGrade={locked ? session.grade : undefined} />
  const challenges = <ChallengeSection records={session.gameRecords} completedActivities={session.completedActivities} onTry={setActiveGame} />
  const userProgress = <UserProgress
    session={progressSession}
    learningStreak={streak(learning.journal.events)}
    onLogin={() => setLoginOpen(true)}
    onReset={() => {
      if (!window.confirm('Đặt lại toàn bộ tiến độ, bài đã lưu và ghi chú trên trình duyệt này?')) return
      reset()
      learning.resetJournal()
      journey.reset()
      setNotice('Đã đặt lại tiến độ học trên trình duyệt này.')
    }}
  />
  const stats = <StatsSection />

  // Teachers see the progress of their classes: keep this student's reading, XP and quizzes in the demo school directory.
  const quizCount = session.completedActivities.filter((id) => !id.startsWith('minigame-')).length
  useEffect(() => {
    if (!session.loggedIn || session.role !== 'student' || !session.userId) return
    const school = readSchool()
    const member = findUserByEmail(school, session.userId)
    if (!member) return
    // A session kept from before grades were stored in the directory records its grade there once.
    const withGrade = session.gradeSelected ? chooseOwnGrade(school, member.id, session.grade) : school
    const next = syncProgress(withGrade, member.id, { read: learning.journal.read, xp: progressSession.earnedXp, quizzes: quizCount })
    if (next !== school) writeSchool(next)
  }, [session.loggedIn, session.role, session.userId, session.gradeSelected, session.grade, learning.journal.read, progressSession.earnedXp, quizCount])

  if (!landing && authenticated && !session.gradeSelected && isLearner(session)) return <div className="auth-page"><main className="auth-main"><GradeOnboarding permanent={session.loggedIn} grade={session.grade} onSelect={selectGrade} /></main></div>

  return (
    <div className={landing ? 'landing-page' : 'learning-page'} id={landing ? 'top' : undefined}>
      {landing ? <>
        <Navbar session={session} onLogout={() => { logout(); setNotice('Bạn đã đăng xuất. Tiến độ học thử vẫn được lưu trên trình duyệt này.') }} />
        <main><Hero authenticated={authenticated} onChat={openCharacter} />{!gradeLocked(session) && <ClassSelection selectedGrade={session.grade} completedActivities={session.completedActivities} onSelect={startGrade} metadata={dataset.metadata} readLessons={learning.journal.read} />}{timeline}{characters}{challenges}{stats}<LandingCta authenticated={authenticated} onTryGuest={() => { startGuest(); navigate('/home') }} /></main><ImageCredits /><Footer />
      </> : <Dashboard
        learning={learning}
        sections={{ library: <><LearningTabs grade={session.grade} locked={locked} />{journeySection}{!locked && classSelection}{learningHub}</>, timeline: <>{timeline}{stats}</>, characters, challenges, progress: userProgress }}
        footer={<><ImageCredits /><Footer /></>}
        onCollection={filter => { setLibrarySource('dataset'); setRequestedCollection({ filter, token: Date.now() }); window.setTimeout(() => showSection('library'), 60) }}
        session={progressSession}
        readCount={gradeRead}
        gradeCount={gradeCount}
        recommendedLessonId={recommendation?.id}
        learningStreak={streak(learning.journal.events)}
        onLogin={() => setLoginOpen(true)}
        onLogout={handleLogout}
        onOpenLesson={(id) => { setLibrarySource('dataset'); setRequestedLessonId(id) }}
        onSelectGrade={selectGrade}
        gradeLocked={locked}
        onQuiz={openActivity}
        onGame={setActiveGame}
        onChat={openCharacter}
      />}
      {!landing && <CompanionWidget key={chatOwner ?? ''} owner={chatOwner} journal={learning.journal} learningStreak={streak(learning.journal.events)} />}
      {notice && <div className="toast" role="status">✦ {notice}</div>}
      {activeGame && <MiniGameModal key={activeGame} gameId={activeGame} completed={session.completedActivities.includes(`minigame-${activeGame}`)} bestStars={session.gameRecords[activeGame] || 0} onRecord={recordGame} onComplete={completeLearning} onClose={() => setActiveGame(null)} />}
      {activeCharacter && session.loggedIn && <CharacterChatModal key={`${chatOwner ?? ''}:${activeCharacter.id}`} historyOwner={chatOwner} grade={gradeLocked(session) ? session.grade : undefined} onSwitchCharacter={switchCharacter} character={activeCharacter} initialMode={characterMode} onClose={() => setActiveCharacter(null)} onOpenLesson={(id) => { setActiveCharacter(null); if (landing) { openLessonFromLanding(id); return } setLibrarySource('dataset'); setRequestedLessonId(id); showSection('library') }} />}
      {loginOpen && <LoginModal reason={pendingCharacter ? `Đăng nhập để ${pendingCharacter.mode === 'voice' ? 'nói chuyện' : 'nhắn tin'} với ${pendingCharacter.character.name}. Trò chuyện với nhân vật AI chỉ dành cho tài khoản đã đăng nhập.` : undefined} onClose={() => { setLoginOpen(false); setPendingActivity(null); setPendingCharacter(null) }} onLogin={handleLogin} onRegistered={selectGrade} />}
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

// "Học tập" holds the journey and the textbook library; these links jump between the two parts.
function LearningTabs({ grade, locked }: { grade: number; locked: boolean }) {
  return <nav className="page-shell learning-tabs" aria-label="Các phần của Học tập">
    {locked && <span className="learning-tabs-grade">Lớp {grade}</span>}
    <a href="#journey">Hành trình</a>
    <a href="#library">Thư viện SGK</a>
  </nav>
}

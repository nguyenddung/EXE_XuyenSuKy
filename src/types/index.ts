export interface SchoolClass {
  grade: number
  subtitle: string
  topics: string[]
  progress: number
  recommended?: boolean
  theme: 'amber' | 'mint' | 'peach' | 'blue'
}

export interface Character {
  aliases: string[]
  id: string
  name: string
  period: string
  description: string
  avatar: string
  tone: 'teal' | 'gold' | 'coral' | 'violet'
  greeting: string
  image: string
  category: string
  topics: string[]
  suggestions: string[]
  grades: number[]
  lessonCount: number
  chunkCount: number
}

export interface TimelineEvent {
  year: number
  title: string
  category: string
}

export interface Challenge {
  id: string
  title: string
  description: string
  action: string
  type: 'timeline' | 'identity' | 'quiz'
  color: string
}

export interface LeaderboardEntry {
  name: string
  xp: number
  avatar: string
}

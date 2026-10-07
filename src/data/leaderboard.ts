import type { LeaderboardEntry } from '../types'
import type { DemoSession } from '../hooks/useDemoSession'
import { demoAccount } from './demo'

export const leaderboard: LeaderboardEntry[] = [
  { name: 'Minh', xp: 2350, avatar: 'M' },
  { name: 'An', xp: 2180, avatar: 'A' },
  { name: 'Linh', xp: 1950, avatar: 'L' },
]

/** Ranks with the viewer's own row: the demo member keeps Minh's history, a guest only shows the XP earned this visit. */
export function rankingsFor(session: DemoSession): (LeaderboardEntry & { isMe: boolean })[] {
  return leaderboard
    .map((entry) => entry.name !== demoAccount.name ? { ...entry, isMe: false }
      : session.loggedIn ? { ...entry, name: session.name || entry.name, avatar: session.name?.slice(0, 1).toUpperCase() || entry.avatar, xp: (session.name && session.name !== demoAccount.name ? 0 : demoAccount.leaderboardXp) + session.earnedXp, isMe: true }
      : { name: 'Bạn (khách)', avatar: 'B', xp: session.earnedXp, isMe: true })
    .sort((a, b) => b.xp - a.xp)
}

// Fixed-window counters for chat spam protection and the OpenAI budget.
// By default counters live in this server instance's memory. On Vercel several instances can run at once,
// so set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to share one counter across all of them.

const envNumber = (name, fallback) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const chatLimits = () => ({
  perMinute: envNumber('CHAT_RATE_PER_MINUTE', 12),
  aiPerDay: envNumber('AI_ANSWERS_PER_DAY', 40),
  aiGlobalPerDay: envNumber('AI_GLOBAL_ANSWERS_PER_DAY', 500),
})

/** Vercel sets x-vercel-forwarded-for itself; the plain x-forwarded-for header can be supplied by the client. */
export function clientKey(req) {
  const header = (name) => { const value = req.headers[name]; return (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim() }
  return header('x-vercel-forwarded-for') || header('x-real-ip') || req.socket?.remoteAddress || header('x-forwarded-for') || 'unknown'
}

export function memoryStore() {
  const windows = new Map()
  return {
    async increment(key, windowMs) {
      const now = Date.now()
      if (windows.size > 10000) for (const [stored, value] of windows) if (value.resetAt <= now) windows.delete(stored)
      const current = windows.get(key)
      const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs }
      entry.count++
      windows.set(key, entry)
      return { count: entry.count, resetAt: entry.resetAt }
    },
  }
}

export function upstashStore(url, token, fallback = memoryStore()) {
  return {
    async increment(key, windowMs) {
      try {
        const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([['INCR', key], ['PEXPIRE', key, windowMs, 'NX'], ['PTTL', key]]),
          signal: AbortSignal.timeout(1500),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const [count, , ttl] = (await response.json()).map((item) => item.result)
        return { count: Number(count), resetAt: Date.now() + Math.max(Number(ttl), 0) }
      } catch (error) {
        console.warn('[chat-limits] Shared counter unavailable, using memory:', error.message)
        return fallback.increment(key, windowMs)
      }
    },
  }
}

export const defaultStore = () => process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? upstashStore(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
  : memoryStore()

const minute = 60_000
const day = 24 * 60 * minute
const dayKey = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10) // Vietnam calendar day

export function createLimiter(store = defaultStore(), limits = chatLimits) {
  return {
    /** Hard limit on chat requests: over it the API answers 429 before any work is done. */
    async allowRequest(key) {
      const { count, resetAt } = await store.increment(`chat:min:${key}`, minute)
      return { allowed: count <= limits().perMinute, retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) }
    },
    /** Soft limit on AI answers per visitor and overall: over it chat still answers with the textbook quote. */
    async allowAiAnswer(key) {
      const { aiPerDay, aiGlobalPerDay } = limits()
      const today = dayKey()
      const used = (await store.increment(`ai:day:${today}:${key}`, day)).count
      if (used > aiPerDay) return { allowed: false, reason: 'visitor' }
      if ((await store.increment(`ai:day:${today}:all`, day)).count > aiGlobalPerDay) return { allowed: false, reason: 'global' }
      return { allowed: true, remaining: Math.max(0, Math.floor(aiPerDay - used)) }
    },
  }
}

/** Small LRU cache for AI answers; repeated questions (suggested ones especially) cost no tokens. */
export function createAnswerCache(maxEntries = 500, ttlMs = 6 * 3600_000) {
  const entries = new Map()
  return {
    get(key) {
      const entry = entries.get(key)
      if (!entry || entry.expires < Date.now()) { entries.delete(key); return undefined }
      entries.delete(key); entries.set(key, entry)
      return entry.value
    },
    set(key, value) {
      entries.delete(key)
      entries.set(key, { value, expires: Date.now() + ttlMs })
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value)
    },
  }
}

import { readFile, writeFile } from 'node:fs/promises'
import profiles from '../shared/characters.json' with { type: 'json' }
import { agentDefinition } from '../server/voice-agents.mjs'

// Creates (or updates) the ElevenLabs voice agent of every character and records the agent ids in
// shared/character-agents.json. Agent ids are not secret; the API key stays in .env.local / Vercel.
// Usage: npm run sync:voice-agents [-- <character id> ...]
const idsPath = new URL('../shared/character-agents.json', import.meta.url)
const key = process.env.ELEVENLABS_API_KEY?.trim()
if (!key) throw new Error('ELEVENLABS_API_KEY is missing (.env.local).')
const only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const ids = JSON.parse(await readFile(idsPath, 'utf8'))

async function call(method, path, body) {
  const response = await fetch(`https://api.elevenlabs.io${path}`, { method, signal: AbortSignal.timeout(30000), headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`ElevenLabs HTTP ${response.status} on ${method} ${path}: ${(await response.text()).slice(0, 400)}`)
  return response.json()
}

for (const profile of profiles.filter((entry) => !only.length || only.includes(entry.id))) {
  const definition = agentDefinition(profile)
  if (ids[profile.id]) {
    await call('PATCH', `/v1/convai/agents/${encodeURIComponent(ids[profile.id])}`, definition)
    console.log(`updated ${profile.id} → ${ids[profile.id]}`)
  } else {
    const { agent_id: agentId } = await call('POST', '/v1/convai/agents/create', definition)
    ids[profile.id] = agentId
    await writeFile(idsPath, `${JSON.stringify(ids, null, 2)}\n`)
    console.log(`created ${profile.id} → ${agentId}`)
  }
}
await writeFile(idsPath, `${JSON.stringify(ids, null, 2)}\n`)

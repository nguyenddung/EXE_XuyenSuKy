import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { captionHash, defaultJourneyPath, narrationPath } from '../server/journeys.mjs'
import { mp3Seconds } from './mp3-duration.mjs'

// Pre-records the narration of every mission video with ElevenLabs, once, into public/audio/journeys/<journey>/.
// Captions are reviewed and fixed, so learners play these files instead of calling a paid voice service on every view.
// A manifest keeps the hash of each caption: a scene is recorded again only when its caption changes (or with --force).
// The manifest is saved after every scene and each key's credits are checked first, so running out of credits stops
// cleanly and the next run records only what is still missing.
// Usage: npm run build:narration [-- --force] [-- <journey id> ...]
const publicAudio = fileURLToPath(new URL('../public/audio/journeys/', import.meta.url))

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((arg) => !arg.startsWith('--'))
// ELEVENLABS_API_KEY, then ELEVENLABS_API_KEY_2 (another account) once the first one runs out of credits.
const keys = [process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_API_KEY_2].map((value) => value?.trim()).filter(Boolean)
let current = 0
const voiceId = process.env.ELEVENLABS_NARRATOR_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'
const model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'

class OutOfCredits extends Error {}

/** Credits left on a key, or null when the key may not read its subscription (no User → Read permission). */
async function creditsLeft(key) {
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', { signal: AbortSignal.timeout(15000), headers: { 'xi-api-key': key } })
  if (!response.ok) { await response.body?.cancel(); return null }
  const { character_count: used, character_limit: limit } = await response.json()
  return Number.isFinite(used) && Number.isFinite(limit) ? limit - used : null
}

async function record(text, key) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, language_code: 'vi', voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.95 } }),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    if (/quota_exceeded/.test(detail)) throw new OutOfCredits(detail)
    throw new Error(`ElevenLabs HTTP ${response.status}: ${detail}${response.status === 401 ? ' (kiểm tra Secret API key và quyền Text to Speech)' : ''}`)
  }
  if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('ElevenLabs did not return audio')
  return Buffer.from(await response.arrayBuffer())
}

/** Records one caption with the first key that still has enough credits; throws OutOfCredits when none has. */
async function recordWithCredits(text) {
  while (current < keys.length) {
    const left = await creditsLeft(keys[current])
    // A caption costs at most one credit a character: never start a scene the key cannot finish.
    if (left === null || left >= text.length) {
      try { return await record(text, keys[current]) } catch (error) { if (!(error instanceof OutOfCredits)) throw error }
    }
    console.log(`  Key ${current + 1} has not enough credits left${left === null ? '' : ` (${left})`}.${current + 1 < keys.length ? ` Switching to key ${current + 2}.` : ''}`)
    current++
  }
  throw new OutOfCredits('Every ElevenLabs key is out of credits.')
}

if (!/^[a-zA-Z0-9_-]{1,80}$/.test(voiceId)) {
  console.error('Voice ID is not valid.')
  process.exitCode = 1
} else if (!keys.length) {
  console.error('ELEVENLABS_API_KEY is missing. Put it in .env.local (never commit it), then run npm run build:narration again.')
  process.exitCode = 1
} else {
  try {
    const files = (await readdir(defaultJourneyPath)).filter((name) => name.endsWith('.json') && (!only.length || only.includes(name.slice(0, -5))))
    await mkdir(narrationPath, { recursive: true })
    let recorded = 0
    let characters = 0
    let stopped = false
    for (const file of files) {
      const journey = JSON.parse(await readFile(resolve(defaultJourneyPath, file), 'utf8'))
      const manifestFile = resolve(narrationPath, file)
      const previous = await readFile(manifestFile, 'utf8').then(JSON.parse).catch(() => ({ scenes: {} }))
      const writeManifest = (entries) => writeFile(manifestFile, `${JSON.stringify({ journey: journey.id, provider: 'elevenlabs', scenes: entries }, null, 2)}\n`)
      const scenes = {}
      const videoScenes = journey.stages.flatMap((stage) => (stage.missions || []).flatMap((mission) => mission.video?.scenes || []))
      for (const scene of videoScenes) {
        const hash = captionHash(scene.caption)
        const name = `${scene.id}.mp3`
        const old = previous.scenes?.[scene.id]
        if (!force && old?.sha256 === hash && old.voiceId === voiceId) {
          // Already recorded: keep it, only measuring its length if an older manifest lacks it.
          scenes[scene.id] = old.seconds ? old : { ...old, seconds: mp3Seconds(await readFile(resolve(publicAudio, journey.id, name))) }
          continue
        }
        let audio
        try { audio = await recordWithCredits(scene.caption) } catch (error) {
          if (!(error instanceof OutOfCredits)) throw error
          console.log(`Out of ElevenLabs credits before ${scene.id}. Scenes recorded so far are saved; run again when credits are back.`)
          stopped = true
          break
        }
        await mkdir(resolve(publicAudio, journey.id), { recursive: true })
        await writeFile(resolve(publicAudio, journey.id, name), audio)
        scenes[scene.id] = { file: `/audio/journeys/${journey.id}/${name}`, sha256: hash, voiceId, model, bytes: audio.length, seconds: mp3Seconds(audio) }
        recorded++
        characters += scene.caption.length
        console.log(`  ${scene.id}: ${audio.length} bytes`)
        // Save after every scene, keeping the earlier entries not reached yet, so a stop never wastes a recording.
        await writeManifest({ ...previous.scenes, ...scenes })
      }
      if (stopped) break
      if (!Object.keys(scenes).length) continue // No video in this journey yet: no manifest to keep.
      // The full pass is done: drop entries of scenes that no longer exist.
      await writeManifest(scenes)
      console.log(`${journey.id}: ${Object.keys(scenes).length} scenes with narration`)
    }
    if (stopped) process.exitCode = 2
    console.log(`Recorded ${recorded} scene(s), ${characters} characters sent to ElevenLabs. Commit public/audio/journeys and data/journeys/narration to deploy them.`)
  } catch (error) {
    console.error(`Narration failed: ${error.message}`)
    process.exitCode = 1
  }
}

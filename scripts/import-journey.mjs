import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { loadDataset } from '../server/dataset.mjs'
import { defaultJourneyPath, journeySummary, validateJourney } from '../server/journeys.mjs'

// Copies a journey built by course_builder (course/<id>.json) into data/journeys after checking it against this app's dataset.
const source = process.argv[2]
if (!source) {
  console.error('Usage: npm run import:journey -- <path to course/<id>.json>')
  process.exitCode = 1
} else {
  try {
    const journey = validateJourney(JSON.parse(await readFile(source, 'utf8')), await loadDataset())
    if (basename(source) !== `${journey.id}.json`) throw new Error(`file name must be ${journey.id}.json`)
    await mkdir(defaultJourneyPath, { recursive: true })
    if (resolve(source) !== resolve(defaultJourneyPath, basename(source))) await copyFile(source, resolve(defaultJourneyPath, basename(source)))
    const summary = journeySummary(journey)
    console.log(`Imported journey ${summary.id}: ${summary.writtenStageCount}/${summary.stageCount} stages written, ${summary.missionCount} missions. Restart the local server to reload; commit the file to deploy it.`)
  } catch (error) {
    console.error(`Journey import failed: ${error.message}`)
    process.exitCode = 1
  }
}

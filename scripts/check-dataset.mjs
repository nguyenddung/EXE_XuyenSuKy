import { loadDataset } from '../server/dataset.mjs'
import { loadJourneys } from '../server/journeys.mjs'
try {
  const dataset = await loadDataset()
  const journeys = await loadJourneys(dataset)
  console.log(JSON.stringify({ status: 'ok', version: dataset.metadata.version, totals: dataset.metadata.totals, grades: dataset.metadata.grades.map(({ grade, lessonCount, chunkCount }) => ({ grade, lessonCount, chunkCount })), journeys: [...journeys.values()].map((entry) => entry.summary) }, null, 2))
} catch (error) {
  console.error(`Dataset validation failed: ${error.message}`)
  process.exitCode = 1
}

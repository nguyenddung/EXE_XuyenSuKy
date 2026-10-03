import { loadDataset } from '../server/dataset.mjs'
try {
  const dataset = await loadDataset()
  console.log(JSON.stringify({ status: 'ok', version: dataset.metadata.version, totals: dataset.metadata.totals, grades: dataset.metadata.grades.map(({ grade, lessonCount, chunkCount }) => ({ grade, lessonCount, chunkCount })) }, null, 2))
} catch (error) {
  console.error(`Dataset validation failed: ${error.message}`)
  process.exitCode = 1
}

import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defaultDatasetPath, loadDataset } from '../server/dataset.mjs'

const source = process.argv[2] || process.env.DATASET_PATH
if (!source) {
  console.error('Usage: npm run import:dataset -- <folder containing manifest.json>')
  process.exitCode = 1
} else {
  try {
    const dataset = await loadDataset(source)
    const files = ['manifest.json', 'SHA256SUMS.txt', 'README.md', 'lessons/lessons_all.json', 'chunks/chunks_all.jsonl', 'schema/lesson.schema.json', 'schema/chunk.schema.json']
    if (resolve(source) !== resolve(defaultDatasetPath)) {
      for (const file of files) {
        const destination = resolve(defaultDatasetPath, file)
        await mkdir(dirname(destination), { recursive: true })
        await copyFile(resolve(source, file), destination)
      }
    }
    await loadDataset(defaultDatasetPath)
    console.log(`Imported dataset v${dataset.metadata.version}: ${dataset.metadata.totals.lessons} lessons, ${dataset.metadata.totals.chunks} chunks. Restart the local server to reload; commit the snapshot to deploy it.`)
  } catch (error) {
    console.error(`Dataset import failed: ${error.message}`)
    process.exitCode = 1
  }
}

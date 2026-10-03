import { useEffect, useState } from 'react'
import { historyApi, type DatasetMetadata } from '../lib/historyApi'

export function useHistoryDataset() {
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    historyApi<DatasetMetadata>('metadata', controller.signal)
      .then(setMetadata)
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  return { metadata, loading, error, retry: () => setAttempt((value) => value + 1) }
}

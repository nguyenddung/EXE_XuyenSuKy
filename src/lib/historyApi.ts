export interface HistorySource {
  book: string
  bookSeries: string
  publisher: string
  sourcePdf: string
  pageStart: number
  pageEnd: number
  pageKind: 'pdf'
}
export interface HistoryLesson {
  id: string
  grade: number
  number: number
  title: string
  chapter: string
  excerpt: string
  minutes: number
  sectionCount: number
  source: HistorySource
}
export interface LessonDetail extends HistoryLesson {
  sections: { title: string; content: string; pageStart: number; pageEnd: number }[]
}
export interface HistoryChunk {
  id: string
  lessonId: string
  grade: number
  lessonTitle: string
  sectionTitle: string
  sectionIndex: number
  contentType: string
  text: string
  source: HistorySource
}
export interface DatasetMetadata {
  name: string
  version: string
  created: string
  totals: { lessons: number; chunks: number; sections: number; books: number }
  grades: { grade: number; lessonCount: number; chunkCount: number; chapters: string[]; book: string; bookSeries: string; recommendation: HistoryLesson }[]
}
export interface PageResult<T> { items: T[]; total: number; page: number; limit: number; pages: number }

export async function historyApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Backend chưa sẵn sàng. Hãy thử lại sau.')
  if (!response.ok) throw new Error(response.status === 503 ? 'Chưa đọc được dataset. Vui lòng kiểm tra cấu hình backend rồi thử lại.' : `Không tải được dữ liệu (HTTP ${response.status}).`)
  return response.json() as Promise<T>
}

export function sourceLabel(source: HistorySource) {
  return `${source.book} · ${source.bookSeries} · ${source.publisher} · trang PDF ${source.pageStart}${source.pageEnd === source.pageStart ? '' : `–${source.pageEnd}`}`
}

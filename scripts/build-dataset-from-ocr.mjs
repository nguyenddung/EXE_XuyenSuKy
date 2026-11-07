// Builds data/history/ from the Mistral OCR Markdown made by ocr_lich_su.py (one .md per book, pages marked
// "<!-- Trang PDF N -->"). Textbook (SGK) lessons follow the table of contents in data/history/source/books.json;
// teacher's books (SGV) are split on their "BÀI N." headings.
// Usage: npm run build:dataset -- [ocr output folder]   (default: OCR_PATH or D:/Ocr/output)
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../data/history/', import.meta.url))
const ocrRoot = resolve(process.argv[2] || process.env.OCR_PATH || 'D:/Ocr/output')
const version = '2.0.0'
const chunkSize = 800
const chunkOverlap = 150
const today = new Date().toISOString().slice(0, 10)

const fold = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const upperRatio = (text) => {
  const letters = text.match(/\p{L}/gu) || []
  return letters.length ? letters.filter((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length / letters.length : 0
}
const sentenceCase = (text) => { const lower = text.toLocaleLowerCase('vi'); return lower.charAt(0).toLocaleUpperCase('vi') + lower.slice(1) }
const pad = (value, size) => String(value).padStart(size, '0')

// ---------- Markdown → blocks ----------

// The textbooks put the tone mark on the second vowel of open "oa", "oe", "uy" syllables (hoá, khoẻ, thuỷ); the OCR
// mixes in "hóa", "khỏe", "thủy". One spelling keeps quotes and search consistent with the printed page.
const textbookTones = (text) => text.normalize('NFD')
  .replace(/([oO])([̣̀́̃̉])([aeAE])(?![\p{L}\p{M}])/gu, '$1$3$2')
  .replace(/([uU])([̣̀́̃̉])([yY])(?![\p{L}\p{M}])/gu, '$1$3$2')
  .normalize('NFC')

function inline(text) {
  return textbookTones(text)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[[^\]]*\]/g, ' ') // icons the OCR described without a file: "![globe icon]\"
    .replace(/\$([^$]*)\$/g, (_, math) => math.replace(/\\pi/g, 'π').replace(/\\times/g, '×').replace(/\\[a-z]+/gi, '').replace(/[{}^_]/g, ''))
    .replace(/\\([*_#\[\]()])/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/(^|[\s(“"])\*(\S[^*]*?\S|\S)\*(?=[\s,.;:!?)”"]|$)/g, '$1$2')
    .replace(/(^|\s)\*(?=\s)/g, '$1')
    .replace(/^[\s◀◁▶▷►▲▼•●]+(?=\S)/u, (match) => (/[•●]/.test(match) ? '• ' : ''))
    // OCR reads the round section-number icon as "⚠" and the question icon as "❓".
    .replace(/^[⚠ℹ!]\s*(?=\p{Lu})/u, '§ ')
    .replace(/^❓\s*/u, '? ')
    .replace(/^([①-⑨])\s*/u, (_, digit) => `${digit.charCodeAt(0) - 0x245f} `)
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Splits one page into blocks: headings, paragraphs, list items and flattened table rows. */
function pageBlocks(markdown, page) {
  const blocks = []
  const lines = markdown.split(/\r?\n/)
  let paragraph = []
  const flush = () => {
    const text = inline(paragraph.join(' '))
    if (text) blocks.push({ kind: 'para', text, page })
    paragraph = []
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const image = line.match(/^!\[[^\]]*\]\(([^)]*)\)$/)
    if (image) { flush(); blocks.push({ kind: 'image', text: '', page, src: image[1].split('/').pop() }); continue }
    const heading = line.match(/^(#{1,6})\s*(.*)$/)
    if (heading) {
      flush()
      // "# - • **Tư tưởng**" is a list item that OCR turned into a heading.
      const text = inline(heading[2].replace(/^[-–]\s*/, ''))
      if (text) blocks.push({ kind: 'heading', level: heading[1].length, text, page })
      continue
    }
    if (line.startsWith('|')) {
      flush()
      if (/^\|?[\s:|-]+\|?$/.test(line)) continue
      const cells = line.replace(/^\||\|$/g, '').split('|').map((cell) => inline(cell)).filter(Boolean)
      if (cells.length) blocks.push({ kind: 'para', text: cells.join(' | '), page, table: true })
      continue
    }
    if (/^([-+•–]\s|\d{1,2}[.)]\s+[-–])/.test(line) && !paragraph.length) { blocks.push({ kind: 'para', text: inline(line.replace(/^[-+–]\s+/, '- ')), page, item: true }); continue }
    if (/^[-+•]\s/.test(line)) { flush(); blocks.push({ kind: 'para', text: inline(line.replace(/^[-+]\s+/, '- ')), page, item: true }); continue }
    // A numbered line ("1. Nêu...", "2. Quá trình...") starts its own paragraph even without a blank line.
    if (/^\d{1,2}[.)]?\s/.test(line)) flush()
    paragraph.push(line)
  }
  flush()
  // The printed page number closes the page.
  while (blocks.length && blocks.at(-1).kind === 'para' && /^\d{1,3}$/.test(blocks.at(-1).text)) blocks.pop()
  return blocks
}

// OCR of a photo often invents text: Chinese or Arabic lines, the same line repeated, English captions, or a remark
// about the picture. Only figures whose text reads as Vietnamese are kept.
const foreignScript = /[Ѐ-ӿ֐-ۿऀ-෿฀-๿぀-ヿ㐀-鿿가-힯]/u
const vietnameseLetter = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/iu
function figureText(markdown) {
  if (!markdown || /\b(the image|this image|image is|no text|unable to|cannot (?:read|recogni[sz]e))\b/i.test(markdown) || foreignScript.test(markdown)) return null
  const lines = markdown.split('\n').map((line) => line.trim()).filter(Boolean)
  // A diagram may repeat a box ("Bộ (Lạc tướng)" twice); invented text repeats one line over and over.
  const repeats = new Map()
  for (const line of lines) { const key = fold(line.replace(/^\d+[.)]\s*/, '')); repeats.set(key, (repeats.get(key) || 0) + 1) }
  const most = Math.max(...repeats.values())
  if (most >= 4 && most / lines.length >= 0.3) return null
  const words = markdown.match(/\p{L}+/gu) || []
  if (words.length < 5 || words.filter((word) => vietnameseLetter.test(word)).length / words.length < 0.25) return null
  return markdown
}

/** Text inside figures (diagrams, timelines), from ocr_chu_trong_hinh.py: images/<book>/figures.json. */
async function readFigures(file) {
  try {
    const path = resolve(ocrRoot, dirname(file), 'images', file.split('/').pop().replace(/\.md$/, ''), 'figures.json')
    return new Map(Object.entries(JSON.parse(await readFile(path, 'utf8'))).map(([name, text]) => [name, figureText(text)]).filter(([, text]) => text))
  } catch (error) {
    if (error.code === 'ENOENT') return new Map()
    throw error
  }
}

async function readBook(file) {
  const markdown = (await readFile(resolve(ocrRoot, file), 'utf8')).normalize('NFC')
  const figures = await readFigures(file)
  const pages = new Map()
  const parts = markdown.split(/<!--\s*Trang PDF (\d+)\s*-->/)
  for (let index = 1; index < parts.length; index += 2) {
    const page = Number(parts[index])
    pages.set(page, pageBlocks(parts[index + 1], page).map((block) => (block.kind === 'image' && figures.has(block.src) ? { ...block, figure: pageBlocks(figures.get(block.src).normalize('NFC'), page).map((item) => item.text) } : block)))
  }
  return pages
}

// ---------- Paragraph types (SGK) ----------

const questionVerbs = /^(khai thác|quan sát|đọc|dựa vào|căn cứ|em hãy|hãy|nêu|trình bày|giải thích|mô tả|theo em|lập|vẽ|tìm|kể|xác định|phân tích|so sánh|đánh giá|chỉ ra|cho biết|tóm tắt|sưu tầm|thảo luận|liệt kê|nhận xét|giới thiệu|viết|lựa chọn|làm rõ|hoàn thành|vì sao|tại sao)\b/i
// Questions follow a "?" icon or a number ("1. Nhà Lý được thành lập như thế nào?") or start with a task verb.
const isQuestion = (text) => {
  const body = text.replace(/^(\?|\d{1,2}[.)]?)\s+/, '')
  if (text.length > 450 || /^["“]/.test(body)) return false
  if (body !== text) return /\?$/.test(body) || questionVerbs.test(body) || /\b(hãy|em)\b/i.test(body)
  return questionVerbs.test(body) && (/\bem\b/i.test(body) || /\?$/.test(body))
}
const isCaption = (text) => /^(hình|lược đồ|sơ đồ|bảng|tranh|ảnh|tượng)\s*(\d|[ivx]+\b)/i.test(text) && text.length < 300
const isAttribution = (text) => /^\(?\s*(theo|trích|dẫn theo|nguồn\s*:)\s/i.test(text) && text.length < 300
const boxKind = (text) => {
  const key = fold(text)
  if (/^em co biet/.test(key)) return 'did_you_know'
  if (/^ket noi voi/.test(key)) return 'did_you_know'
  if (/^tu lieu( \d+)?$/.test(key) || /^tu lieu \d+[a-z]?$/.test(key)) return 'source'
  return null
}

// ---------- SGK lessons ----------

const objectivesStart = (text) => /^(học xong bài này|sau bài học này|học xong chủ đề này)/i.test(text)
const isChapterOpener = (blocks) => blocks.some((block) => /^(chuong|chu de)( \d+| [ivx]+)?$/.test(fold(block.text)) || (/^(chuong|chu de) (\d+|[ivx]+)\b/.test(fold(block.text)) && upperRatio(block.text) > 0.7)) &&
  !blocks.some((block) => objectivesStart(block.text) || /^bai \d+/.test(fold(block.text)))

function sectionHeading(block, expected) {
  // The section number itself was lost ("§ Nhà Lý thành lập...", "? Đời sống xã hội..."): it is the next one.
  const icon = block.text.match(/^[§?]\s+(\p{Lu}[^?]{3,119})$/u)
  if (icon && (block.text.startsWith('§') || (!isQuestion(block.text) && !/[.;:]$/.test(icon[1])))) return { number: expected, title: `${expected}. ${icon[1].trim()}` }
  const match = block.text.match(/^(\d{1,2})(?:\s*[.,:]\s*|\s+|(?=\p{Lu}))(\S.*)$/u)
  if (!match) return null
  // The round "1" icon is sometimes read as "7".
  const number = match[1] === '7' && expected === 1 && block.text.length < 120 ? 1 : Number(match[1])
  const title = match[2].trim()
  if (/\b(hãy|em)\b/i.test(title) || title.length > 170 || number < expected || number > expected + 1) return null
  // OCR drops "#" from some headings; a plain paragraph only counts when it reads like a title.
  if (block.kind !== 'heading' && (title.length > 120 || /[.;:?]$/.test(title) || isQuestion(block.text))) return null
  if (!/^["“]?\p{Lu}/u.test(title)) return null
  return { number, title: `${number}. ${title}` }
}
// "Luyện tập – Vận dụng", "LUYỆN TẬP VÀ VẬN DỤNG", "Luyện tậpvà Vận dụng", or glued to the first exercise:
// "Luyện tập – Văn dụng1. Vì sao...". Returns the text after the heading ('' when there is none).
function practice(block) {
  const match = block.text.match(/^(?:Luyện\s*tập\s*(?:[–-]|và)?\s*(?:V[ậăa]n\s*dụng)?|Vận\s*dụng)\s*(.*)$/iu)
  if (!match || (match[1] && !/^\d/.test(match[1]))) return null
  return match[1]
}

function parseSgkLesson(book, lesson, pages) {
  const sections = []
  let current = null
  const open = (title, type) => { current = { title, type, paragraphs: [] }; sections.push(current) }
  const add = (text, page, type) => current.paragraphs.push({ text, page, type })
  let expected = 1
  let box = null
  let boxCount = 0
  const [first, last] = lesson.pages
  const firstBlocks = pages.get(first) || []
  const hasObjectives = firstBlocks.some((block) => objectivesStart(block.text)) || (pages.get(first + 1) || []).some((block) => objectivesStart(block.text))
  let header = hasObjectives
  if (!hasObjectives) open('Nội dung', 'body')
  for (let page = first; page <= last; page++) {
    const blocks = pages.get(page)
    if (!blocks) throw new Error(`${book.file}: trang PDF ${page} (bài ${lesson.number}) không có trong bản OCR`)
    if (isChapterOpener(blocks)) {
      // A chapter's opening page comes before its first lesson: keep it apart so it never mixes into lesson text.
      const previous = current
      open('Giới thiệu chương', 'intro')
      for (const block of blocks) if (block.kind !== 'image') add(block.text, page, 'intro')
      if (previous) current = previous
      continue
    }
    for (const block of blocks) {
      if (block.kind === 'image') {
        box = null
        // Words drawn inside a diagram or timeline follow the figure, as their own "figure" text.
        if (block.figure && !header) for (const line of block.figure) add(line, page, current.type === 'body' ? 'figure' : current.type)
        continue
      }
      let { text } = block
      if (header) {
        if (!objectivesStart(text)) continue
        header = false
        open('Mục tiêu bài học', 'objectives')
        continue
      }
      if (current.type === 'objectives') {
        if (block.item) { add(text, page, 'objectives'); continue }
        open('Mở đầu', 'intro')
      }
      const rest = current.type !== 'exercise' || !/^van dung$/.test(fold(text)) ? practice(block) : null
      if (rest !== null) { open('Luyện tập – Vận dụng', 'exercise'); box = null; if (rest) add(rest, page, 'exercise'); continue }
      const fix = lesson.section_fixes?.find((item) => item.at === text)
      if (fix && current.type !== 'exercise') { open(`${fix.number}. ${text}`, 'body'); expected = fix.number + 1; box = null; continue }
      const section = current.type !== 'exercise' && sectionHeading(block, expected)
      if (section) { open(section.title, 'body'); expected = section.number + 1; box = null; continue }
      if (current.type === 'exercise' || current.type === 'intro') { add(text, page, current.type); continue }
      const kind = boxKind(text)
      // The box title ("Em có biết?") stays in the text: the reader sets the box apart from it.
      if (kind && text.length < 60) { box = kind; boxCount = 0; add(text, page, kind); continue }
      if (block.kind === 'heading') { box = null; add(text, page, 'body'); current.paragraphs.at(-1).lead = true; continue }
      let type = 'body'
      if (isCaption(text)) type = 'caption'
      else if (isQuestion(text)) { type = 'question'; box = null; text = text.replace(/^\?\s*/, '') }
      // A numbered quotation ('1. "... thành Đại La...') is a source; it may run on until its "(Theo ...)" line.
      else if (/^\d{1,2}\.\s*["“]/.test(text)) { type = 'source'; box = 'source'; boxCount = 1 }
      else if (isAttribution(text)) {
        type = 'source'
        box = null
        const previous = current.paragraphs.at(-1)
        if (previous && previous.type === 'body') previous.type = 'source'
      } else if (box && boxCount < 4) { type = box; boxCount++ }
      add(text, page, type)
    }
  }
  return sections.filter((section) => section.paragraphs.length)
}

// ---------- SGV ----------

const roman = /^(I{1,3}|IV|VI{0,3}|IX|X)\s*[.\-–]?\s+(\S.*)$/
function sgvSectionType(title, lessonNumber) {
  const key = fold(title)
  if (lessonNumber === 0) return 'guide'
  if (/muc tieu|yeu cau can dat/.test(key)) return 'objectives'
  if (/tham khao|thong tin bo sung|tu lieu/.test(key)) return 'reference'
  if (/to chuc|hoat dong|tien trinh|goi y cach thuc/.test(key)) return 'activity'
  return 'guide'
}
const lessonHeading = (block) => {
  const match = block.text.replace(/^[*_\s]+/, '').match(/^(?:BÀI|Bài)\s*(\d{1,2})\s*[.:]?\s*(.*)$/)
  if (!match) return null
  const title = match[2].replace(/[*_]+/g, '').trim()
  if (title.length < 4 || upperRatio(title) < 0.7 || /(\.{2,}|…)\s*\d+$/.test(title)) return null
  return { number: Number(match[1]), title }
}
const chapterHeading = (block) => block.kind === 'heading' && /^(CHƯƠNG|CHỦ ĐỀ)\s*(\d+|[IVX]+)\b/.test(block.text.replace(/^[*_\s]+/, '')) && upperRatio(block.text) > 0.7

function parseSgv(book, pages) {
  const blocks = [...pages.values()].flat()
  const lessons = [{ number: 0, title: 'Hướng dẫn chung', chapter: 'Phần một: Hướng dẫn chung', blocks: [] }]
  let chapter = ''
  let chapterBlocks = null
  for (const block of blocks) {
    const heading = lessonHeading(block)
    if (heading && heading.number === lessons.at(-1).number + 1) {
      lessons.push({ number: heading.number, title: heading.title, chapter, blocks: chapterBlocks ? [{ ...chapterBlocks[0], kind: 'section', text: 'Hướng dẫn mở đầu chương' }, ...chapterBlocks] : [] })
      chapterBlocks = null
      continue
    }
    if (chapterHeading(block) && lessons.at(-1).number > 0) {
      chapter = block.text.replace(/^[*_\s]+|[*_\s]+$/g, '').replace(/^(CHƯƠNG|CHỦ ĐỀ)\s*(\d+|[IVX]+)\s*[.:]?\s*/, (_, kind, number) => `${kind === 'CHƯƠNG' ? 'Chương' : 'Chủ đề'} ${number}: `)
      chapterBlocks = []
      continue
    }
    if (chapterBlocks) chapterBlocks.push(block)
    else lessons.at(-1).blocks.push(block)
  }
  return lessons.map((lesson) => {
    const sections = []
    let current = null
    for (const block of lesson.blocks) {
      if (block.kind === 'image') continue
      if (block.kind === 'section') { current = { title: block.text, type: 'guide', paragraphs: [] }; sections.push(current); continue }
      const match = block.text.replace(/^[*_\s]+/, '').match(roman)
      if (match && block.text.length < 140 && upperRatio(match[2]) > 0.7) {
        const title = `${match[1]}. ${sentenceCase(match[2].replace(/[*_]+/g, '').replace(/[.:]$/, '').trim())}`
        current = { title, type: sgvSectionType(match[2], lesson.number), paragraphs: [] }
        sections.push(current)
        continue
      }
      if (!current) { current = { title: lesson.number === 0 ? 'Giới thiệu' : 'Mở đầu', type: 'guide', paragraphs: [] }; sections.push(current) }
      current.paragraphs.push({ text: block.text, page: block.page, type: current.type })
    }
    return { ...lesson, sections: sections.filter((section) => section.paragraphs.length) }
  }).filter((lesson) => lesson.sections.length)
}

// ---------- Sections, page marks and chunks ----------

function sectionRecord(section) {
  let content = ''
  const marks = []
  let page = null
  for (const [index, paragraph] of section.paragraphs.entries()) {
    if (index) content += '\n'
    if (paragraph.page !== page) { if (page !== null) marks.push([content.length, paragraph.page]); page = paragraph.page }
    content += paragraph.text
  }
  const pages = section.paragraphs.map((paragraph) => paragraph.page)
  return { title: section.title, content, page_start: Math.min(...pages), page_end: Math.max(...pages), page_marks: marks }
}

const sentences = (text) => text.split(/(?<=[.!?…;])\s+(?=[\p{Lu}“"(\d–-])/u)
function splitLong(text) {
  if (text.length <= chunkSize) return [text]
  const pieces = []
  let rest = text
  while (rest.length > chunkSize) {
    const cut = rest.lastIndexOf(' ', chunkSize)
    pieces.push(rest.slice(0, cut > chunkSize / 2 ? cut : chunkSize).trim())
    rest = rest.slice(cut > chunkSize / 2 ? cut : chunkSize).trim()
  }
  return rest ? [...pieces, rest] : pieces
}

/** Consecutive paragraphs of one type form a run; figure captions travel with the lesson text around them. */
function runs(paragraphs) {
  const result = []
  for (const paragraph of paragraphs) {
    const previous = result.at(-1)
    const joins = previous && (previous.type === paragraph.type || (paragraph.type === 'caption' && previous.type === 'body') || (previous.type === 'caption' && paragraph.type === 'body'))
    if (joins) {
      if (previous.type === 'caption' && paragraph.type === 'body') previous.type = 'body'
      previous.types.add(paragraph.type)
      previous.paragraphs.push(paragraph)
    } else result.push({ type: paragraph.type, types: new Set([paragraph.type]), paragraphs: [paragraph] })
  }
  // A sub-heading ("a) Kinh tế") belongs to the text after it, whatever that text's type.
  for (let index = result.length - 2; index >= 0; index--) {
    if (result[index].paragraphs.every((paragraph) => paragraph.lead)) {
      result[index + 1].paragraphs.unshift(...result[index].paragraphs)
      result.splice(index, 1)
    }
  }
  return result
}

function chunkRun(run) {
  const units = run.paragraphs.flatMap((paragraph) => sentences(paragraph.text).flatMap(splitLong).map((text, index) => ({ text, page: paragraph.page, joiner: index ? ' ' : '\n', type: paragraph.type })))
  const chunks = []
  let current = []
  const length = (list) => list.reduce((sum, unit, index) => sum + unit.text.length + (index ? 1 : 0), 0)
  for (const unit of units) {
    if (current.length && length([...current, unit]) > chunkSize) {
      chunks.push(current)
      const overlap = []
      for (let index = current.length - 1; index >= 0 && length([current[index], ...overlap]) <= chunkOverlap; index--) overlap.unshift(current[index])
      current = length([...overlap, unit]) > chunkSize ? [] : overlap
    }
    current.push(unit)
  }
  if (current.length) chunks.push(current)
  return chunks.map((list) => ({
    text: list.map((unit, index) => (index ? unit.joiner : '') + unit.text).join(''),
    page_start: Math.min(...list.map((unit) => unit.page)), page_end: Math.max(...list.map((unit) => unit.page)),
    content_types: [...new Set(list.map((unit) => unit.type))],
  }))
}

function buildChunks(prefix, lesson, sections, base) {
  const chunks = []
  for (const [sectionIndex, section] of sections.entries()) {
    for (const run of runs(section.paragraphs)) {
      for (const piece of chunkRun(run)) {
        const types = run.type === 'body' ? ['body', ...piece.content_types.filter((type) => type !== 'body')] : [run.type, ...piece.content_types.filter((type) => type !== run.type)]
        chunks.push({ chunk_id: `${prefix}${lesson.grade}_B${pad(lesson.lesson_number, 2)}_C${pad(chunks.length + 1, 3)}`, grade: lesson.grade, subject: 'history', chapter: lesson.chapter, lesson_number: lesson.lesson_number, lesson_title: lesson.lesson_title,
          section_index: sectionIndex, section_title: section.title, content_type: types[0], content_types: [...new Set(types)], page_start: piece.page_start, page_end: piece.page_end, ...base, text: piece.text })
      }
    }
  }
  return chunks
}

// ---------- Build ----------

const { books } = JSON.parse(await readFile(resolve(root, 'source/books.json'), 'utf8'))
const lessons = []
const chunks = []
const guides = []
const teacherChunks = []
const warnings = []
const base = (book, kind) => ({ book: book.book, book_series: book.book_series, publisher: book.publisher, source_pdf: book.source_pdf, book_type: kind, text_source: 'ocr', open_flags: 0 })

for (const book of books.filter((item) => item.kind === 'sgk')) {
  const pages = await readBook(book.file)
  // A lesson runs until the next one starts, so a chapter's opening page closes the lesson before it (as in
  // dataset 1.0, whose journeys quote it as the lead into the next chapter).
  for (const entry of book.lessons) {
    const sections = parseSgkLesson(book, entry, pages)
    const lesson = { grade: book.grade, subject: 'history', book: book.book, book_type: 'sgk', chapter: entry.chapter, lesson_number: entry.number, lesson_title: entry.title, page_start: entry.pages[0], page_end: entry.pages[1], source_pdf: book.source_pdf, title_source: 'toc', sections: sections.map(sectionRecord) }
    const numbered = lesson.sections.filter((section) => /^\d+\./.test(section.title)).length
    if (entry.number > 0 && !numbered) warnings.push(`SGK lớp ${book.grade} bài ${entry.number}: không tìm thấy mục đánh số`)
    lessons.push(lesson)
    chunks.push(...buildChunks('LS', lesson, sections, base(book, 'sgk')))
  }
}

const titleKey = (title) => new Set(fold(title).split(' ').filter((word) => word.length > 1))
// Same lesson when one title contains (almost) all words of the other, e.g. "Cách mạng công nghiệp" and
// "Cách mạng công nghiệp (nửa sau thế kỉ XVIII - giữa thế kỉ XIX)". Ties go to the closer overall match.
function similarity(a, b) {
  const x = titleKey(a)
  const y = titleKey(b)
  const shared = [...x].filter((word) => y.has(word)).length
  const jaccard = shared / (x.size + y.size - shared || 1)
  return { score: jaccard < 0.25 ? 0 : shared / Math.max(3, Math.min(x.size, y.size)), jaccard }
}
/** Pairs each teacher's-book lesson with at most one textbook lesson of the same grade, best matches first. */
function linkLessons(entries, grade) {
  const pairs = []
  for (const entry of entries.filter((item) => item.number > 0)) {
    for (const lesson of lessons.filter((item) => item.grade === grade && item.lesson_number > 0)) {
      const { score, jaccard } = similarity(lesson.lesson_title, entry.title)
      if (score >= 0.8) pairs.push({ entry, lesson, score, jaccard, distance: Math.abs(entry.number - lesson.lesson_number) })
    }
  }
  pairs.sort((a, b) => b.score - a.score || b.jaccard - a.jaccard || a.distance - b.distance)
  const links = new Map()
  const taken = new Set()
  for (const pair of pairs) if (!links.has(pair.entry) && !taken.has(pair.lesson)) { links.set(pair.entry, pair.lesson); taken.add(pair.lesson) }
  return links
}

for (const book of books.filter((item) => item.kind === 'sgv')) {
  const parsed = parseSgv(book, await readBook(book.file))
  const expected = Math.max(...parsed.map((lesson) => lesson.number))
  if (parsed.length !== expected + 1) warnings.push(`SGV lớp ${book.grade}: thiếu bài (${parsed.map((lesson) => lesson.number).join(', ')})`)
  const links = linkLessons(parsed, book.grade)
  for (const entry of parsed) {
    const linked = links.get(entry)
    const pages = entry.sections.flatMap((section) => section.paragraphs.map((paragraph) => paragraph.page))
    const guide = { grade: book.grade, subject: 'history', book: book.book, book_type: 'sgv', chapter: entry.number === 0 ? entry.chapter : (linked?.chapter || entry.chapter || ''), lesson_number: entry.number,
      lesson_title: entry.number === 0 ? entry.title : linked ? linked.lesson_title : book.titles?.[entry.number] ?? sentenceCase(entry.title), page_start: Math.min(...pages), page_end: Math.max(...pages), source_pdf: book.source_pdf,
      title_source: 'heading', linked_lesson_id: linked ? `LS${linked.grade}_B${pad(linked.lesson_number, 2)}` : null, sections: entry.sections.map(sectionRecord) }
    if (entry.number > 0 && !linked) warnings.push(`SGV lớp ${book.grade} bài ${entry.number} "${entry.title}" không có bài SGK tương ứng`)
    guides.push(guide)
    teacherChunks.push(...buildChunks('GV', guide, entry.sections, base(book, 'sgv')))
  }
}

for (const chunk of [...chunks, ...teacherChunks]) if (Number(chunk.chunk_id.slice(-3)) > 999) throw new Error(`Too many chunks in ${chunk.chunk_id}`)

// ---------- Write ----------

const grades = [...new Set(lessons.map((lesson) => lesson.grade))]
const average = (list) => Math.round(list.reduce((sum, chunk) => sum + chunk.text.length, 0) / list.length)
const manifest = {
  name: 'XuyenSuKi - Lịch sử Việt Nam lớp 6-12',
  version,
  created: today,
  license_note: 'Nội dung SGK, SGV thuộc bản quyền NXB Giáo dục Việt Nam; chỉ dùng nội bộ cho học tập / nghiên cứu.',
  language: 'vi',
  subject: 'history',
  pipeline: { ocr: 'Mistral OCR (mistral-ocr-latest) qua ocr_lich_su.py, sửa lỗi theo sua_loi_ocr.json', figures: 'chữ trong hình SGK: Mistral OCR từng ảnh qua ocr_chu_trong_hinh.py', builder: 'scripts/build-dataset-from-ocr.mjs' },
  chunking: { chunk_size: chunkSize, chunk_overlap: chunkOverlap, unit: 'characters' },
  totals: { books: books.filter((book) => book.kind === 'sgk').length, lessons: lessons.length, sections: lessons.reduce((sum, lesson) => sum + lesson.sections.length, 0), chunks: chunks.length, chunk_chars_avg: average(chunks), chunk_chars_max: Math.max(...chunks.map((chunk) => chunk.text.length)),
    teacher_books: books.filter((book) => book.kind === 'sgv').length, teacher_guides: guides.length, teacher_chunks: teacherChunks.length },
  by_grade: Object.fromEntries(grades.map((grade) => [grade, { chapters: new Set(lessons.filter((lesson) => lesson.grade === grade).map((lesson) => lesson.chapter)).size, lessons: lessons.filter((lesson) => lesson.grade === grade).length, chunks: chunks.filter((chunk) => chunk.grade === grade).length, teacher_guides: guides.filter((guide) => guide.grade === grade).length, teacher_chunks: teacherChunks.filter((chunk) => chunk.grade === grade).length }])),
  sources: books.map((book) => ({ kind: book.kind, source_pdf: book.source_pdf, grade: book.grade, book: book.book, book_series: book.book_series, publisher: book.publisher })),
  content_types: {
    sgk: { body: 'lời giảng', source: 'tư liệu trích dẫn', did_you_know: '"Em có biết?", "Kết nối với..."', question: 'câu hỏi / yêu cầu trong bài', exercise: 'Luyện tập – Vận dụng', objectives: 'mục tiêu bài học', intro: 'mở đầu bài, giới thiệu chương', caption: 'chú thích hình', figure: 'chữ trong hình (sơ đồ, trục thời gian, bảng dạng ảnh)' },
    sgv: { objectives: 'mục tiêu', guide: 'chuẩn bị, lưu ý nội dung và phương pháp, hướng dẫn chung', activity: 'gợi ý tổ chức hoạt động dạy học', reference: 'tài liệu tham khảo' },
  },
  warnings,
}

const count = (list, type) => list.filter((chunk) => chunk.content_type === type).length
const readme = `# XuyenSuKi - Lịch sử Việt Nam lớp 6-12

**Phiên bản ${version}** · tạo ngày ${today} · sinh tự động bởi \`npm run build:dataset\` (đừng sửa tay)

Văn bản phần Lịch sử của 7 sách giáo khoa (SGK) và 7 sách giáo viên (SGV) lớp 6-12, bộ *Kết nối tri thức với cuộc
sống* (chương trình GDPT 2018), tách theo chương / bài / mục và chia chunk, làm kho tri thức cho chatbot RAG và thư viện
SGK. Mỗi chunk đủ thông tin trích dẫn nguồn (sách, bộ sách, NXB, bài, trang).

## Bản quyền và phạm vi sử dụng

Nội dung SGK, SGV do **NXB Giáo dục Việt Nam** giữ bản quyền. Dataset chỉ dùng **nội bộ nhóm** cho học tập / nghiên cứu;
không công bố công khai, không dùng thương mại khi chưa được phép. Khi trả lời, trích dẫn nguồn sách (\`book\`,
\`book_series\`, \`publisher\`, trang).

## Nguồn và cách tạo

1. \`ocr_lich_su.py\` (thư mục OCR, mặc định \`D:\\Ocr\`) OCR phần Lịch sử của từng PDF bằng **Mistral OCR**, sửa lỗi theo
   \`sua_loi_ocr.json\`, ra \`output/<loại sách>/<sách>.md\` (mỗi trang mở đầu bằng \`<!-- Trang PDF N -->\`) và cắt các hình.
2. \`ocr_chu_trong_hinh.py\` OCR chữ nằm trong hình SGK (sơ đồ, trục thời gian, bảng dạng ảnh) vào \`images/<sách>/figures.json\`.
3. \`npm run build:dataset -- <thư mục output>\` (\`scripts/build-dataset-from-ocr.mjs\`) dựng thư mục này:
   - SGK tách bài theo mục lục trong \`source/books.json\` (trang PDF), tách mục theo tiêu đề "1. ...", "Luyện tập – Vận dụng";
     \`section_fixes\` trong file đó bổ sung tiêu đề mục mà OCR làm mất số thứ tự.
   - SGV tách theo tiêu đề "BÀI N." và các phần I. Mục tiêu, II. Chuẩn bị, ..., V. Tài liệu tham khảo; phần trước Bài 1 là
     "Hướng dẫn chung" (bài 0). Bài SGV được nối với bài SGK cùng lớp có tên trùng khớp (\`linked_lesson_id\`).
4. Sau khi build: \`npm run remap:journeys\` (trỏ lại trích dẫn của hành trình), \`npm run check:dataset\`,
   \`npm run build:embeddings\`.

## Cấu trúc

\`\`\`text
data/history/
├── README.md, manifest.json, SHA256SUMS.txt
├── source/books.json               # mục lục nguồn: sách, bài, trang PDF, sửa tiêu đề mục
├── lessons/lessons_all.json        # bài SGK (mảng JSON, có nội dung từng mục)
├── lessons/teacher_guides.json     # phần hướng dẫn của SGV, cùng schema bài học
├── chunks/chunks_all.jsonl         # chunk SGK, mỗi dòng 1 chunk (nạp vector DB)
├── chunks/teacher_chunks.jsonl     # chunk SGV
└── schema/lesson.schema.json, schema/chunk.schema.json
\`\`\`

## Thống kê

SGK: ${manifest.totals.books} sách, ${lessons.length} bài, ${manifest.totals.sections} mục, ${chunks.length} chunk (~${chunkSize} ký tự, overlap ${chunkOverlap}, ngắt theo câu;
trung bình ${manifest.totals.chunk_chars_avg}, dài nhất ${manifest.totals.chunk_chars_max} ký tự). SGV: ${manifest.totals.teacher_books} sách, ${guides.length} phần, ${teacherChunks.length} chunk.

| Lớp | Chương / Chủ đề | Bài SGK | Chunk SGK | Phần SGV | Chunk SGV |
|---|---|---|---|---|---|
${grades.map((grade) => { const item = manifest.by_grade[grade]; return `| ${grade} | ${item.chapters} | ${item.lessons} | ${item.chunks} | ${item.teacher_guides} | ${item.teacher_chunks} |` }).join('\n')}

| Lớp | Sách | File nguồn | Trang PDF |
|---|---|---|---|
${books.filter((book) => book.kind === 'sgk').map((book) => `| ${book.grade} | ${book.book} | \`${book.source_pdf}\` | ${book.lessons.map((lesson) => lesson.pages).reduce((ranges, [a, b]) => { const last = ranges.at(-1); if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b); else ranges.push([a, b]); return ranges }, []).map(([a, b]) => `${a}-${b}`).join(', ')} |`).join('\n')}
${books.filter((book) => book.kind === 'sgv').map((book) => `| ${book.grade} | ${book.book} | \`${book.source_pdf}\` | ${Math.min(...guides.filter((guide) => guide.source_pdf === book.source_pdf).map((guide) => guide.page_start))}-${Math.max(...guides.filter((guide) => guide.source_pdf === book.source_pdf).map((guide) => guide.page_end))} |`).join('\n')}

## Schema

### Bài học (\`lessons/*.json\`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| \`grade\` | int | Lớp (6-12) |
| \`subject\` | str | Luôn \`"history"\` |
| \`book\`, \`book_type\` | str | Tên sách; \`sgk\` hoặc \`sgv\` |
| \`chapter\` | str | "Chương N: ..." (lớp 6-9), "Chủ đề N: ..." (lớp 10-12), "Chủ đề chung", "Mở đầu" |
| \`lesson_number\` | int | Số bài; \`0\` = phần mở đầu (SGK) hoặc hướng dẫn chung (SGV) |
| \`lesson_title\` | str | Tên bài |
| \`page_start\`, \`page_end\` | int | Trang **trong file PDF** (không phải số in trên trang) |
| \`source_pdf\` | str | Tên file PDF nguồn |
| \`title_source\` | str | \`toc\` (mục lục SGK) hoặc \`heading\` (tiêu đề bài trong SGV) |
| \`linked_lesson_id\` | str/null | (SGV) bài SGK tương ứng, vd \`LS7_B11\` |
| \`sections\` | list | \`[{"title", "content", "page_start", "page_end", "page_marks"}]\`; đoạn cách nhau bằng \`\\n\`; \`page_marks\` = \`[[vị trí ký tự, trang], ...]\` tại chỗ nội dung sang trang |

Mã bài: SGK \`LS<lớp>_B<số bài 2 chữ số>\` (vd \`LS7_B11\`), SGV \`GV<lớp>_B<số bài>\` (vd \`GV7_B11\`, \`GV7_B00\` = hướng dẫn chung).
Số bài SGV theo sách giáo viên; lớp 10 có bài SGV không có bài SGK tương ứng (\`linked_lesson_id = null\`).

### Chunk (\`chunks/*.jsonl\`)

Mỗi chunk nằm gọn trong **một mục** và **một loại nội dung**.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| \`chunk_id\` | str | \`LS<lớp>_B<bài>_C<số chunk 3 chữ số>\` (SGK) hoặc \`GV...\` (SGV); duy nhất |
| \`grade\`, \`subject\`, \`chapter\`, \`lesson_number\`, \`lesson_title\` | | Như bài học chứa chunk |
| \`section_index\`, \`section_title\` | int, str | Mục chứa chunk |
| \`content_type\` | str | SGK: ${Object.entries(manifest.content_types.sgk).map(([type, label]) => `\`${type}\` (${label})`).join(', ')}. SGV: ${Object.entries(manifest.content_types.sgv).map(([type, label]) => `\`${type}\` (${label})`).join(', ')} |
| \`content_types\` | list | Các loại đoạn có trong chunk (vd \`["body", "caption"]\`) |
| \`page_start\`, \`page_end\` | int | Trang **của chính chunk** trong file PDF |
| \`book\`, \`book_series\`, \`publisher\`, \`source_pdf\`, \`book_type\` | str | Nguồn để trích dẫn |
| \`text_source\` | str | \`ocr\` |
| \`open_flags\` | int | \`0\` (pipeline Mistral không đánh dấu dòng nghi ngờ) |
| \`text\` | str | Nội dung (đoạn cách nhau bằng \`\\n\`) |

Số chunk SGK theo loại: ${Object.keys(manifest.content_types.sgk).map((type) => `${type} ${count(chunks, type)}`).join(', ')}.
Số chunk SGV theo loại: ${Object.keys(manifest.content_types.sgv).map((type) => `${type} ${count(teacherChunks, type)}`).join(', ')}.

Gợi ý dùng cho RAG: trả lời câu hỏi sự kiện ưu tiên \`body\` / \`source\` / \`did_you_know\` / \`figure\`; bỏ \`question\`,
\`exercise\`, \`objectives\`, \`intro\` khỏi chỉ mục. Ứng dụng chỉ dùng chunk SGK cho tìm kiếm và nhân vật; SGV phục vụ giáo viên
qua \`/api/teacher-guides\`.

## Hạn chế đã biết

- Nhãn \`content_type\` sinh bằng quy tắc (tiêu đề "Em có biết?", "Kết nối với...", dòng "(Theo ...)", câu hỏi đánh số / "Hãy..."),
  có thể sai với đoạn không theo mẫu. Bảng biểu được làm phẳng thành hàng "ô | ô | ô".
- Chữ trong hình là OCR từng ảnh, giữ nguyên thứ tự Mistral đọc; nhãn lược đồ có thể rời rạc.
- Chỉ gồm phần Lịch sử; trang Địa lí, bìa, lời nói đầu, mục lục, bảng thuật ngữ bị loại. Trang mở đầu chương nằm ở cuối
  bài đứng trước nó, thành mục "Giới thiệu chương" (\`intro\`).
${warnings.length ? `- Cảnh báo khi build:\n${warnings.map((warning) => `  - ${warning}`).join('\n')}\n` : ''}`

const files = {
  'README.md': readme,
  'manifest.json': JSON.stringify(manifest, null, 2) + '\n',
  'lessons/lessons_all.json': JSON.stringify(lessons, null, 1) + '\n',
  'chunks/chunks_all.jsonl': chunks.map((chunk) => JSON.stringify(chunk)).join('\n') + '\n',
  'lessons/teacher_guides.json': JSON.stringify(guides, null, 1) + '\n',
  'chunks/teacher_chunks.jsonl': teacherChunks.map((chunk) => JSON.stringify(chunk)).join('\n') + '\n',
}
for (const [name, content] of Object.entries(files)) {
  await mkdir(dirname(resolve(root, name)), { recursive: true })
  await writeFile(resolve(root, name), content)
}
const checksummed = ['README.md', 'manifest.json', 'lessons/lessons_all.json', 'lessons/teacher_guides.json', 'chunks/chunks_all.jsonl', 'chunks/teacher_chunks.jsonl', 'schema/lesson.schema.json', 'schema/chunk.schema.json']
const sums = await Promise.all(checksummed.map(async (name) => `${createHash('sha256').update(await readFile(resolve(root, name))).digest('hex')}  ${name}`))
await writeFile(resolve(root, 'SHA256SUMS.txt'), sums.join('\n') + '\n')
console.log(`Dataset v${version}: SGK ${lessons.length} bài, ${manifest.totals.sections} mục, ${chunks.length} chunk; SGV ${guides.length} phần, ${teacherChunks.length} chunk.`)
for (const warning of warnings) console.warn(`! ${warning}`)

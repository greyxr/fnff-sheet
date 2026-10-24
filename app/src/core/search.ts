// Fuzzy search over rules sections: plural stemming, prefix and typo matching, title boost. Plain data in and out.

export interface RulesSection {
  id: string
  title: string
  level: number
  path: string[] // titles from the top of the book down to this section
  md: string
  text: string
  page?: number
  pageEnd?: number
  search?: boolean // false keeps a section out of the results
}

export interface Snippet {
  text: string
  marks: [start: number, end: number][] // ranges into text to highlight
}

export interface SearchResult {
  section: RulesSection
  score: number
  snippet: Snippet
}

export interface SearchIndex {
  sections: RulesSection[]
  terms: Map<string, number>[] // per section: term -> weighted frequency
  titles: Set<string>[]
  vocab: Set<string>
}

const WINDOW = 220
const STOP = new Set(
  'a an and are as at be but by for from if in is it of on or that the to was with you how what when where which who do does can'.split(
    ' ',
  ),
)

// Crude stemming so "phases" finds "phase" and "reloading" finds "reload".
const stem = (w: string) =>
  w
    .replace(/ies$/, 'y')
    .replace(/(?<=ss|sh|ch|x|z)es$/, '')
    .replace(/(?<=[^su])s$/, '')
    .replace(/(?<=.{3,})(ing|ed)$/, '')
const tokenize = (s: string) =>
  (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .match(/[a-z0-9]+/g) ?? []
  ).map(stem)

// Edit distance (insert, delete, substitute, swap) between a and b.
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + +(a[i - 1] !== b[j - 1]))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  return d[a.length][b.length]
}

export function buildIndex(sections: RulesSection[]): SearchIndex {
  const vocab = new Set<string>()
  const titles = sections.map((s) => new Set(s.search === false ? [] : tokenize(s.title)))
  const terms = sections.map((s) => {
    const m = new Map<string, number>()
    if (s.search === false) return m
    for (const [text, weight] of [
      [s.title, 4],
      [s.path.slice(0, -1).join(' '), 1.5],
      [s.text ?? '', 1],
    ] as const)
      for (const t of tokenize(text)) {
        vocab.add(t)
        m.set(t, (m.get(t) ?? 0) + weight)
      }
    return m
  })
  return { sections, terms, titles, vocab }
}

// How well a vocabulary term stands in for a query word: exact, longer word it prefixes, or a typo of it.
function similarity(q: string, t: string) {
  if (q === t) return 1
  if (q.length >= 2 && t.startsWith(q)) return 0.75 * (q.length / t.length) ** 0.3
  const max = q.length <= 3 ? 0 : q.length <= 6 ? 1 : 2
  if (!max || Math.abs(q.length - t.length) > max) return 0
  const d = distance(q, t)
  return d <= max ? 0.6 - 0.15 * (d - 1) : 0
}

export function search(index: SearchIndex, query: string, limit = 15): SearchResult[] {
  let words = tokenize(query)
  words = words.filter((t) => !STOP.has(t)).length ? words.filter((t) => !STOP.has(t)) : words
  const matches = words.map((q) => new Map([...index.vocab].map((t) => [t, similarity(q, t)] as const).filter(([, w]) => w)))
  const matched = new Set(matches.flatMap((m) => [...m.keys()]))
  const n = index.sections.length
  const df = matches.map((m) => index.terms.filter((doc) => [...m.keys()].some((t) => doc.has(t))).length)

  const found = index.terms
    .map((doc, i) => {
      let score = 0
      let hits = 0
      matches.forEach((m, k) => {
        const idf = Math.log(1 + (n - df[k] + 0.5) / (df[k] + 0.5))
        const best = Math.max(0, ...[...m].map(([t, w]) => w * Math.log(1 + (doc.get(t) ?? 0))))
        if (best) hits++
        score += best * idf
      })
      if (!hits) return { i, score: 0 }
      score *= hits === words.length ? 1.6 : 0.4 + (0.6 * hits) / words.length
      if (words.every((t) => index.titles[i].has(t))) score *= index.titles[i].size === words.length ? 2 : 1.4 // the title is what was asked for
      return { i, score }
    })
    .filter((r) => r.score)
    .sort((a, b) => b.score - a.score)

  const floor = (found[0]?.score ?? 0) * 0.12 // drop weak fuzzy matches trailing the real hits
  return found
    .filter((r) => r.score >= floor)
    .slice(0, limit)
    .map(({ i, score }) => ({ section: index.sections[i], score, snippet: snippet(index.sections[i].text ?? '', matched) }))
}

// About WINDOW characters starting just before the first matching word.
function snippet(text: string, matched: Set<string>): Snippet {
  const words = [...text.matchAll(/[A-Za-z0-9]+/g)].filter((m) => matched.has(stem(m[0].toLowerCase())))
  const start = words.length ? Math.max(0, words[0].index - 40) : 0
  const end = Math.min(text.length, start + WINDOW)
  const head = start > 0 ? '… ' : ''
  const marks = words
    .filter((m) => m.index >= start && m.index + m[0].length <= end)
    .map((m) => [m.index - start + head.length, m.index + m[0].length - start + head.length] as [number, number])
  return { text: head + text.slice(start, end) + (end < text.length ? ' …' : ''), marks }
}

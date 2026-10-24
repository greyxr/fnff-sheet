import { expect, it } from 'vitest'
import { buildIndex, search } from './search'

const section = (id: string, title: string, text: string) => ({ id, title, level: 2, path: ['Book', title], md: text, text })
const index = buildIndex([
  section('smoke', 'Smoke', 'A grenade of smoke blocks line of sight. Rocket crews ignore it.'),
  section('lamps', 'Lanterns', 'Carrying a lantern lights a small radius around the bearer.'),
])

it('finds a section despite a typo, and marks the match', () => {
  const [top] = search(index, 'lanturn')
  expect(top.section.id).toBe('lamps')
  const [from, to] = top.snippet.marks[0]
  expect(top.snippet.text.slice(from, to)).toBe('lantern')
})

it('returns nothing for text that is not there', () => {
  expect(search(index, 'zzzzqq')).toEqual([])
})

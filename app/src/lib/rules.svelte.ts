// The rules text, fetched from the API the first time it is needed and kept in memory.

import { buildIndex, search } from '../core'
import type { ArmorEntry, CatalogEntry, RulesSection, SearchIndex } from '../core'
import { ApiError, call } from './api'

class Rules {
  sections = $state.raw<RulesSection[]>([])
  arsenal = $state.raw<CatalogEntry[]>([])
  armor = $state.raw<ArmorEntry[]>([])
  index: SearchIndex | null = null
  loading = $state(false)
  missing = $state(false) // the server has no ruleset (404)
  error = $state('')

  get ready() {
    return this.sections.length > 0
  }

  async load() {
    if (this.ready || this.loading) return
    this.loading = true
    this.error = ''
    this.missing = false
    try {
      const data = await call<{ sections?: RulesSection[]; arsenal?: CatalogEntry[]; armor?: ArmorEntry[] }>('GET', '/ruleset')
      if (!data?.sections?.length) throw new Error('The ruleset on the server is empty or malformed')
      this.index = buildIndex(data.sections)
      this.arsenal = data.arsenal ?? []
      this.armor = data.armor ?? []
      this.sections = data.sections
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) this.missing = true
      else this.error = e instanceof Error ? e.message : String(e)
    } finally {
      this.loading = false
    }
  }

  search = (query: string, limit?: number) => (this.index ? search(this.index, query, limit) : [])
}

export const rules = new Rules()

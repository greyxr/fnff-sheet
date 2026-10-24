import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { blankCharacter } from './core'
import { auth } from './lib/auth.svelte'
import { rs } from './lib/ruleset'
import { roster } from './lib/roster.svelte'
import { loadCharacter } from './lib/sheet.svelte'
import type { RosterRecord } from './core'

// An in-memory stand-in for lambda/handler.py: characters and campaigns, 401 unless the password matches.
export const fakeApi = {
  password: 'secret',
  records: new Map<string, RosterRecord>(),
  campaigns: [] as string[],
  get stored() {
    return [...this.records.values()]
  },
  async fetch(url: string, init: RequestInit = {}) {
    const reply = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })
    if ((init.headers as Record<string, string>).Authorization !== this.password) return reply(401, { error: 'Unauthorized' })
    const [kind, id] = new URL(url).pathname.split('/').filter(Boolean)
    const { method } = init
    const body = init.body ? JSON.parse(init.body as string) : undefined
    if (kind === 'campaigns' && method === 'GET') return reply(200, this.campaigns)
    if (kind === 'campaigns' && method === 'POST') {
      if (this.campaigns.includes(body.name)) return reply(409, { error: 'that campaign already exists' })
      return reply(200, this.campaigns.push(body.name) && this.campaigns)
    }
    if (kind !== 'characters') return reply(404, { error: 'Not found' })
    if (method === 'GET') return reply(200, this.stored)
    if (method === 'PUT') this.records.set(id, { id, data: body })
    else if (method === 'DELETE') this.records.delete(id)
    else return reply(404, { error: 'Not found' })
    return reply(204)
  },
}

// A clean sheet, roster, server and browser, for the start of each component test.
export async function resetApp() {
  localStorage.clear()
  vi.stubEnv('VITE_GROUP_API_URL', 'http://api.test')
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => fakeApi.fetch(url, init))
  fakeApi.records.clear()
  fakeApi.campaigns = []
  auth.set(fakeApi.password)
  loadCharacter(blankCharacter(rs))
  Object.assign(roster, { current: null, filter: '' })
  roster.markClean()
  await roster.refresh()
}

export const typing = () => userEvent.setup()

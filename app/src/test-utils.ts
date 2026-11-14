import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { blankCharacter } from './core'
import { auth } from './lib/auth.svelte'
import { rs } from './lib/ruleset'
import { roster } from './lib/roster.svelte'
import { loadCharacter } from './lib/sheet.svelte'
import type { RosterRecord } from './core'

// An in-memory stand-in for the API gateway and lambda/handler.py: 401 for an unknown token, 403 off the player list.
export const fakeApi = {
  tokens: { 'token-gm': 'gm@test', 'token-kai': 'kai@test' } as Record<string, string>,
  allowed: [] as string[],
  records: new Map<string, RosterRecord>(),
  campaigns: [] as string[],
  get stored() {
    return [...this.records.values()]
  },
  async fetch(url: string, init: RequestInit = {}) {
    const reply = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })
    const email = this.tokens[(init.headers as Record<string, string>).Authorization.replace('Bearer ', '')]
    if (!email) return reply(401, { message: 'Unauthorized' })
    if (!this.allowed.includes(email)) return reply(403, { error: `${email} is not on the player list` })
    const [kind, id] = new URL(url).pathname.split('/').filter(Boolean)
    const { method } = init
    const body = init.body ? JSON.parse(init.body as string) : undefined
    if (kind === 'me') return reply(200, { email })
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
  fakeApi.allowed = ['gm@test']
  vi.spyOn(auth, 'refresh').mockResolvedValue(false)
  auth.set('token-gm')
  auth.me = { email: 'gm@test' }
  loadCharacter(blankCharacter(rs))
  Object.assign(roster, { current: null, filter: '' })
  roster.markClean()
  await roster.refresh()
}

export const typing = () => userEvent.setup()

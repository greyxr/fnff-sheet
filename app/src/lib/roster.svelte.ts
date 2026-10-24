// The group's characters and campaigns, on the server (see auth.svelte.ts). A record is { id, data } = characters/{id}.json;
// a campaign is just a name in the server's list, and characters point at it by name (data.charCampaign).
import { blankCharacter } from '../core'
import { call } from './api'
import { rs } from './ruleset'
import { loadCharacter, sheet } from './sheet.svelte'
import { showToast } from './toast.svelte'
import type { Character, RosterRecord } from '../core'

export const MAX_NAME = 60 // the server's rule
const checkName = (name: string, what: string) => {
  if (!name || name.length > MAX_NAME) throw new Error(`${what} needs 1 to ${MAX_NAME} characters`)
}
const snap = () => JSON.stringify($state.snapshot(sheet))
const save = (r: RosterRecord) => call('PUT', `/characters/${r.id}`, r.data)

export const label = (r: RosterRecord, withCampaign: boolean) =>
  withCampaign && r.data.charCampaign ? `${r.data.charCampaign} / ${r.data.charName}` : r.data.charName

class Roster {
  records = $state<RosterRecord[]>([])
  campaigns = $state<string[]>([])
  filter = $state('') // the campaign being viewed; '' is all of them
  current = $state<string | null>(null) // id of the character in the sheet, if it came from the roster
  private loaded = '' // the sheet as last loaded or saved
  shown = $derived(this.records.filter((r) => !this.filter || r.data.charCampaign === this.filter))
  markClean = () => (this.loaded = snap())

  // Replacing the sheet loses edits that were not saved: ask first.
  discardsEdits = () => snap() !== this.loaded && !confirm('The sheet has unsaved changes. Replace it anyway?')

  // Run an action, telling the user if it fails.
  private attempt = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true)
    }
  }

  private put(record: RosterRecord) {
    this.records = [...this.records.filter((r) => r.id !== record.id), record]
    this.current = record.id
    this.markClean()
  }

  // Whether the server accepts this password (the gate asks before keeping it).
  check = (password: string) => call('GET', '/characters', undefined, password)

  async refresh() {
    const [records, campaigns] = await Promise.all([call<RosterRecord[]>('GET', '/characters'), call<string[]>('GET', '/campaigns')])
    this.records = records
    this.campaigns = [...campaigns].sort()
    if (this.filter && !this.campaigns.includes(this.filter)) this.filter = ''
  }

  start = () => {
    this.markClean()
    return this.attempt(() => this.refresh())
  }

  open(id: string) {
    const record = this.records.find((r) => r.id === id)
    if (!record || this.discardsEdits()) return
    loadCharacter(record.data)
    this.current = id
    this.markClean()
  }

  // Save the sheet over the open character, or as a new one (after an import, or from a blank sheet).
  saveSheet = () =>
    this.attempt(async () => {
      const name = sheet.charName.trim()
      checkName(name, 'The character name')
      const record = { id: this.current ?? crypto.randomUUID(), data: { ...($state.snapshot(sheet) as Character), charName: name } }
      await save(record)
      this.put(record)
      showToast(`Saved ${name}`)
    })

  removeCurrent = () =>
    this.attempt(async () => {
      const id = this.current
      if (!id || !confirm(`Delete ${this.records.find((r) => r.id === id)?.data.charName ?? 'this character'} from the roster?`)) return
      await call('DELETE', `/characters/${id}`)
      this.records = this.records.filter((r) => r.id !== id)
      this.current = null
    })

  // These two throw, so the dialog that asked can show why.
  async create(name: string, campaign: string) {
    checkName(name, 'The character name')
    const record = { id: crypto.randomUUID(), data: { ...blankCharacter(rs), charName: name, charCampaign: campaign } }
    if (this.discardsEdits()) return
    await save(record)
    loadCharacter(record.data)
    this.put(record)
  }

  async createCampaign(name: string) {
    checkName(name, 'The campaign name')
    this.campaigns = (await call<string[]>('POST', '/campaigns', { name })).sort()
  }
}

export const roster = new Roster()

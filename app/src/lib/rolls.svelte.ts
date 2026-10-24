// The roll log, shown beside every tab, and what is picked on Operative to roll (not part of the character).
import { d10, rollTotal } from '../core'

export interface Entry {
  label: string
  detail: string
  result: number
  ok?: boolean
  again: () => void
} // again: the same roll, a fresh die
const LOG_SIZE = 50
export const log: Entry[] = $state([])
export const sel = $state({ stat: '', skill: '' })

export function logRoll(e: Entry) {
  log.unshift(e)
  log.length = Math.min(log.length, LOG_SIZE)
}

export const rollCheck = (label: string, total: number, terms: string[]) =>
  logRoll({ label, ...rollTotal(total, terms), again: () => rollCheck(label, total, terms) })

// A save: roll this or less.
export function rollSave(label: string, target: number) {
  const die = d10()
  logRoll({ label, detail: `1D10 [${die}] vs ≤ ${target}`, result: die, ok: die <= target, again: () => rollSave(label, target) })
}

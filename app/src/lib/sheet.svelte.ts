import { blankCharacter, normalizeCharacter } from '../core'
import { rs } from './ruleset'
import type { Character } from '../core'

const KEY = 'fnff_v1' // the key the original site autosaved under, so its saved sheet carries over

function loadSaved(): Character {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return normalizeCharacter(rs, JSON.parse(saved))
  } catch {
    /* storage blocked, or a damaged save: start fresh */
  }
  return blankCharacter(rs)
}

// The character being edited. Everything on screen reads and changes this one object.
export const sheet: Character = $state(loadSaved())

// Replace the sheet with another character (from the roster or a file).
export function loadCharacter(data: unknown) {
  for (const key of Object.keys(sheet)) delete (sheet as unknown as Record<string, unknown>)[key]
  Object.assign(sheet, normalizeCharacter(rs, data))
}

// Keep a copy in this browser as the sheet changes.
$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify($state.snapshot(sheet))
    try {
      localStorage.setItem(KEY, json)
    } catch {
      /* nowhere to keep it */
    }
  })
})

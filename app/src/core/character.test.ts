import { describe, expect, it } from 'vitest'
import { blankCharacter, normalizeCharacter } from './character'
import { syncCustom, weaponFromCatalog } from './combat'
import { FNFF as rs } from './ruleset'

describe('normalizeCharacter', () => {
  it('turns anything unreadable into a blank character', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}]) expect(normalizeCharacter(rs, bad)).toEqual(blankCharacter(rs))
  })
})

describe('weapons from the catalogue', () => {
  const entry = { group: 'Test', name: 'Zap', skill: 'Pistol', accuracy: 1, damage: '2D6', capacity: 8, note: 'ROF 2' }

  it('marks a changed weapon once, ignores ammo and name edits, and unmarks it when set back', () => {
    const w = weaponFromCatalog(1, entry)
    w.ammo = 2
    syncCustom(w)
    expect(w.name).toBe('Zap')
    w.damage = '3D6'
    syncCustom(w)
    syncCustom(w)
    expect(w.name).toBe('Zap (custom)')
    w.damage = '2D6'
    syncCustom(w)
    expect(w.name).toBe('Zap')
  })
})

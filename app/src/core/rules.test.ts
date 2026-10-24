import { describe, expect, it } from 'vitest'
import { FNFF as rs } from './ruleset'
import { attack, availablePhases, consciousnessSave, deathSave, defense } from './rules'

describe('derived stats', () => {
  it('acts in more phases as REF rises', () => {
    expect(availablePhases(rs, 4)).toEqual({ 1: false, 2: false, 3: true })
    expect(availablePhases(rs, 5)).toEqual({ 1: false, 2: true, 3: true })
    expect(availablePhases(rs, 8)).toEqual({ 1: true, 2: true, 3: true })
  })
})

describe('wounds', () => {
  it('has saves by wound and body type', () => {
    expect(consciousnessSave(rs, 'SW', 5)).toBe(5)
    expect(consciousnessSave(rs, 'FW', 10)).toBe(9)
    expect(consciousnessSave(rs, 'none', 5)).toBeUndefined()
    expect([2, 4, 10].map((bt) => deathSave(rs, bt))).toEqual([2, 3, 6])
  })
})

describe('attack', () => {
  const base = { stat: 8, skill: 'Pistol', skillLevel: 6, accuracy: 2, aim: 0, feint: false, cem: 0, moving: false, specific: false }

  it('adds REF, the skill and the weapon accuracy', () => {
    expect(attack(rs, base)).toEqual({ total: 16, terms: ['REF 8', 'Pistol 6', 'Accuracy +2'] })
  })

  it('adds 2 for each phase of aiming and 2 for a feint, and takes off combat experience', () => {
    expect(attack(rs, { ...base, aim: 2, feint: true, cem: 4 }).total).toBe(18)
  })
})

describe('defense', () => {
  const base = { stat: 8, skill: 'Athletics', skillLevel: 5, range: 2, fire: 0, cover: 0, dodge: false, turning: false }

  it('adds REF, Athletics and the range', () => {
    expect(defense(rs, base).total).toBe(15)
  })
})

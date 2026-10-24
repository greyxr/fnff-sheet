import { describe, expect, it } from 'vitest'
import { blankCharacter } from './character'
import { damageBonus, resolveHit } from './damage'
import { rollDice } from './dice'
import { FNFF as rs } from './ruleset'

const seq =
  (...n: number[]) =>
  () =>
    n.shift()!

describe('rollDice', () => {
  it('adds the dice and the modifier', () => {
    expect(rollDice('2D6+1', seq(3, 4))).toEqual({ total: 8, rolls: [3, 4] })
    expect(rollDice('3D6-2', seq(1, 1, 1)).total).toBe(1)
    expect(() => rollDice('999999999D6')).toThrow()
  })
})

describe('damageBonus', () => {
  it("follows the book's punch: +1 for a Strong body and +4 advantage, and the skill level only for martial arts", () => {
    const c = blankCharacter(rs)
    c.stats.BT = 8
    c.skills.MartialArts = 5
    expect(damageBonus(rs, c, 'Brawling', 4)).toEqual({ total: 5, terms: ['Advantage +4', 'Strong body +1'] })
    expect(damageBonus(rs, c, 'MartialArts', 4).total).toBe(10)
    expect(damageBonus(rs, c, 'Pistol', 4)).toEqual({ total: 4, terms: ['Advantage +4'] }) // guns add no strength
  })
})

describe('resolveHit', () => {
  const man = () => {
    const c = blankCharacter(rs)
    c.stats.BT = 6
    return c
  } // average body

  it("reads the book's armor example: 34 against SP 18 leaves 16", () => {
    const c = man()
    c.armorSP.Torso = 18
    const r = resolveHit(rs, c, { location: 'Torso', damage: 34 })
    expect(r.total).toBe(16)
    expect(r.level).toBe('MW')
    expect(r.armorSP).toBe(17)
  })

  it('doubles the head, and scales with body type', () => {
    expect(resolveHit(rs, man(), { location: 'Head', damage: 5 }).level).toBe('CW')
    const weak = man()
    weak.stats.BT = 2
    expect(resolveHit(rs, weak, { location: 'Torso', damage: 5 }).level).toBe('CW')
  })

  it('counts bludgeoning in fifths', () => {
    expect(resolveHit(rs, man(), { location: 'Torso', damage: 15, bludgeoning: true }).total).toBe(3)
    expect(resolveHit(rs, man(), { location: 'Torso', damage: 4, bludgeoning: true }).level).toBe('none')
  })
})

// Checks on the game numbers in ruleset.ts. When one fails, the message says what to fix there.

import { describe, expect, it } from 'vitest'
import { FNFF as rs } from './ruleset'

const { character: c, damage: d, defense: df, attack: at } = rs
const levels = d.wounds.map((w) => w.level)
const skillKeys = c.skills.map((s) => s.key)
const bodyTypes = c.bodyTypes.length

// Fail with a sentence instead of "expected false to be true".
const check = (ok: boolean, fix: string) => expect(ok, `FIX in ruleset.ts: ${fix}`).toBe(true)
const isIn = (what: string, value: string, list: string[], name: string) =>
  check(list.includes(value), `${what} is "${value}", which is not in ${name} (${list.join(', ')})`)

describe('ruleset.ts', () => {
  it('names stats, skills and locations that exist', () => {
    const stats = {
      'turn.phaseStat': rs.turn.phaseStat,
      'turn.runStat': rs.turn.runStat,
      'attack.stat': at.stat,
      'attack.cemStat': at.cemStat,
      'defense.stat': df.stat,
      'character.bodyStat': c.bodyStat,
    }
    for (const [field, stat] of Object.entries(stats)) isIn(field, stat, c.stats, 'character.stats')
    isIn('defense.skill', df.skill, skillKeys, 'the skill keys')
    isIn('attack.newWeapon.skill', at.newWeapon.skill, skillKeys, 'the skill keys')
    isIn('damage.headLocation', d.headLocation, c.locations, 'character.locations')
    check(
      skillKeys.includes('Pistol') && skillKeys.includes('Rifle'),
      'skills must keep the keys Pistol and Rifle (older saved weapons use them)',
    )
  })

  it('has a wound table with one column per body type, ending with Infinity', () => {
    const t = d.woundTable
    t.forEach((row, i) => {
      check(
        row.levels.length === bodyTypes,
        `wound table row ${i + 1} (up to ${row.upTo}) has ${row.levels.length} wounds; it needs ${bodyTypes}, one per body type`,
      )
      row.levels.forEach((l) => isIn(`wound table row ${i + 1}`, l, levels, 'the wound codes'))
    })
    check(
      t.every((row, i) => i === 0 || row.upTo > t[i - 1].upTo),
      'wound table "upTo" numbers must go up from top to bottom',
    )
    check(t[t.length - 1].upTo === Infinity, 'the last wound table row must have upTo: Infinity')
  })

  it('has consciousness saves for every body type', () => {
    for (const [level, row] of Object.entries(d.consciousness)) {
      isIn('consciousness', level, levels, 'the wound codes')
      check(row.length === bodyTypes, `consciousness ${level} has ${row.length} numbers; it needs ${bodyTypes}, one per body type`)
    }
    isIn('damage.mortalWound', d.mortalWound, levels, 'the wound codes')
  })

  it('has lists that line up with the body types, skills and locations', () => {
    check(
      c.bodyTypeMaxBT.length === bodyTypes - 1,
      `character.bodyTypeMaxBT needs ${bodyTypes - 1} numbers (one per body type but the last); it has ${c.bodyTypeMaxBT.length}`,
    )
    check(
      d.strengthModifiers.length === bodyTypes,
      `damage.strengthModifiers needs ${bodyTypes} numbers, one per body type; it has ${d.strengthModifiers.length}`,
    )
    for (const s of [...d.bludgeonSkills, ...d.strengthSkills, ...d.skillLevelSkills])
      isIn('a damage skill list', s, skillKeys, 'the skill keys')
    check(
      d.randomHit.length === 10 && d.randomHit.every((l) => c.locations.includes(l)),
      'damage.randomHit needs 10 locations from character.locations, one per 1D10 roll',
    )
  })

  it('has a range modifier for every range and kind of fire', () => {
    check(
      df.rangeModifiers.length === df.ranges.length,
      `rangeModifiers has ${df.rangeModifiers.length} rows; it needs ${df.ranges.length}, one per range`,
    )
    df.rangeModifiers.forEach((row, i) =>
      check(
        row.length === df.fireKinds.length,
        `rangeModifiers row ${i + 1} (${df.ranges[i]}) has ${row.length} numbers; it needs ${df.fireKinds.length}, one per kind of fire`,
      ),
    )
  })
})

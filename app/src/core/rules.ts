// The game's arithmetic: derived stats, wounds, and the attack and defense totals. The tables come from the ruleset.

import type { Ruleset } from './ruleset'
import type { Location, WoundLevel } from './types'

// The phase numbers of a turn: 1, 2, 3...
export const phaseNumbers = (rs: Ruleset) => rs.turn.phases.map((_, i) => i + 1)

// Which phases a character acts in, by phase number.
export const availablePhases = (rs: Ruleset, stat: number): Record<number, boolean> =>
  Object.fromEntries(rs.turn.phases.map((min, i) => [i + 1, stat >= min]))

export const runDistance = (rs: Ruleset, stat: number) => stat * rs.turn.runMultiplier
export const phaseRun = (rs: Ruleset, stat: number) => Math.floor(runDistance(rs, stat) / rs.turn.phaseShare)

// Combat Experience Modifier: cemBase minus the cemStat, less one per firefightsPerStep firefights survived.
export const combatExperience = (rs: Ruleset, stat: number, firefights: number) =>
  Math.max(0, rs.attack.cemBase - stat - Math.floor(firefights / rs.attack.firefightsPerStep))

// The Body Type stat decides the body type, and with it the saves.
export const bodyIndex = (rs: Ruleset, bt: number) => {
  const i = rs.character.bodyTypeMaxBT.findIndex((max) => bt <= max)
  return i < 0 ? rs.character.bodyTypeMaxBT.length : i
}
export const bodyName = (rs: Ruleset, bt: number) => rs.character.bodyTypes[bodyIndex(rs, bt)]

export const worstWound = (rs: Ruleset, wounds: Record<Location, WoundLevel>) =>
  rs.damage.wounds.reduce((worst, w) => (Object.values(wounds).includes(w.level) ? w : worst), rs.damage.wounds[0])

export const consciousnessSave = (rs: Ruleset, level: WoundLevel, bt: number) => rs.damage.consciousness[level]?.[bodyIndex(rs, bt)]

// Roll this or less each turn to survive a mortal wound.
export const deathSave = (rs: Ruleset, bt: number) => bodyIndex(rs, bt) + rs.damage.deathSaveBase

export interface Calculation {
  total: number
  terms: string[]
}
export const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`)

export interface AttackInput {
  stat: number
  skill: string
  skillLevel: number
  accuracy: number
  aim: number // phases spent aiming: bonus each
  feint: boolean // bonus
  cem: number // subtracted when the character is rattled
  moving: boolean // total divided
  specific: boolean // aiming at a part of the body: total divided
}

// Attack stat + skill + weapon accuracy, adjusted. (The 1D10 is added when rolling.)
export function attack(rs: Ruleset, i: AttackInput): Calculation {
  const a = rs.attack
  const terms = [`${a.stat} ${i.stat}`, `${i.skill} ${i.skillLevel}`, `Accuracy ${signed(i.accuracy)}`]
  let total = i.stat + i.skillLevel + i.accuracy
  if (i.aim) {
    total += i.aim * a.aimBonus
    terms.push(`Aim ${signed(i.aim * a.aimBonus)}`)
  }
  if (i.feint) {
    total += a.feintBonus
    terms.push(`Feint ${signed(a.feintBonus)}`)
  }
  if (i.cem) {
    total -= i.cem
    terms.push(`CEM ${signed(-i.cem)}`)
  }
  if (i.moving) {
    total = Math.floor(total / a.movingDivisor)
    terms.push(`Moving ÷${a.movingDivisor}`)
  }
  if (i.specific) {
    total = Math.floor(total / a.specificDivisor)
    terms.push(`Specific place ÷${a.specificDivisor}`)
  }
  return { total, terms }
}

export interface DefenseInput {
  stat: number
  skill: string
  skillLevel: number
  range: number // index into rs.defense.ranges
  fire: number // index into rs.defense.fireKinds
  cover: number // index into rs.defense.covers
  dodge: boolean // bonus
  parry?: boolean // bonus
  turning: boolean
}

// Defense stat + defense skill + range + cover, adjusted. (The 1D10 is added when rolling.)
export function defense(rs: Ruleset, i: DefenseInput): Calculation {
  const d = rs.defense
  const range = d.rangeModifiers[i.range][i.fire],
    cover = d.covers[i.cover].bonus
  const terms = [`${d.stat} ${i.stat}`, `${i.skill} ${i.skillLevel}`, `Range ${signed(range)}`, `Cover ${signed(cover)}`]
  let total = i.stat + i.skillLevel + range + cover
  if (i.dodge) {
    total += d.dodgeBonus
    terms.push(`Dodge ${signed(d.dodgeBonus)}`)
  }
  if (i.parry) {
    total += d.parryBonus
    terms.push(`Parry ${signed(d.parryBonus)}`)
  }
  if (i.turning) {
    total -= d.turningPenalty
    terms.push(`Turning ${signed(-d.turningPenalty)}`)
  }
  return { total, terms }
}

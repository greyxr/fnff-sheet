// A hit that lands: armor takes its share, the rest becomes a wound. Nothing here changes the character.

import type { Ruleset } from './ruleset'
import type { Character, Location, WoundLevel } from './types'
import { d10, defaultRoller, type Roller } from './dice'
import { bodyIndex, bodyName, signed, type Calculation } from './rules'

export interface Hit {
  location: Location
  damage: number // everything already added: dice, advantage, strength
  bludgeoning?: boolean // fists and feet: damage divided, as the ruleset says
  armorPiercing?: boolean // armor and wound divided, as the ruleset says
}

export interface Resolution extends Calculation {
  level: WoundLevel
  armorSP: number // the armor on that location afterwards
}

// Where an attack that was not aimed lands: the die and the Random Hit Table's location for it.
export function randomHit(rs: Ruleset, roll: Roller = defaultRoller): { die: number; location: Location } {
  const die = d10(roll)
  return { die, location: rs.damage.randomHit[die - 1] }
}

const woundIndex = (rs: Ruleset, level: WoundLevel) => rs.damage.wounds.findIndex((w) => w.level === level)

// The worse of two wounds, for a location already hurt.
export const worseWound = (rs: Ruleset, a: WoundLevel, b: WoundLevel) => (woundIndex(rs, a) >= woundIndex(rs, b) ? a : b)

// What is added to a weapon's dice: the attacker's advantage over the defender, the strength modifier for melee and
// hand to hand, and the skill level for martial arts. Zero terms are left out.
export function damageBonus(rs: Ruleset, c: Character, skill: string, advantage: number): Calculation {
  const d = rs.damage,
    bt = c.stats[rs.character.bodyStat]
  const parts: [string, number][] = [['Advantage', advantage]]
  if (d.strengthSkills.includes(skill)) parts.push([`${bodyName(rs, bt)} body`, d.strengthModifiers[bodyIndex(rs, bt)]])
  if (d.skillLevelSkills.includes(skill)) parts.push([rs.character.skills.find((s) => s.key === skill)!.name, c.skills[skill]])
  const used = parts.filter(([, n]) => n)
  return { total: used.reduce((sum, [, n]) => sum + n, 0), terms: used.map(([label, n]) => `${label} ${signed(n)}`) }
}

export function resolveHit(rs: Ruleset, c: Character, hit: Hit): Resolution {
  const d = rs.damage,
    terms = [`Damage ${hit.damage}`]
  let damage = hit.damage
  if (hit.location === d.headLocation) {
    damage *= d.headMultiplier
    terms.push(`Head ×${d.headMultiplier}`)
  }
  if (hit.bludgeoning) {
    damage = Math.floor(damage / d.bludgeonDivisor)
    terms.push(`Bludgeoning ÷${d.bludgeonDivisor} = ${damage}`)
  }

  const printed = c.armorSP[hit.location] ?? 0
  const sp = hit.armorPiercing ? Math.floor(printed / d.armorPiercingDivisor) : printed
  if (printed) terms.push(`Armor ${signed(-sp)}${hit.armorPiercing ? ' (halved)' : ''}`)
  damage = Math.max(0, damage - sp)
  if (damage && hit.armorPiercing) {
    damage = Math.floor(damage / d.armorPiercingDivisor)
    terms.push(`Armor piercing ÷${d.armorPiercingDivisor}`)
  }

  // Staged penetration: armor that was pierced wears down.
  const armorSP = damage && printed ? printed - rs.armor.stagedPenetrationWear : printed
  const level = damage
    ? d.woundTable.find((r) => damage <= r.upTo)!.levels[bodyIndex(rs, c.stats[rs.character.bodyStat])]
    : d.wounds[0].level
  return { total: damage, terms, level, armorSP }
}

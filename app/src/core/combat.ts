// A character in a fight: the attack and defense they would make, and the weapons they carry. No screen needed.

import type { Ruleset } from './ruleset'
import type { ArmorEntry, CatalogEntry, Character, SkillName, Weapon } from './types'
import { attack, combatExperience, defense, type Calculation } from './rules'

const skillName = (rs: Ruleset, key: SkillName) => rs.character.skills.find((s) => s.key === key)!.name

export interface AttackOptions {
  skill: SkillName
  accuracy: number
  aim: number
  feint: boolean
  cem: boolean
  moving: boolean
  specific: boolean
}

export function attackFor(rs: Ruleset, c: Character, o: AttackOptions): Calculation {
  return attack(rs, {
    stat: c.stats[rs.attack.stat],
    skill: skillName(rs, o.skill),
    skillLevel: c.skills[o.skill],
    accuracy: o.accuracy,
    aim: o.aim,
    feint: o.feint,
    cem: o.cem ? combatExperience(rs, c.stats[rs.attack.cemStat], c.firefights) : 0,
    moving: o.moving,
    specific: o.specific,
  })
}

export interface DefenseOptions {
  range: number
  fire: number
  cover: number
  dodge: boolean
  parry?: boolean
  turning: boolean
}

export const defenseFor = (rs: Ruleset, c: Character, o: DefenseOptions): Calculation =>
  defense(rs, { stat: c.stats[rs.defense.stat], skill: skillName(rs, rs.defense.skill), skillLevel: c.skills[rs.defense.skill], ...o })

// Weapon functions change the weapon they are given.
export const newWeapon = (rs: Ruleset, id: number): Weapon => ({ id, ...rs.attack.newWeapon, ammo: 0, capacity: 0 })

export const setCapacity = (w: Weapon, capacity: number) => {
  w.capacity = capacity
  w.ammo = Math.min(w.ammo, capacity)
}
export const fire = (w: Weapon) => {
  w.ammo = Math.max(0, w.ammo - 1)
}
export const reload = (w: Weapon) => {
  w.ammo = w.capacity
}

const CUSTOM = ' (custom)'

export const weaponFromCatalog = (id: number, e: CatalogEntry): Weapon => {
  const basis = { skill: e.skill, accuracy: e.accuracy, damage: e.damage, capacity: e.capacity }
  return { id, name: e.name, ...basis, ammo: e.capacity, basis, note: e.note }
}

// A weapon whose stats differ from the catalogue entry it came from is marked; set back, the mark goes.
export function syncCustom(w: Weapon) {
  const b = w.basis
  if (!b) return
  const custom = w.skill !== b.skill || w.accuracy !== b.accuracy || w.damage !== b.damage || w.capacity !== b.capacity
  const has = w.name.endsWith(CUSTOM)
  if (custom && !has) w.name += CUSTOM
  else if (!custom && has) w.name = w.name.slice(0, -CUSTOM.length)
}

// Layered armor adds up on each place it covers. The book allows no more than the limit, so a layer that would
// go over it is not worn (false).
export function wearArmor(rs: Ruleset, c: Character, e: ArmorEntry) {
  if (e.locations.some((l) => (c.armorSP[l] ?? 0) + e.sp > rs.armor.spMax)) return false
  for (const l of e.locations) c.armorSP[l] = (c.armorSP[l] ?? 0) + e.sp
  return true
}

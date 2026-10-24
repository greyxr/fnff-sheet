import type { Ruleset } from './ruleset'
import type { Character, Weapon, WeaponBasis } from './types'
import { phaseNumbers } from './rules'

const filled = <T>(keys: readonly string[], value: T): Record<string, T> => Object.fromEntries(keys.map((k) => [k, value]))

// A new character: every stat at its starting value, no skills, nothing carried, unwounded.
export const blankCharacter = (rs: Ruleset): Character => ({
  charName: '',
  charFaction: '',
  charCampaign: '',
  stats: filled(rs.character.stats, rs.character.startStat),
  skills: filled(
    rs.character.skills.map((s) => s.key),
    0,
  ),
  phaseUsed: filled(phaseNumbers(rs).map(String), false),
  firefights: 0,
  weapons: [],
  armorSP: filled(rs.character.locations, 0),
  wounds: filled(rs.character.locations, rs.damage.wounds[0].level),
  invItems: [],
  cmbNotes: '',
  genNotes: '',
})

// ---- reading saved characters ----
// Saves come from the cloud and from files people pass around, so every field is checked: missing or
// wrong-kind fields get the default, and numbers saved as text are fixed.

type Raw = Record<string, unknown>
const record = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {})
const text = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const whole = (v: unknown, fallback = 0) => {
  const n = parseInt(String(v))
  return Number.isNaN(n) ? fallback : n
}
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(record) : [])

const basisOf = (b: Raw): { basis?: WeaponBasis } =>
  typeof b.skill === 'string' &&
  typeof b.damage === 'string' &&
  typeof b.accuracy === 'number' &&
  Number.isFinite(b.accuracy) &&
  typeof b.capacity === 'number' &&
  Number.isFinite(b.capacity)
    ? { basis: { skill: b.skill, accuracy: b.accuracy, damage: b.damage, capacity: b.capacity } }
    : {}

export const nextId = (items: { id: number }[]) => Math.max(0, ...items.map((i) => i.id)) + 1

// Items need ids that are unique within their list.
const withIds = <T extends { id: number }>(items: T[]): T[] => {
  const used = new Set<number>()
  return items.map((item) => {
    const id = item.id > 0 && !used.has(item.id) ? item.id : Math.max(0, ...items.map((i) => i.id), ...used) + 1
    used.add(id)
    return { ...item, id }
  })
}

export function normalizeCharacter(rs: Ruleset, input: unknown): Character {
  const raw = record(input),
    blank = blankCharacter(rs)
  const numbers = (value: unknown, defaults: Record<string, number>) =>
    Object.fromEntries(Object.entries(defaults).map(([k, fallback]) => [k, whole(record(value)[k], fallback)]))
  const wounds = record(raw.wounds)

  const character: Character = {
    charName: text(raw.charName),
    charFaction: text(raw.charFaction),
    charCampaign: text(raw.charCampaign),
    stats: numbers(raw.stats, blank.stats),
    skills: numbers(raw.skills, blank.skills),
    phaseUsed: Object.fromEntries(Object.keys(blank.phaseUsed).map((p) => [p, record(raw.phaseUsed)[p] === true])),
    firefights: Math.max(0, whole(raw.firefights)),
    weapons: withIds(
      list(raw.weapons).map((w): Weapon => ({
        id: whole(w.id),
        name: text(w.name),
        skill: rs.character.skills.some((s) => s.key === w.skill) ? text(w.skill) : rs.attack.newWeapon.skill,
        accuracy: whole(w.accuracy),
        damage: text(w.damage, rs.attack.newWeapon.damage),
        capacity: whole(w.capacity),
        ammo: Math.min(whole(w.ammo), whole(w.capacity)),
        ...basisOf(record(w.basis)),
        ...(typeof w.note === 'string' ? { note: w.note } : {}),
      })),
    ),
    armorSP: numbers(raw.armorSP, blank.armorSP),
    wounds: Object.fromEntries(
      Object.entries(blank.wounds).map(([l, none]) => [
        l,
        rs.damage.wounds.some((w) => w.level === wounds[l]) ? text(wounds[l], none) : none,
      ]),
    ),
    invItems: withIds(list(raw.invItems).map((i) => ({ id: whole(i.id), name: text(i.name), notes: text(i.notes) }))),
    cmbNotes: text(raw.cmbNotes),
    genNotes: text(raw.genNotes),
  }
  return character
}

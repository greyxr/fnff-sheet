// Shapes shared across the app. `Character` is the JSON a character is saved as.

export type Location = string
export type WoundLevel = string
export type SkillName = string

// The four stats a catalogue weapon is compared on.
export interface WeaponBasis {
  skill: SkillName
  accuracy: number
  damage: string
  capacity: number
}

// Rows of the ruleset's weapon and armor lists (the server's ruleset.json `arsenal` and `armor`).
export interface CatalogEntry extends WeaponBasis {
  group: string
  name: string
  note: string
}
export interface ArmorEntry {
  name: string
  sp: number
  locations: Location[]
  note: string
}

export interface Weapon {
  id: number
  name: string
  skill: SkillName
  accuracy: number
  damage: string // as the book writes it, e.g. "2D6+1"
  ammo: number // rounds in the weapon
  capacity: number // 0 for a weapon that does not shoot
  basis?: WeaponBasis // the catalogue stats it was added with; a difference makes it "(custom)"
  note?: string // the catalogue's stat line
}

export interface Character {
  charName: string
  charFaction: string
  charCampaign: string
  stats: Record<string, number>
  skills: Record<SkillName, number>
  firefights: number // survived; lowers the Combat Experience Modifier
  phaseUsed: Record<number, boolean>
  weapons: Weapon[]
  armorSP: Record<Location, number>
  wounds: Record<Location, WoundLevel>
  invItems: { id: number; name: string; notes: string }[]
  cmbNotes: string
  genNotes: string
}

// What the roster holds: one character; its name and campaign are in data.
export interface RosterRecord {
  id: string
  data: Character
}

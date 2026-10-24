// Dice, with the random source injectable so tests can fix the rolls.

export type Roller = (sides: number) => number

export const defaultRoller: Roller = (sides) => 1 + Math.floor(Math.random() * sides)

export const d10 = (roll: Roller = defaultRoller) => roll(10)

// "2D6+1", "3D6-2", "1D6/2": the forms weapons use. A divisor rounds the dice down; the modifier is added after.
export function rollDice(expr: string, roll: Roller = defaultRoller): { total: number; rolls: number[] } {
  const m = /^\s*(\d+)D(\d+)\s*([+-]\s*\d+)?\s*(?:\/\s*(\d+))?\s*$/i.exec(expr)
  if (!m) throw new Error(`Not a dice expression: ${expr}`)
  const rolls = Array.from({ length: Number(m[1]) }, () => roll(Number(m[2])))
  const sum = rolls.reduce((a, b) => a + b, 0)
  return { total: Math.floor(sum / Number(m[4] ?? 1)) + Number((m[3] ?? '0').replace(/\s/g, '')), rolls }
}

// A total plus 1D10: the sum, and the breakdown the log shows under it.
export function rollTotal(total: number, terms: string[], roll: Roller = defaultRoller) {
  const die = d10(roll)
  return { result: total + die, detail: `${terms.join(' · ')} + 1D10 [${die}]` }
}

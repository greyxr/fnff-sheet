// THE GAME NUMBERS. Every rule number the site uses lives in this one file.
//
// To fix a number: change it here (GitHub's pencil icon works), then commit.
// The build checks this file before the site updates; if you made a typo, the build
// fails and the live site stays as it was. Lines starting with // are comments.
//
// Sections follow the book. "p. N" is the book page. Keep the commas and brackets as they are.
// Tables have one row per line; the comment above each table names its columns.

export const FNFF = {

  // ===== Characters & stats (p. 1-2) =====
  character: {
    stats: ['INT', 'REF', 'CL', 'MA', 'BT'],            // the five stats, in sheet order
    startStat: 5,                                       // every stat of a new character
    statMin: 2,                                         // lowest a stat can be set
    statMax: 10,                                        // highest a stat can be set
    skills: [                                           // key (do not change) and the name shown
      { key: 'Pistol',       name: 'Pistol' },
      { key: 'Rifle',        name: 'Rifle' },
      { key: 'MeleeWeapons', name: 'Melee weapons' },
      { key: 'MartialArts',  name: 'Martial arts' },
      { key: 'Brawling',     name: 'Brawling' },
      { key: 'Athletics',    name: 'Athletics' },
      { key: 'Stealth',      name: 'Stealth' },
      { key: 'Awareness',    name: 'Awareness' },
    ],
    skillMax: 10,                                       // highest a skill can be set
    locations: ['Head', 'Torso', 'R.Arm', 'L.Arm', 'R.Leg', 'L.Leg'],   // where a hit can land
    bodyStat: 'BT',                                     // the stat that decides body type
    bodyTypes: ['Very weak', 'Weak', 'Average', 'Strong', 'Very strong'],
    bodyTypeMaxBT: [2, 4, 7, 9],                        // highest BT of each body type but the last: 2 Very weak, 3-4 Weak, 5-7 Average, 8-9 Strong, 10+ Very strong
  },

  // ===== Turn & movement (p. 2-3) =====
  turn: {
    phases: [8, 5, 0],                                  // lowest REF that acts in phase 1, 2, 3 (so: phase 1 from REF 8, phase 2 from REF 5, phase 3 always)
    phaseStat: 'REF',                                   // the stat that decides which phases you act in
    runStat: 'MA',                                      // the stat that decides how far you run
    runMultiplier: 4,                                   // metres run in a turn = MA x this
    phaseShare: 3,                                      // up to one over this of the run can be used in each phase
  },

  // ===== Attack (p. 5-9, weapons p. 13) =====
  attack: {
    stat: 'REF',                                        // attack = this stat + skill + accuracy (p. 5)
    aimBonus: 2,                                        // per phase spent aiming (p. 6)
    aimMaxPhases: 3,                                    // most phases that can be spent aiming
    feintBonus: 2,                                      // feint (p. 9)
    movingDivisor: 2,                                   // attacker moving: total divided by this, rounded down
    specificDivisor: 2,                                 // aiming at a specific place: total divided by this, rounded down
    cemBase: 12,                                        // Combat Experience Modifier starts at this minus the stat below (p. 6)
    cemStat: 'CL',
    firefightsPerStep: 2,                               // the modifier drops by one for every this many firefights survived (p. 6)
    weaponAccuracyMin: -2,                              // weapon accuracy range (p. 13)
    weaponAccuracyMax: 2,
    newWeapon: { name: 'New weapon', skill: 'Pistol', accuracy: 0, damage: '1D6' },   // what "+ Add weapon" starts with
  },

  // ===== Defense (p. 5-6) =====
  defense: {
    stat: 'REF',                                        // defense = this stat + skill + range + cover
    skill: 'Athletics',
    dodgeBonus: 2,                                      // active dodge (p. 9)
    parryBonus: 3,                                      // parrying (p. 9)
    turningPenalty: 2,                                  // taken for turning
    ranges: ['Pointblank', 'Close', 'Medium', 'Long', 'Extreme'],
    fireKinds: ['Single shot', 'Three-round burst', 'Full auto', 'Shotgun, closed choke', 'Shotgun, open choke', 'Automatic shotgun'],
    // Range modifier. Columns follow fireKinds, left to right:
    //  Single  3-burst  Full auto  Shotgun closed  Shotgun open  Auto shotgun
    rangeModifiers: [
      [0,  -2,  -5,  -3,  -3,  -5],                     // Pointblank
      [1,  -1,  -4,  -3,  -5,  -7],                     // Close
      [2,   0,   0,   0,  -1,  -1],                     // Medium
      [3,   2,   4,   2,   0,   1],                     // Long
      [4,   3,   5,   5,   5,   5],                     // Extreme
    ],
    covers: [                                           // bonus to defense (p. 6)
      { name: 'No cover',         bonus: 0 },
      { name: 'Prone',            bonus: 1 },
      { name: 'Over cover',       bonus: 2 },
      { name: 'Behind a corner',  bonus: 2 },
      { name: 'Running',          bonus: 2 },
      { name: 'Behind a hostage', bonus: 3 },
    ],
  },

  // ===== Damage & wounds (p. 9-12) =====
  damage: {
    wounds: [                                           // mildest first; code (do not change) and name shown
      { level: 'none', name: 'Unwounded' },
      { level: 'FW',   name: 'Flesh wound' },
      { level: 'SW',   name: 'Serious wound' },
      { level: 'CW',   name: 'Critical wound' },
      { level: 'MW',   name: 'Mortal wound' },
      { level: 'D',    name: 'Dead' },
    ],
    mortalWound: 'MW',                                  // the wound that needs a death save each turn
    // Random Hit Table (p. 10): roll 1D10, the location on that line. Lines 1 to 10, top to bottom.
    randomHit: ['Head', 'Torso', 'Torso', 'Torso', 'R.Arm', 'L.Arm', 'R.Leg', 'R.Leg', 'L.Leg', 'L.Leg'],
    headLocation: 'Head',
    headMultiplier: 2,                                  // damage to the head is multiplied (p. 10)
    bludgeonDivisor: 5,                                 // bludgeoning damage is divided by this, rounded down (p. 9-10)
    bludgeonSkills: ['Brawling', 'MartialArts'],        // attacks made with these skills (fists and feet) are bludgeoning
    armorPiercingDivisor: 2,                            // armor piercing: armor SP and then the remaining damage are divided by this
    strengthSkills: ['MeleeWeapons', 'Brawling', 'MartialArts'],   // attacks with these skills add the strength modifier below (p. 8-10)
    strengthModifiers: [-2, -1, 0, 1, 2],               // added to damage, by body type: Very weak ... Very strong
    skillLevelSkills: ['MartialArts'],                  // attacks with these skills also add the skill level to damage (p. 10)
    bonusMin: -20,                                      // range of the advantage box on the Combat tab (attack total minus defense total)
    bonusMax: 40,
    // Wound table (p. 11-12). Killing damage up to the number in the first column; columns are body types:
    //    up to    Very weak  Weak  Average  Strong  Very strong
    woundTable: [
      { upTo: 2,        levels: ['SW', 'FW', 'FW', 'FW', 'FW'] },
      { upTo: 4,        levels: ['SW', 'SW', 'FW', 'FW', 'FW'] },
      { upTo: 6,        levels: ['CW', 'SW', 'SW', 'FW', 'FW'] },
      { upTo: 8,        levels: ['CW', 'CW', 'SW', 'SW', 'FW'] },
      { upTo: 10,       levels: ['MW', 'CW', 'CW', 'SW', 'SW'] },
      { upTo: 12,       levels: ['MW', 'MW', 'CW', 'CW', 'SW'] },
      { upTo: 14,       levels: ['D',  'MW', 'MW', 'CW', 'CW'] },
      { upTo: 16,       levels: ['D',  'D',  'MW', 'MW', 'CW'] },
      { upTo: 18,       levels: ['D',  'D',  'D',  'MW', 'MW'] },
      { upTo: 20,       levels: ['D',  'D',  'D',  'D',  'MW'] },
      { upTo: Infinity, levels: ['D',  'D',  'D',  'D',  'D']  },   // anything higher; keep this last row
    ],
    // Consciousness saves (p. 12): roll this or less to stay up. Columns are body types:
    //        Very weak  Weak  Average  Strong  Very strong
    consciousness: {
      FW: [5, 6, 7, 8, 9],
      SW: [3, 4, 5, 6, 7],
      CW: [1, 2, 3, 4, 5],
      MW: [0, 0, 1, 2, 3],
      D:  [0, 0, 0, 0, 0],
    } as Record<string, number[]>,
    deathSaveBase: 2,                                   // death save = this + body type number (Very weak 0 ... Very strong 4)
  },

  // ===== Armor (p. 11, 16-17) =====
  armor: {
    spMax: 30,                                          // layered armor on one place adds up to at most this (p. 16)
    stagedPenetrationWear: 1,                           // armor that is pierced loses this much SP
  },
}

export type Ruleset = typeof FNFF

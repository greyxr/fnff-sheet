<script module lang="ts">
  import type { SkillName } from '../core'
  import { rs } from '../lib/ruleset'

  // What is picked here is not part of the character, but it stays while you look at another tab (so it lives
  // outside the component, which is created anew each time the tab opens).
  const c = $state({
    weaponId: 0,
    skill: rs.attack.newWeapon.skill as SkillName,
    accuracy: 0,
    aim: 0,
    range: 2,
    fire: 0,
    cover: 0,
    on: { feint: false, cem: false, moving: false, specific: false, dodge: false, parry: false, turning: false },
  })
</script>

<script lang="ts">
  import {
    attackFor,
    combatExperience,
    consciousnessSave,
    damageBonus,
    deathSave,
    defenseFor,
    fire,
    phaseRun,
    randomHit,
    reload,
    resolveHit,
    rollDice,
    runDistance,
    signed,
    worseWound,
    worstWound,
  } from '../core'
  import { logRoll, rollCheck, rollSave } from '../lib/rolls.svelte'
  import { sheet } from '../lib/sheet.svelte'
  import Panel from '../lib/ui/Panel.svelte'
  import Stepper from '../lib/ui/Stepper.svelte'

  // A weapon deleted in the Arsenal is no longer picked.
  const weapon = $derived(sheet.weapons.find((w) => w.id === c.weaponId))

  function pick(id: number) {
    c.weaponId = id
    const chosen = sheet.weapons.find((w) => w.id === id)
    if (chosen) [c.skill, c.accuracy] = [chosen.skill, chosen.accuracy]
  }
  const mine = $derived(attackFor(rs, sheet, { skill: c.skill, accuracy: c.accuracy, aim: c.aim, ...c.on }))
  const theirs = $derived(defenseFor(rs, sheet, { range: c.range, fire: c.fire, cover: c.cover, ...c.on }))

  // Damage is rolled from the picked weapon, then resolved against the chosen location (empty: a random one, rolled with the damage).
  const dmg = $state({
    location: '',
    advantage: 0,
    armorPiercing: false,
    rolled: null as { expr: string; total: number; rolls: number[]; spot?: { die: number; location: string } } | null,
  })
  const location = $derived(dmg.location || dmg.rolled?.spot?.location || '')
  const bludgeoning = $derived(!!weapon && rs.damage.bludgeonSkills.includes(weapon.skill)) // fists and feet
  const bonus = $derived(damageBonus(rs, sheet, weapon?.skill ?? '', dmg.advantage))
  const hit = $derived(
    dmg.rolled &&
      (location
        ? resolveHit(rs, sheet, { location, damage: dmg.rolled.total + bonus.total, bludgeoning, armorPiercing: dmg.armorPiercing })
        : null),
  )
  const calc = () =>
    `${!dmg.location && dmg.rolled!.spot ? `Hit ${location} [${dmg.rolled!.spot.die}] · ` : ''}${dmg.rolled!.expr} [${dmg.rolled!.rolls.join(', ')}] = ${dmg.rolled!.total} · ${[...bonus.terms, ...hit!.terms].join(' · ')}`
  function rollDamage() {
    if (!weapon) return
    dmg.rolled = { expr: weapon.damage, ...rollDice(weapon.damage), spot: dmg.location ? undefined : randomHit(rs) }
    logRoll({ label: `${weapon.name} damage`, detail: calc(), result: hit!.total, again: rollDamage })
  }
  function apply() {
    if (!hit) return
    sheet.wounds[location] = worseWound(rs, sheet.wounds[location], hit.level)
    sheet.armorSP[location] = hit.armorSP
  }

  const worst = $derived(worstWound(rs, sheet.wounds))
  const bt = $derived(sheet.stats[rs.character.bodyStat])
  const run = $derived(sheet.stats[rs.turn.runStat])
</script>

<div class="grid">
  <Panel title="Attack">
    <div class="stack">
      <label>
        <span class="label">Weapon</span>
        <select value={weapon?.id ?? 0} onchange={(e) => pick(Number(e.currentTarget.value))}>
          <option value={0}>— none: set the skill and accuracy yourself —</option>
          {#each sheet.weapons as w (w.id)}<option value={w.id}>{w.name} ({w.damage})</option>{/each}
        </select>
      </label>
      {#if weapon?.capacity}
        <div class="row">
          <span>Rounds {weapon.ammo}/{weapon.capacity}</span>
          <button type="button" class="btn" disabled={!weapon.ammo} onclick={() => fire(weapon)}>Fire</button>
          <button type="button" class="btn" disabled={weapon.ammo === weapon.capacity} onclick={() => reload(weapon)}>Reload</button>
        </div>
      {/if}
      <div class="grid">
        <label
          ><span class="label">Skill</span><select bind:value={c.skill}
            >{#each rs.character.skills as s (s.key)}<option value={s.key}>{s.name}</option>{/each}</select
          ></label
        >
        <div>
          <span class="label">Accuracy</span><Stepper
            label="Accuracy"
            min={rs.attack.weaponAccuracyMin}
            max={rs.attack.weaponAccuracyMax}
            bind:value={c.accuracy}
          />
        </div>
        <label
          ><span class="label">Aiming ({signed(rs.attack.aimBonus)} a phase)</span><select bind:value={c.aim}
            >{#each Array.from({ length: rs.attack.aimMaxPhases + 1 }, (_, n) => n) as n (n)}<option value={n}>{n} phases</option
              >{/each}</select
          ></label
        >
      </div>
      <div class="row">
        <label><input type="checkbox" bind:checked={c.on.feint} /> Feint {signed(rs.attack.feintBonus)}</label>
        <label
          ><input type="checkbox" bind:checked={c.on.cem} /> Combat experience −{combatExperience(
            rs,
            sheet.stats[rs.attack.cemStat],
            sheet.firefights,
          )}</label
        >
        <label><input type="checkbox" bind:checked={c.on.moving} /> Moving ÷{rs.attack.movingDivisor}</label>
        <label><input type="checkbox" bind:checked={c.on.specific} /> Specific place ÷{rs.attack.specificDivisor}</label>
      </div>
      <div class="total">
        <strong>{mine.total}</strong>
        <div class="grow muted">{mine.terms.join(' · ')}</div>
        <button type="button" class="btn primary" onclick={() => rollCheck('Attack', mine.total, mine.terms)}>Roll 1D10</button>
      </div>
    </div>
  </Panel>

  <Panel title="Defense">
    <div class="stack">
      <div class="grid">
        <label
          ><span class="label">Range of the attack</span><select bind:value={c.range}
            >{#each rs.defense.ranges as name, i (name)}<option value={i}>{name}</option>{/each}</select
          ></label
        >
        <label
          ><span class="label">Cover</span><select bind:value={c.cover}
            >{#each rs.defense.covers as cover, i (cover.name)}<option value={i}
                >{cover.name}{cover.bonus ? ` ${signed(cover.bonus)}` : ''}</option
              >{/each}</select
          ></label
        >
        <label
          ><span class="label">Fire coming at you</span><select bind:value={c.fire}
            >{#each rs.defense.fireKinds as name, i (name)}<option value={i}>{name}</option>{/each}</select
          ></label
        >
      </div>
      <div class="row">
        <label><input type="checkbox" bind:checked={c.on.dodge} /> Active dodge {signed(rs.defense.dodgeBonus)}</label>
        <label><input type="checkbox" bind:checked={c.on.parry} /> Parry {signed(rs.defense.parryBonus)}</label>
        <label><input type="checkbox" bind:checked={c.on.turning} /> Turning {signed(-rs.defense.turningPenalty)}</label>
      </div>
      <div class="total">
        <strong>{theirs.total}</strong>
        <div class="grow muted">{theirs.terms.join(' · ')}</div>
        <button type="button" class="btn primary" onclick={() => rollCheck('Defense', theirs.total, theirs.terms)}>Roll 1D10</button>
      </div>
    </div>
  </Panel>
</div>

<Panel title="Damage">
  <div class="stack">
    <div class="grid">
      <label
        ><span class="label">Location</span><select bind:value={dmg.location}
          ><option value="">Random</option>{#each rs.character.locations as l (l)}<option value={l}>{l}</option>{/each}</select
        ></label
      >
      <div>
        <span class="label">Advantage (attack − defense)</span><Stepper
          label="Advantage"
          min={rs.damage.bonusMin}
          max={rs.damage.bonusMax}
          bind:value={dmg.advantage}
        />
      </div>
    </div>
    <label><input type="checkbox" bind:checked={dmg.armorPiercing} /> Armor piercing ÷{rs.damage.armorPiercingDivisor}</label>
    <div class="total">
      <strong>{hit ? hit.total : '—'}</strong>
      <div class="grow muted">
        {hit
          ? `${calc()} → ${rs.damage.wounds.find((w) => w.level === hit.level)?.name}`
          : weapon
            ? "Roll the weapon's damage"
            : 'Pick a weapon above'}
      </div>
      <button type="button" class="btn primary" disabled={!weapon} onclick={rollDamage}>Roll damage</button>
      <button type="button" class="btn" disabled={!hit} onclick={apply}>Apply to {sheet.charName || 'character'}</button>
    </div>
  </div>
</Panel>

<Panel title="Condition">
  <div class="stack">
    <div class="row">
      <span class="wound w-{worst.level}">{worst.name}</span>
      <span class="muted">runs {runDistance(rs, run)} m a turn, {phaseRun(rs, run)} m a phase</span>
    </div>
    <div class="muted">Armor SP: {rs.character.locations.map((l) => `${l} ${sheet.armorSP[l] ?? 0}`).join(' · ')}</div>
    {#if worst !== rs.damage.wounds[0]}
      <div class="row">
        <button type="button" class="btn" onclick={() => rollSave('Consciousness', consciousnessSave(rs, worst.level, bt))}
          >Consciousness save ({consciousnessSave(rs, worst.level, bt)} or less)</button
        >
        {#if worst.level === rs.damage.mortalWound}
          <button type="button" class="btn" onclick={() => rollSave('Death', deathSave(rs, bt))}
            >Death save ({deathSave(rs, bt)} or less)</button
          >
        {/if}
      </div>
    {/if}
  </div>
</Panel>

<Panel title="Combat notes">
  <textarea rows="4" aria-label="Combat notes" bind:value={sheet.cmbNotes}></textarea>
</Panel>

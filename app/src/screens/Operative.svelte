<script lang="ts">
  import { roster } from '../lib/roster.svelte'
  import { availablePhases, bodyName, combatExperience, phaseNumbers, runDistance } from '../core'
  import { rs } from '../lib/ruleset'
  import { rollCheck, sel } from '../lib/rolls.svelte'
  import { sheet } from '../lib/sheet.svelte'
  import Panel from '../lib/ui/Panel.svelte'
  import Stepper from '../lib/ui/Stepper.svelte'

  const campaigns = $derived([...new Set([...roster.campaigns, sheet.charCampaign].filter(Boolean))])
  const phases = $derived(
    phaseNumbers(rs)
      .filter((p) => availablePhases(rs, sheet.stats[rs.turn.phaseStat])[p])
      .join(', '),
  )

  // A click selects; a click on the selected one rolls 1D10 plus whichever stat and skill are selected.
  function pick(kind: 'stat' | 'skill', key: string) {
    if (sel[kind] !== key) return void (sel[kind] = key)
    const skill = rs.character.skills.find((s) => s.key === sel.skill)
    const parts = [sel.stat && [sel.stat, sheet.stats[sel.stat]], skill && [skill.name, sheet.skills[skill.key]]].filter(Boolean) as [
      string,
      number,
    ][]
    rollCheck(
      parts.map((p) => p[0]).join(' + '),
      parts.reduce((n, p) => n + p[1], 0),
      parts.map((p) => p.join(' ')),
    )
  }
</script>

<div class="grid">
  <div class="stack">
    <Panel title="Identity">
      <div class="stack">
        <label><span class="label">Name / callsign</span><input bind:value={sheet.charName} /></label>
        <label><span class="label">Faction</span><input bind:value={sheet.charFaction} /></label>
        <label>
          <span class="label">Campaign</span>
          <select bind:value={sheet.charCampaign}>
            <option value="">— no campaign —</option>
            {#each campaigns as campaign (campaign)}<option>{campaign}</option>{/each}
          </select>
        </label>
      </div>
    </Panel>

    <Panel title="Statistics">
      <div class="stack">
        <div class="stats">
          {#each rs.character.stats as stat (stat)}
            <div>
              <span class="label">{stat}</span><Stepper
                label={stat}
                min={rs.character.statMin}
                max={rs.character.statMax}
                bind:value={sheet.stats[stat]}
                pick={{ on: sel.stat === stat, click: () => pick('stat', stat) }}
              />
            </div>
          {/each}
        </div>
        <p class="muted">
          {bodyName(rs, sheet.stats[rs.character.bodyStat])} body · runs {runDistance(rs, sheet.stats[rs.turn.runStat])} m a turn · acts in phase
          {phases}
        </p>
        <div class="row">
          <div><span class="label">Firefights survived</span><Stepper label="Firefights survived" bind:value={sheet.firefights} /></div>
          <p class="muted">Combat experience modifier −{combatExperience(rs, sheet.stats[rs.attack.cemStat], sheet.firefights)}</p>
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="Skills">
    <div class="grid">
      {#each rs.character.skills as skill (skill.key)}
        <div>
          <span class="label">{skill.name}</span><Stepper
            label={skill.name}
            max={rs.character.skillMax}
            bind:value={sheet.skills[skill.key]}
            pick={{ on: sel.skill === skill.key, click: () => pick('skill', skill.key) }}
          />
        </div>
      {/each}
    </div>
  </Panel>
</div>

<Panel title="Notes">
  <textarea rows="4" aria-label="Notes" bind:value={sheet.genNotes}></textarea>
</Panel>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
  }
</style>

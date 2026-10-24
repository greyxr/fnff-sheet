<script lang="ts">
  import { availablePhases, phaseNumbers, worstWound } from '../core'
  import { rs } from '../lib/ruleset'
  import { sheet } from '../lib/sheet.svelte'

  const worst = $derived(worstWound(rs, sheet.wounds))
  const phases = $derived(availablePhases(rs, sheet.stats[rs.turn.phaseStat]))

  function newTurn() {
    sheet.phaseUsed = Object.fromEntries(phaseNumbers(rs).map((p) => [p, false]))
  }
</script>

<div class="strip">
  <div class="who">
    <strong>{sheet.charName || 'Unnamed operative'}</strong>
    <span class="muted">{[sheet.charFaction, sheet.charCampaign].filter(Boolean).join(' · ')}</span>
  </div>

  <span class="wound w-{worst.level}">{worst.name}</span>

  <div class="phases" role="group" aria-label="Phases this turn">
    {#each phaseNumbers(rs) as phase (phase)}
      <button
        type="button"
        class="phase"
        class:used={sheet.phaseUsed[phase]}
        disabled={!phases[phase]}
        aria-pressed={sheet.phaseUsed[phase]}
        title={!phases[phase]
          ? `Too low a ${rs.turn.phaseStat} to act in this phase`
          : sheet.phaseUsed[phase]
            ? 'Used: press to undo'
            : 'Press when used'}
        onclick={() => (sheet.phaseUsed[phase] = !sheet.phaseUsed[phase])}>{phase}</button
      >
    {/each}
    <button type="button" class="btn" onclick={newTurn}>New turn</button>
  </div>
</div>

<style>
  .strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 18px;
    padding: 6px 18px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    flex: 1;
    min-width: 160px;
  }
  strong,
  .wound {
    font: 600 16px var(--display);
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  strong {
    color: var(--text-bright);
  }
  .wound {
    font-size: 12px;
  }
  .phases {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .phase {
    width: 34px;
    height: 34px;
    background: var(--amber-dim);
    border: 1px solid var(--accent);
    color: var(--accent);
    font: 600 15px var(--display);
    cursor: pointer;
  }
  .phase.used,
  .phase:disabled {
    background: var(--bg-deep);
    border-color: var(--border);
    color: var(--text-dim);
  }
  .phase.used {
    text-decoration: line-through;
  }
  .phase:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

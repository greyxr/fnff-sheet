<script lang="ts">
  import { onMount } from 'svelte'
  import { bodyName, consciousnessSave, deathSave, wearArmor, worstWound } from '../core'
  import { rules } from '../lib/rules.svelte'
  import { rs } from '../lib/ruleset'
  import { sheet } from '../lib/sheet.svelte'
  import { showToast } from '../lib/toast.svelte'
  import Panel from '../lib/ui/Panel.svelte'
  import Stepper from '../lib/ui/Stepper.svelte'

  const worst = $derived(worstWound(rs, sheet.wounds))
  const save = $derived(consciousnessSave(rs, worst.level, sheet.stats[rs.character.bodyStat]))

  onMount(() => {
    rules.load()
  })
  let picked = $state('') // index into rules.armor
  const entry = $derived(picked === '' ? undefined : rules.armor[Number(picked)])
</script>

<Panel title="Condition">
  {#snippet actions()}
    <button type="button" class="btn" onclick={() => rs.character.locations.forEach((l) => (sheet.wounds[l] = rs.damage.wounds[0].level))}
      >Clear all wounds</button
    >
  {/snippet}
  <div class="stack">
    <p>
      <strong class="w-{worst.level}">{worst.name}</strong>
      <span class="muted">
        · {bodyName(rs, sheet.stats[rs.character.bodyStat])} body
        {#if save !== undefined}· stay conscious on {save} or less{/if}
        {#if worst.level === rs.damage.mortalWound}· death save {deathSave(rs, sheet.stats[rs.character.bodyStat])} or less{/if}
      </span>
    </p>
    {#if rules.armor.length}
      <div class="row">
        <select aria-label="Armor from the book" bind:value={picked}>
          <option value="">Add armor from the book…</option>
          {#each rules.armor as e, i (i)}<option value={String(i)}>{e.name} (SP {e.sp})</option>{/each}
        </select>
        <button
          type="button"
          class="btn"
          disabled={!entry}
          onclick={() =>
            entry && !wearArmor(rs, sheet, entry) && showToast(`That much armor on one place is over the limit of ${rs.armor.spMax}`, true)}
          >Wear</button
        >
      </div>
      {#if entry}<p class="muted">{entry.locations.join(', ')} · {entry.note} · adds to armor already worn, up to {rs.armor.spMax}</p>{/if}
    {/if}
    <table>
      <thead><tr><th>Where</th><th>Wound</th><th>Armor (stopping power)</th></tr></thead>
      <tbody>
        {#each rs.character.locations as location (location)}
          <tr>
            <th scope="row">{location}</th>
            <td
              ><select class="w-{sheet.wounds[location]}" aria-label="Wound to the {location}" bind:value={sheet.wounds[location]}
                >{#each rs.damage.wounds as w (w.level)}<option value={w.level}>{w.name}</option>{/each}</select
              ></td
            >
            <td><Stepper label="{location} armor" max={rs.armor.spMax} bind:value={sheet.armorSP[location]} /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</Panel>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 4px 8px 4px 0;
    text-align: left;
    font-weight: normal;
  }
  thead th {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte'
  import { fire, newWeapon, nextId, reload, setCapacity, syncCustom, weaponFromCatalog } from '../core'
  import { rules } from '../lib/rules.svelte'
  import { rs } from '../lib/ruleset'
  import { sheet } from '../lib/sheet.svelte'
  import Panel from '../lib/ui/Panel.svelte'
  import Stepper from '../lib/ui/Stepper.svelte'

  const add = () => sheet.weapons.push(newWeapon(rs, nextId(sheet.weapons)))

  onMount(() => {
    rules.load()
  })

  const groups = $derived([...new Set(rules.arsenal.map((e) => e.group))])
  let picked = $state('') // index into rules.arsenal
  const entry = $derived(picked === '' ? undefined : rules.arsenal[Number(picked)])
  const addEntry = () => {
    if (entry) sheet.weapons.push(weaponFromCatalog(nextId(sheet.weapons), entry))
  }
</script>

<Panel title="Weapons">
  {#snippet actions()}<button type="button" class="btn primary" onclick={add}>+ Add weapon</button>{/snippet}
  <div class="stack">
    {#if rules.arsenal.length}
      <div class="row">
        <select aria-label="Weapon from the book" bind:value={picked}>
          <option value="">Add from the book…</option>
          {#each groups as group (group)}
            <optgroup label={group}>
              {#each rules.arsenal as e, i (i)}{#if e.group === group}<option value={String(i)}>{e.name}</option>{/if}{/each}
            </optgroup>
          {/each}
        </select>
        <button type="button" class="btn" disabled={!entry} onclick={addEntry}>Add</button>
      </div>
      {#if entry}<p class="hint">{entry.note}</p>{/if}
    {/if}
    {#each sheet.weapons as weapon (weapon.id)}
      <div class="weapon">
        <label class="wide"><span class="label">Name</span><input aria-label="Weapon name" bind:value={weapon.name} /></label>
        <label
          ><span class="label">Skill</span><select aria-label="Skill" bind:value={weapon.skill} onchange={() => syncCustom(weapon)}
            >{#each rs.character.skills as s (s.key)}<option value={s.key}>{s.name}</option>{/each}</select
          ></label
        >
        <div>
          <span class="label">Accuracy</span><Stepper
            label="Accuracy of {weapon.name}"
            min={rs.attack.weaponAccuracyMin}
            max={rs.attack.weaponAccuracyMax}
            bind:value={weapon.accuracy}
            onchange={() => syncCustom(weapon)}
          />
        </div>
        <label
          ><span class="label">Damage</span><input
            aria-label="Damage"
            bind:value={weapon.damage}
            oninput={() => syncCustom(weapon)}
          /></label
        >
        <div>
          <span class="label">Magazine (0: not a gun)</span><Stepper
            label="Magazine size of {weapon.name}"
            bind:value={weapon.capacity}
            onchange={() => {
              setCapacity(weapon, weapon.capacity)
              syncCustom(weapon)
            }}
          />
        </div>
        {#if weapon.note}<p class="hint wide">{weapon.note}</p>{/if}
        {#if weapon.capacity > 0}
          <div>
            <span class="label">Rounds</span><Stepper label="Rounds in {weapon.name}" max={weapon.capacity} bind:value={weapon.ammo} />
          </div>
          <div class="row">
            <button type="button" class="btn" disabled={weapon.ammo < 1} onclick={() => fire(weapon)}>Fire</button>
            <button type="button" class="btn" onclick={() => reload(weapon)}>Reload</button>
          </div>
        {/if}
        <button
          type="button"
          class="btn danger icon"
          aria-label="Remove {weapon.name}"
          onclick={() => (sheet.weapons = sheet.weapons.filter((w) => w.id !== weapon.id))}>✕</button
        >
      </div>
    {:else}
      <p class="empty">No weapons.</p>
    {/each}
  </div>
</Panel>

<style>
  .weapon {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    align-items: end;
    gap: 8px;
    padding: 10px;
    background: var(--bg-deep);
    border: 1px solid var(--border);
  }
  .wide {
    grid-column: span 2;
  }
  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
  }
</style>

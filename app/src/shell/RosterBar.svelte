<script lang="ts">
  import { onMount } from 'svelte'
  import { MAX_NAME, label, roster } from '../lib/roster.svelte'
  import Dialog from '../lib/ui/Dialog.svelte'

  onMount(roster.start)

  let creating = $state(false)
  let addingCampaign = $state(false)
  let name = $state('')
  let campaign = $state('')
  let campaignName = $state('')

  const startCreating = () => {
    name = ''
    campaign = roster.filter
    creating = true
  }
  const startAddingCampaign = () => {
    campaignName = ''
    addingCampaign = true
  }
</script>

<div class="bar">
  <select aria-label="Campaign" bind:value={roster.filter}>
    <option value="">All campaigns</option>
    {#each roster.campaigns as c (c)}<option>{c}</option>{/each}
  </select>
  <select aria-label="Character" value={roster.current ?? ''} onchange={(e) => roster.open(e.currentTarget.value)}>
    <option value="" disabled>— select character —</option>
    {#each roster.shown as r (r.id)}<option value={r.id}>{label(r, !roster.filter)}</option>{/each}
  </select>
  <button type="button" class="btn" onclick={startAddingCampaign}>+ Campaign</button>
  <button type="button" class="btn primary" onclick={startCreating}>+ New character</button>
  <button type="button" class="btn primary" onclick={roster.saveSheet}>Save</button>
  <button type="button" class="btn danger" disabled={!roster.current} onclick={roster.removeCurrent}>Delete</button>
</div>

<Dialog title="New character" bind:open={creating} onconfirm={() => roster.create(name.trim(), campaign)}>
  <label>
    <span class="label">Character name</span>
    <input required maxlength={MAX_NAME} bind:value={name} />
  </label>
  <label>
    <span class="label">Campaign</span>
    <select bind:value={campaign}>
      <option value="">— no campaign —</option>
      {#each roster.campaigns as c (c)}<option>{c}</option>{/each}
    </select>
  </label>
</Dialog>

<Dialog title="New campaign" bind:open={addingCampaign} onconfirm={() => roster.createCampaign(campaignName.trim())}>
  <label>
    <span class="label">Campaign name</span>
    <input required maxlength={MAX_NAME} bind:value={campaignName} />
  </label>
</Dialog>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    background: var(--bg-deep);
    border-bottom: 1px solid var(--border);
  }
  select {
    width: auto;
    min-width: 170px;
  }
</style>

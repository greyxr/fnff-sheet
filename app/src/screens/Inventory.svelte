<script lang="ts">
  import { nextId } from '../core'
  import { sheet } from '../lib/sheet.svelte'
  import Panel from '../lib/ui/Panel.svelte'
</script>

<Panel title="Inventory">
  {#snippet actions()}
    <button type="button" class="btn primary" onclick={() => sheet.invItems.push({ id: nextId(sheet.invItems), name: '', notes: '' })}
      >+ Add item</button
    >
  {/snippet}

  <div class="stack">
    {#each sheet.invItems as item (item.id)}
      <div class="row">
        <input class="grow" aria-label="Item" placeholder="Item" bind:value={item.name} />
        <input class="grow" aria-label="Notes on {item.name || 'the item'}" placeholder="Notes or condition" bind:value={item.notes} />
        <button
          type="button"
          class="btn danger icon"
          aria-label="Remove {item.name || 'item'}"
          onclick={() => (sheet.invItems = sheet.invItems.filter((i) => i.id !== item.id))}>✕</button
        >
      </div>
    {:else}
      <p class="empty">Nothing carried.</p>
    {/each}
  </div>
</Panel>

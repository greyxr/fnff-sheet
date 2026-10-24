<script lang="ts">
  import type { Snippet } from 'svelte'

  let { title, actions, children }: { title: string; actions?: Snippet; children: Snippet } = $props()
</script>

<section class="box">
  <header class="head">
    <h2 class="hd">{title}</h2>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </header>
  <div class="body">{@render children()}</div>
</section>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .body {
    padding: 12px;
  }
</style>

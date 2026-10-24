<script lang="ts">
  import { TABS, route } from '../lib/router.svelte'
</script>

<nav aria-label="Sections of the sheet">
  {#each TABS as tab (tab)}
    <a href="#{tab}" class:active={route.tab === tab} aria-current={route.tab === tab ? 'page' : undefined}>{tab}</a>
  {/each}
</nav>

<style>
  nav {
    display: flex;
    overflow-x: auto;
    padding: 0 18px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
  }
  a {
    padding: 11px 16px;
    border-bottom: 2px solid transparent;
    font: 400 12px var(--display);
    letter-spacing: 2px;
    text-transform: uppercase;
    white-space: nowrap;
    text-decoration: none;
    color: var(--text-dim);
  }
  a.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
</style>

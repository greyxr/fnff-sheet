<script lang="ts">
  import { log } from '../rolls.svelte'

  let list: HTMLElement
  $effect(() => {
    void log.length // re-run when a roll is added
    list.scrollTop = 0
  })
</script>

<section class="box">
  <header class="head">
    <h2 class="hd">Rolls</h2>
    <button type="button" class="btn" disabled={!log.length} onclick={() => (log.length = 0)}>Clear</button>
  </header>
  <ul bind:this={list} aria-live="polite">
    {#each log as e, i (i)}
      <li>
        <button type="button" class="card" class:ok={e.ok === true} class:bad={e.ok === false} title="Roll again" onclick={e.again}>
          <div class="grow">
            <span class="label">{e.label}</span>
            <span class="muted">{e.detail}</span>
          </div>
          <strong>{e.result}</strong>
        </button>
      </li>
    {:else}
      <li class="empty">Nothing rolled yet</li>
    {/each}
  </ul>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  header {
    min-height: 0;
  }
  ul {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 10px;
    list-style: none;
    overflow-y: auto;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    text-align: left;
    cursor: pointer;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    overflow-wrap: anywhere;
  }
  .card:hover {
    border-color: var(--border-bright);
  }
  .card.ok {
    border-left-color: var(--green-bright);
  }
  .card.bad {
    border-left-color: var(--red);
  }
  .label {
    margin: 0;
    color: var(--text-bright);
  }
  strong {
    font: 700 28px var(--display);
    color: var(--accent);
  }
  .ok strong {
    color: var(--green-bright);
  }
  .bad strong {
    color: var(--red);
  }
</style>

<script lang="ts">
  import { auth } from '../lib/auth.svelte'
  import { apiBase } from '../lib/api'
  import { roster } from '../lib/roster.svelte'
  import Panel from '../lib/ui/Panel.svelte'

  let password = $state('')
  let error = $state('')
  let busy = $state(false)

  try {
    apiBase()
  } catch (e) {
    error = (e as Error).message
  }

  async function enter(event: SubmitEvent) {
    event.preventDefault()
    busy = true
    error = ''
    try {
      await roster.check(password)
      auth.set(password)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      busy = false
    }
  }
</script>

<main>
  <Panel title="Group password">
    <form class="stack" onsubmit={enter}>
      <label>
        <span class="label">Password</span>
        <input type="password" required autocomplete="current-password" bind:value={password} />
      </label>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <button type="submit" class="btn primary" disabled={busy}>Enter</button>
    </form>
  </Panel>
</main>

<style>
  main {
    max-width: 380px;
    margin: 60px auto;
    padding: 0 18px;
  }
</style>

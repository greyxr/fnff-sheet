<script lang="ts">
  import { apiBase, call } from '../lib/api'
  import { auth, type Me } from '../lib/auth.svelte'
  import Panel from '../lib/ui/Panel.svelte'

  let button = $state<HTMLElement>()
  let error = $state('')

  try {
    apiBase()
  } catch (e) {
    error = (e as Error).message
  }

  async function attempt(action: () => Promise<void>) {
    error = ''
    try {
      await action()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  $effect(() => {
    if (auth.token) void attempt(async () => void (auth.me = await call<Me>('GET', '/me')))
    else if (button) void attempt(() => auth.showButton(button!))
  })
</script>

<main>
  <Panel title="Sign in">
    <div class="stack">
      {#if !auth.token}
        <p>Sign in with your Google account.</p>
        <div bind:this={button}></div>
      {/if}
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if auth.token}
        <button type="button" class="btn" onclick={() => auth.signOut()}>Use another account</button>
      {/if}
    </div>
  </Panel>
</main>

<style>
  main {
    max-width: 380px;
    margin: 60px auto;
    padding: 0 18px;
  }
</style>

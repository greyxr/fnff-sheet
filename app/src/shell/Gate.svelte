<script lang="ts">
  import { loadMe, requestAccess } from '../lib/account'
  import { apiBase } from '../lib/api'
  import { auth } from '../lib/auth.svelte'
  import Panel from '../lib/ui/Panel.svelte'

  let button = $state<HTMLElement>()
  let error = $state('')
  let busy = $state(false)

  try {
    apiBase()
  } catch (e) {
    error = (e as Error).message
  }

  async function attempt(action: () => Promise<void>) {
    busy = true
    error = ''
    try {
      await action()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      busy = false
    }
  }

  $effect(() => {
    if (auth.token) void attempt(loadMe)
    else if (button) void attempt(() => auth.showButton(button!))
  })
</script>

<main>
  <Panel title="Sign in">
    <div class="stack">
      {#if !auth.token}
        <p>Sign in with your Google account.</p>
        <div bind:this={button}></div>
      {:else if auth.me}
        <p>Signed in as {auth.me.email}.</p>
        {#if auth.me.status === 'none'}
          <p>This account has not been approved yet.</p>
          <button type="button" class="btn primary" disabled={busy} onclick={() => attempt(requestAccess)}>Request access</button>
        {:else if auth.me.status === 'pending'}
          <p>Your request is waiting for approval.</p>
          <button type="button" class="btn primary" disabled={busy} onclick={() => attempt(loadMe)}>Check again</button>
        {:else if auth.me.status === 'denied'}
          <p>This account was not given access.</p>
        {/if}
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

<script lang="ts">
  import { onMount } from 'svelte'
  import { listUsers, setStatus, type User } from '../lib/account'
  import { showToast } from '../lib/toast.svelte'
  import Dialog from '../lib/ui/Dialog.svelte'

  let users = $state<User[]>([])
  let open = $state(false)
  const waiting = $derived(users.filter((u) => u.status === 'pending').length)

  async function attempt(action: () => Promise<User[]>) {
    try {
      users = await action()
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true)
    }
  }
  onMount(() => attempt(listUsers))

  function show() {
    open = true
    void attempt(listUsers)
  }
</script>

<button type="button" class="btn" onclick={show}>Accounts{waiting ? ` (${waiting})` : ''}</button>

<Dialog title="Accounts" bind:open>
  {#each users as u (u.sub)}
    <div class="row">
      <div class="grow">
        <div>{u.name || u.email}</div>
        <div class="muted">{u.email} · {u.status}</div>
      </div>
      {#if u.status !== 'approved'}
        <button type="button" class="btn primary" onclick={() => attempt(() => setStatus(u.sub, 'approved'))}>Approve</button>
      {/if}
      {#if u.status !== 'denied'}
        <button type="button" class="btn danger" onclick={() => attempt(() => setStatus(u.sub, 'denied'))}>
          {u.status === 'approved' ? 'Revoke' : 'Deny'}
        </button>
      {/if}
    </div>
  {:else}
    <p class="muted">No one has asked to join yet</p>
  {/each}
</Dialog>

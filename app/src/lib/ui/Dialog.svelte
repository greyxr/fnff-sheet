<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    open = $bindable(false),
    onconfirm,
    children,
  }: {
    title: string
    open?: boolean
    onconfirm: () => Promise<void> | void // throw to keep the dialog open and show why
    children: Snippet
  } = $props()

  let dialog: HTMLDialogElement
  let error = $state('')

  $effect(() => {
    if (open && !dialog.open) {
      error = ''
      dialog.showModal()
    } else if (!open && dialog.open) dialog.close()
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    try {
      await onconfirm()
      open = false
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }
</script>

<dialog bind:this={dialog} aria-labelledby="dialog-title" onclose={() => (open = false)}>
  <form onsubmit={submit}>
    <h2 class="hd" id="dialog-title">{title}</h2>
    <div class="content">{@render children()}</div>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="buttons">
      <button type="button" class="btn" onclick={() => (open = false)}>Cancel</button>
      <button type="submit" class="btn primary">Create</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    min-width: min(380px, calc(100vw - 32px));
    padding: 0;
    background: var(--bg-panel);
    border: 1px solid var(--accent);
    color: var(--text);
    overflow: visible;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.65);
  }
  h2 {
    padding: 8px 14px;
    background: var(--bg-raised);
    border-bottom: 1px solid var(--border);
  }
  .content,
  .buttons {
    padding: 14px;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .error {
    margin: 0 14px;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>

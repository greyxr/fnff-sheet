<script lang="ts">
  import { toast } from '../toast.svelte'
</script>

<div class="toast" class:show={toast.message} class:bad={toast.bad} role={toast.bad ? 'alert' : 'status'}>{toast.message}</div>

<style>
  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 500;
    max-width: min(420px, calc(100vw - 32px));
    padding: 9px 14px;
    background: var(--bg-raised);
    border: 1px solid var(--accent);
    color: var(--accent);
    letter-spacing: 1px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .show {
    opacity: 1;
  }
  .bad {
    border-color: var(--red);
    color: var(--red);
  }
</style>

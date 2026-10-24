<script lang="ts">
  // With `pick`, the number is a button (selected when `pick.on`) instead of a field to type in.
  let {
    value = $bindable(0),
    min = 0,
    max = Infinity,
    label,
    onchange,
    pick,
  }: {
    value?: number
    min?: number
    max?: number
    label: string
    onchange?: () => void
    pick?: { on: boolean; click: () => void }
  } = $props()

  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const set = (n: number) => {
    value = n
    onchange?.()
  }

  // Take what is typed while it is in range; correct it when the field is left.
  function typed(event: Event & { currentTarget: HTMLInputElement }) {
    const n = event.currentTarget.valueAsNumber
    if (n >= min && n <= max) set(n)
  }
  function settled(event: Event & { currentTarget: HTMLInputElement }) {
    const n = event.currentTarget.valueAsNumber
    set(clamp(Number.isNaN(n) ? value : n))
    event.currentTarget.value = String(value)
  }
</script>

<div class="stepper">
  <button type="button" class="btn icon" aria-label="Less {label}" disabled={value <= min} onclick={() => set(clamp(value - 1))}>−</button>
  {#if pick}
    <button type="button" class="btn value" class:on={pick.on} aria-label={label} aria-pressed={pick.on} onclick={pick.click}
      >{value}</button
    >
  {:else}
    <input type="number" aria-label={label} {min} {max} {value} oninput={typed} onchange={settled} />
  {/if}
  <button type="button" class="btn icon" aria-label="More {label}" disabled={value >= max} onclick={() => set(clamp(value + 1))}>+</button>
</div>

<style>
  .stepper {
    display: flex;
    gap: 3px;
  }
  input,
  .value {
    flex: 1;
    min-width: 44px;
    text-align: center;
  }
</style>

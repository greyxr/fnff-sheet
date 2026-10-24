<script lang="ts">
  import { auth } from '../lib/auth.svelte'
  import { downloadJson, readJsonFile } from '../lib/files'
  import { roster } from '../lib/roster.svelte'
  import { loadCharacter, sheet } from '../lib/sheet.svelte'
  import { showToast } from '../lib/toast.svelte'

  let fileInput: HTMLInputElement

  function exportSheet() {
    const name = sheet.charName.trim().replace(/\s+/g, '_') || 'character'
    downloadJson(`${name}_fnff.json`, $state.snapshot(sheet))
  }

  async function importFile(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const data = (await readJsonFile(file)) as { charName?: unknown; stats?: unknown }
      if (typeof data?.charName !== 'string' || !data.stats) throw new Error(`${file.name} is not a character sheet`)
      if (roster.discardsEdits()) return
      loadCharacter(data)
      roster.current = null
      showToast(`Imported ${file.name}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true)
    }
  }
</script>

<header>
  <div>
    <h1>⚠ Zone Operative Dossier</h1>
    <p>Friday Night Firefight // Stalker campaign sheet</p>
  </div>
  <div class="row">
    <button type="button" class="btn" onclick={exportSheet}>↓ Export</button>
    <button type="button" class="btn" onclick={() => fileInput.click()}>↑ Import</button>
    <button type="button" class="btn" onclick={() => auth.clear()}>Lock</button>
    <input type="file" accept=".json,application/json" hidden bind:this={fileInput} onchange={importFile} />
  </div>
</header>

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 18px;
    background: var(--bg-panel);
    border-bottom: 2px solid var(--border-bright);
  }
  h1 {
    font: 700 20px var(--display);
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--accent);
  }
  p {
    margin-top: 2px;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
</style>

<script lang="ts">
  import type { RulesSection, Snippet } from '../core'
  import { rules } from '../lib/rules.svelte'
  import { route } from '../lib/router.svelte'
  import Panel from '../lib/ui/Panel.svelte'

  let query = $state('')
  $effect(() => {
    void rules.load()
  })

  const results = $derived(query.trim() ? rules.search(query.trim()) : [])
  const toc = $derived(rules.sections.filter((s) => s.level >= 2 && s.level <= 4 && s.search !== false))

  // A section and everything beneath it, in book order.
  const family = $derived.by(() => {
    const i = rules.sections.findIndex((s) => s.id === route.section)
    if (i < 0) return []
    const top = rules.sections[i]
    const out = [top]
    for (let j = i + 1; j < rules.sections.length && rules.sections[j].level > top.level; j++) out.push(rules.sections[j])
    return out
  })
  const neighbours = $derived.by(() => {
    if (!family.length) return [undefined, undefined]
    const i = rules.sections.indexOf(family[0])
    return [rules.sections[i - 1], rules.sections[i + family.length]]
  })

  const pages = (s: RulesSection) => (s.page ? `p. ${s.page}${s.pageEnd && s.pageEnd !== s.page ? `–${s.pageEnd}` : ''}` : '')
  const crumbs = (s: RulesSection) => s.path.slice(0, -1).join(' › ')

  // The book's markdown subset (headings, paragraphs, '- ' lists) as blocks of lines; inline marks are split in the template.
  const blocks = (md: string) =>
    md
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => {
        const lines = b.split('\n')
        const h = b.match(/^(#{1,5}) (.+)$/)
        return lines.every((l) => l.startsWith('- '))
          ? { tag: 'ul', lines: lines.map((l) => l.slice(2)) }
          : h
            ? { tag: `h${h[1].length + 1}`, lines: [h[2]] }
            : { tag: 'p', lines: [b.replace(/\s*\n\s*/g, ' ')] }
      })
  const marks = /(`[^`]+`|\*\*[^*]+\*\*|(?<=^|[\s(])_[^_]+_(?=[\s).,;:!?]|$))/

  // Snippet text cut into plain and highlighted pieces.
  function pieces({ text, marks }: Snippet) {
    const out: { text: string; mark: boolean }[] = []
    let pos = 0
    for (const [from, to] of marks) {
      if (from > pos) out.push({ text: text.slice(pos, from), mark: false })
      out.push({ text: text.slice(from, to), mark: true })
      pos = to
    }
    if (pos < text.length) out.push({ text: text.slice(pos), mark: false })
    return out
  }

  // Typing while reading a section goes back to the results.
  function onInput() {
    if (!route.section) return
    history.replaceState(null, '', '#rules')
    route.section = ''
  }
</script>

{#snippet inline(line: string)}
  {#each line.split(marks) as t, i (i)}
    {#if t.startsWith('**')}<strong>{t.slice(2, -2)}</strong>{:else if t.startsWith('`')}<code>{t.slice(1, -1)}</code
      >{:else if t.length > 2 && t.startsWith('_') && t.endsWith('_')}<em>{t.slice(1, -1)}</em>{:else}{t}{/if}
  {/each}
{/snippet}

<Panel title="Rules">
  {#if rules.loading}
    <p class="empty">Loading the rules…</p>
  {:else if rules.missing}
    <p class="empty">The server has no rules text yet (GET /ruleset returned 404). Upload ruleset.json to the bucket.</p>
  {:else if rules.error}
    <div class="stack">
      <p class="error">Could not load the rules: {rules.error}</p>
      <div><button type="button" class="btn" onclick={() => rules.load()}>Try again</button></div>
    </div>
  {:else if rules.ready}
    <div class="stack">
      <input type="search" aria-label="Search the rules" placeholder="Search the rules" bind:value={query} oninput={onInput} />

      {#if query.trim()}
        {#each results as r (r.section.id)}
          <a class="hit" href="#rules/{encodeURIComponent(r.section.id)}">
            <span class="title">{r.section.title}</span>
            <span class="muted small">{[crumbs(r.section), pages(r.section)].filter(Boolean).join(' · ')}</span>
            <span class="snippet"
              >{#each pieces(r.snippet) as p, i (i)}{#if p.mark}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</span
            >
          </a>
        {:else}
          <p class="empty">No matches for “{query.trim()}”.</p>
        {/each}
      {:else if family.length}
        <article class="reader">
          <a href="#rules" class="small">← All sections</a>
          <p class="muted small">{[crumbs(family[0]), pages(family[0])].filter(Boolean).join(' · ')}</p>
          {#each family as s, k (s.id)}
            {#if k > 0}
              <svelte:element this={`h${Math.min(6, s.level)}`}>{s.title} <span class="muted small">{pages(s)}</span></svelte:element>
            {:else}
              <h2>{s.title}</h2>
            {/if}
            {#each blocks(s.md ?? '') as b, i (i)}
              {#if b.tag === 'ul'}
                <ul>
                  {#each b.lines as line, i (i)}<li>{@render inline(line)}</li>{/each}
                </ul>
              {:else}
                <svelte:element this={b.tag}>{@render inline(b.lines[0])}</svelte:element>
              {/if}
            {/each}
          {/each}
          <div class="row nav">
            {#if neighbours[0]}<a href="#rules/{encodeURIComponent(neighbours[0].id)}">← {neighbours[0].title}</a>{/if}
            {#if neighbours[1]}<a class="next" href="#rules/{encodeURIComponent(neighbours[1].id)}">{neighbours[1].title} →</a>{/if}
          </div>
        </article>
      {:else}
        {#if route.section}<p class="empty">That section isn’t in the rules.</p>{/if}
        <nav class="toc" aria-label="Rules sections">
          {#each toc as s (s.id)}
            <a class="l{s.level}" href="#rules/{encodeURIComponent(s.id)}">{s.title}</a>
          {/each}
        </nav>
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .small {
    font-size: 11px;
  }
  .hit {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    text-decoration: none;
    color: var(--text);
  }
  .hit:hover {
    border-color: var(--border-bright);
  }
  .title {
    font: 600 14px var(--display);
    letter-spacing: 1px;
    color: var(--text-bright);
  }
  .snippet {
    font-size: 13px;
    line-height: 1.45;
  }
  mark {
    background: var(--amber-dim);
    color: var(--accent);
  }
  .toc {
    display: flex;
    flex-direction: column;
  }
  .toc a {
    padding: 4px 0;
    text-decoration: none;
    color: var(--text);
  }
  .toc a:hover {
    color: var(--accent);
  }
  .toc .l2 {
    margin-top: 8px;
    font: 600 14px var(--display);
    letter-spacing: 1px;
    color: var(--text-bright);
  }
  .toc .l3 {
    padding-left: 14px;
  }
  .toc .l4 {
    padding-left: 28px;
    color: var(--text-dim);
  }
  .reader {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 760px;
    line-height: 1.55;
  }
  .reader :global(h2),
  .reader :global(h3),
  .reader :global(h4),
  .reader :global(h5),
  .reader :global(h6) {
    margin-top: 8px;
    font: 600 15px var(--display);
    letter-spacing: 1px;
    color: var(--text-bright);
  }
  .reader ul {
    padding-left: 20px;
  }
  .reader code {
    font-family: var(--mono);
    color: var(--accent);
  }
  .nav {
    justify-content: space-between;
    margin-top: 8px;
  }
  .next {
    margin-left: auto;
  }
</style>

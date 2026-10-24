<script lang="ts">
  import { auth } from './lib/auth.svelte'
  import { route } from './lib/router.svelte'
  import RollLog from './lib/ui/RollLog.svelte'
  import Toast from './lib/ui/Toast.svelte'
  import Arsenal from './screens/Arsenal.svelte'
  import Combat from './screens/Combat.svelte'
  import Condition from './screens/Condition.svelte'
  import Inventory from './screens/Inventory.svelte'
  import Operative from './screens/Operative.svelte'
  import Rules from './screens/Rules.svelte'
  import Gate from './shell/Gate.svelte'
  import Header from './shell/Header.svelte'
  import RosterBar from './shell/RosterBar.svelte'
  import StatusStrip from './shell/StatusStrip.svelte'
  import TabBar from './shell/TabBar.svelte'

  const screens = { operative: Operative, combat: Combat, arsenal: Arsenal, condition: Condition, inventory: Inventory, rules: Rules }
  const Screen = $derived(screens[route.tab])
</script>

{#if auth.password}
  <Header />
  <RosterBar />
  <div class="sticky">
    <TabBar />
    <StatusStrip />
  </div>
  <div class="page">
    <main class="stack"><Screen /></main>
    <aside><RollLog /></aside>
  </div>
{:else}
  <Gate />
{/if}
<Toast />

<style>
  .sticky {
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .page {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 14px 18px 60px;
  }
  main {
    flex: 1;
    min-width: 0;
    gap: 12px;
  }
  aside {
    flex: none;
    width: 280px;
    position: sticky;
    top: 96px;
    height: calc(100vh - 110px);
  }
  @media (max-width: 900px) {
    .page {
      flex-direction: column;
      align-items: stretch;
    }
    aside {
      position: static;
      width: auto;
      height: 320px;
    }
  }
</style>

// Which screen is showing, kept in the address bar (#combat) so each screen has a link.
// The rules tab also names a section: #rules/<id>.

export const TABS = ['operative', 'combat', 'arsenal', 'condition', 'inventory', 'rules'] as const

const parts = () => location.hash.slice(1).split('/')
const readTab = () => TABS.find((t) => t === parts()[0]) ?? 'operative'
const readSection = () => (readTab() === 'rules' ? decodeURIComponent(parts().slice(1).join('/')) : '')

export const route = $state({ tab: readTab(), section: readSection() })

window.addEventListener('hashchange', () => {
  route.tab = readTab()
  route.section = readSection()
})

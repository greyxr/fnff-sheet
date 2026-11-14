import { render, screen, waitFor, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { auth } from './lib/auth.svelte'
import { roster } from './lib/roster.svelte'
import { sheet } from './lib/sheet.svelte'
import App from './App.svelte'
import RosterBar from './shell/RosterBar.svelte'
import { fakeApi, resetApp, typing } from './test-utils'

beforeEach(resetApp)

describe('roster bar', () => {
  async function createCharacter(user: ReturnType<typeof typing>, name: string, campaign = '') {
    await user.click(screen.getByRole('button', { name: '+ New character' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Character name'), name)
    if (campaign) await user.selectOptions(within(dialog).getByLabelText('Campaign'), campaign)
    await user.click(within(dialog).getByRole('button', { name: 'Create' }))
    return dialog
  }

  it('creates a campaign, then a character in it that loads into the sheet', async () => {
    const user = typing()
    render(RosterBar)
    await user.click(screen.getByRole('button', { name: '+ Campaign' }))
    const campaignDialog = screen.getByRole('dialog')
    await user.type(within(campaignDialog).getByLabelText('Campaign name'), 'Camp A')
    await user.click(within(campaignDialog).getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(roster.campaigns).toEqual(['Camp A']))
    await createCharacter(user, 'Kai', 'Camp A')
    await waitFor(() => expect(sheet).toMatchObject({ charName: 'Kai', charCampaign: 'Camp A' }))
    expect(fakeApi.stored).toHaveLength(1)
    expect(roster.current).toBe(fakeApi.stored[0].id)
  })
})

describe('gate', () => {
  it('admits listed, refuses unlisted', async () => {
    auth.clear()
    auth.set('token-kai')
    const { unmount } = render(App)
    expect(await screen.findByRole('alert')).toHaveTextContent('kai@test')
    unmount()
    auth.set('token-gm')
    render(App)
    await screen.findByRole('button', { name: 'Sign out' })
  })

  it('signs out on a stale token', async () => {
    auth.clear()
    auth.set('stale')
    render(App)
    expect(await screen.findByText('Sign in with your Google account.')).toBeInTheDocument()
    expect(auth.token).toBe('')
  })

  it('returns to the gate when delisted', async () => {
    render(App)
    await screen.findByRole('button', { name: 'Sign out' })
    fakeApi.allowed = []
    await roster.refresh().catch(() => {})
    expect(await screen.findByRole('alert')).toHaveTextContent('gm@test')
  })
})

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
  it('stays up on a wrong password, and lets the right one in', async () => {
    const user = typing()
    auth.clear()
    render(App)
    await user.type(screen.getByLabelText('Password'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Wrong password')).toBeInTheDocument()
    expect(auth.password).toBe('')
    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), fakeApi.password)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByRole('button', { name: 'Lock' })
  })
})

import { render, screen, waitFor, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { auth } from './lib/auth.svelte'
import { roster } from './lib/roster.svelte'
import { sheet } from './lib/sheet.svelte'
import App from './App.svelte'
import Header from './shell/Header.svelte'
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
  it('keeps a new account out until it is approved', async () => {
    const user = typing()
    auth.clear()
    auth.set('token-kai')
    render(App)
    await user.click(await screen.findByRole('button', { name: 'Request access' }))
    expect(await screen.findByText('Your request is waiting for approval.')).toBeInTheDocument()
    expect(fakeApi.users['2']).toMatchObject({ email: 'kai@test', status: 'pending' })
    fakeApi.users['2'].status = 'approved'
    await user.click(screen.getByRole('button', { name: 'Check again' }))
    await screen.findByRole('button', { name: 'Sign out' })
  })

  it('asks to sign in again when the token is no longer good', async () => {
    auth.clear()
    auth.set('stale')
    render(App)
    expect(await screen.findByText('Sign in with your Google account.')).toBeInTheDocument()
    expect(auth.token).toBe('')
  })
})

describe('accounts', () => {
  it('lets the admin approve a waiting account', async () => {
    const user = typing()
    fakeApi.users['2'] = { email: 'kai@test', name: 'Kai', status: 'pending' }
    render(Header)
    await user.click(await screen.findByRole('button', { name: 'Accounts (1)' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(fakeApi.users['2'].status).toBe('approved'))
    expect(screen.getByRole('button', { name: 'Accounts' })).toBeInTheDocument()
  })
})

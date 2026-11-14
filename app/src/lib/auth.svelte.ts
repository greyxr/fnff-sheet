// Who is signed in: the Google ID token, kept in this browser, and what the server says about the account.
// The token only gates the screen: the server does the real check.
declare const google: {
  accounts: {
    id: {
      initialize(options: { client_id: string; auto_select: boolean; callback: (response: { credential: string }) => void }): void
      renderButton(parent: HTMLElement, options: { theme: string; size: string }): void
      prompt(): void
      disableAutoSelect(): void
    }
  }
}

export interface Me {
  email: string
}

const KEY = 'fnff_token'
const REFRESH_WAIT = 5000
const store = (f: (s: Storage) => void) => {
  try {
    f(localStorage)
  } catch {
    /* private mode: it lasts until reload */
  }
}

let loading: Promise<void> | undefined
const loadGoogle = () =>
  (loading ??= new Promise<void>((resolve, reject) => {
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!client_id) throw new Error('VITE_GOOGLE_CLIENT_ID is not set: the app needs the Google client ID')
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      google.accounts.id.initialize({ client_id, auto_select: true, callback: (response) => auth.set(response.credential) })
      resolve()
    }
    script.onerror = () => {
      loading = undefined
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.append(script)
  }))

class Auth {
  token = $state(
    (() => {
      try {
        return localStorage.getItem(KEY) ?? ''
      } catch {
        return ''
      }
    })(),
  )
  me = $state<Me | null>(null)
  private refreshing: Promise<boolean> | undefined
  private refreshed: (() => void) | undefined

  set(token: string) {
    this.token = token
    store((s) => s.setItem(KEY, token))
    this.refreshed?.()
  }
  clear() {
    this.token = ''
    this.me = null
    store((s) => s.removeItem(KEY))
  }
  signOut() {
    this.clear()
    loadGoogle().then(
      () => google.accounts.id.disableAutoSelect(),
      () => {},
    )
  }
  async showButton(parent: HTMLElement) {
    await loadGoogle()
    google.accounts.id.renderButton(parent, { theme: 'filled_black', size: 'large' })
  }

  // Google's tokens last an hour: ask for a fresh one without a click. False if Google wants the user to choose.
  refresh() {
    return (this.refreshing ??= this.ask().finally(() => (this.refreshing = undefined)))
  }
  private async ask() {
    try {
      await loadGoogle()
    } catch {
      return false
    }
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), REFRESH_WAIT)
      this.refreshed = () => {
        clearTimeout(timer)
        resolve(true)
      }
      google.accounts.id.prompt()
    })
  }
}

export const auth = new Auth()

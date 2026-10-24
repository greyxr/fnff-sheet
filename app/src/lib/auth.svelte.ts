// The group password, kept in this browser. It only gates the API: the server does the real check.
const KEY = 'fnff_pw'
const store = (f: (s: Storage) => void) => {
  try {
    f(localStorage)
  } catch {
    /* private mode: it lasts until reload */
  }
}

class Auth {
  password = $state(
    (() => {
      try {
        return localStorage.getItem(KEY) ?? ''
      } catch {
        return ''
      }
    })(),
  )
  set(password: string) {
    this.password = password
    store((s) => s.setItem(KEY, password))
  }
  clear() {
    this.password = ''
    store((s) => s.removeItem(KEY))
  }
}

export const auth = new Auth()

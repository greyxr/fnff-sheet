// Talking to the group API (lambda/handler.py).

import { auth } from './auth.svelte'

export const apiBase = () => {
  const url = (import.meta.env.VITE_GROUP_API_URL ?? '').replace(/\/$/, '')
  if (!url) throw new Error('VITE_GROUP_API_URL is not set: the app needs the group API address')
  return url
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

// A 401 means the token ran out: get a fresh one and try again, or sign out, which brings the gate back.
// A 403 means the account is not on the player list: forget who is signed in, which also brings the gate back.
export async function call<T>(method: string, url: string, body?: unknown, retry = true): Promise<T> {
  const res = await fetch(apiBase() + url, {
    method,
    headers: { Authorization: `Bearer ${auth.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    if (retry && (await auth.refresh())) return call(method, url, body, false)
    auth.clear()
    throw new ApiError('Signed out: sign in again', 401)
  }
  if (res.status === 403) auth.me = null
  if (!res.ok) {
    const reply = await res.json().catch(() => null)
    throw new ApiError(reply?.error || reply?.message || `Server error ${res.status}`, res.status)
  }
  return (res.status === 204 ? null : await res.json()) as T
}

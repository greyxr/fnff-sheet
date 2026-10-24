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

// A 401 means the password is no good: forget it, which brings the gate back.
export async function call<T>(method: string, url: string, body?: unknown, password = auth.password): Promise<T> {
  const res = await fetch(apiBase() + url, {
    method,
    headers: { Authorization: password, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    auth.clear()
    throw new ApiError('Wrong password', 401)
  }
  if (!res.ok) throw new ApiError((await res.json().catch(() => null))?.error || `Server error ${res.status}`, res.status)
  return (res.status === 204 ? null : await res.json()) as T
}

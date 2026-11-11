import { call } from './api'
import { auth, type Me } from './auth.svelte'

export interface User {
  sub: string
  email: string
  name: string
  status: 'approved' | 'pending' | 'denied'
}

export const loadMe = async () => {
  auth.me = await call<Me>('GET', '/me')
}
export const requestAccess = async () => {
  auth.me = await call<Me>('POST', '/access-request')
}
export const listUsers = () => call<User[]>('GET', '/users')
export const setStatus = (sub: string, status: User['status']) => call<User[]>('PUT', `/users/${encodeURIComponent(sub)}`, { status })

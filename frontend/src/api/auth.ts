import api from './axios'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string
}

export const getMe = () => api.get<User>('/auth/me').then((r) => r.data)

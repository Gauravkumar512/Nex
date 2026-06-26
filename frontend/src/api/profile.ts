import api from './axios'

export interface Profile {
  id: string
  summary: string
  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
  }
  projects: {
    name: string
    description: string
    techStack: string[]
    githubUrl?: string
  }[]
}

export const uploadResume = (file: File) => {
  const form = new FormData()
  form.append('resume', file)
  return api.post<Profile>('/profile/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

export const getProfile = () => api.get<Profile>('/profile').then((r) => r.data)

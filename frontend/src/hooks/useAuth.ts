import { useQuery } from '@tanstack/react-query'
import { getMe, type User } from '../api/auth'

export function useAuth(): {
  user: User | undefined
  isLoading: boolean
  isAuthenticated: boolean
} {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  }
}

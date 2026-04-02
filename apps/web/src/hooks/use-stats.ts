import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardStatsResponse {
  students: { total: number; active: number }
  routes:   { total: number; active: number }
  drivers:  { total: number; active: number }
  vehicles: { total: number }
}

export function useStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['stats'],
    queryFn: () => api.get<DashboardStatsResponse>('/stats'),
    staleTime: 10 * 60 * 1000, // 10 min — exceção intencional ao default de 30min
  })
}

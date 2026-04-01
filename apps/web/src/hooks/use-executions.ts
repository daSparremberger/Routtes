import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Execution {
  id:               string
  status:           'prepared' | 'running' | 'completed' | 'cancelled' | 'delayed'
  route?:           { id: string; name: string }
  driver?:          { id: string; name: string }
  vehicle?:         { id: string; licensePlate: string }
  studentsBoarded?: number
  studentsTotal?:   number
  startedAt?:       string
  finishedAt?:      string
  serviceDate?:     string
}

export function useActiveExecutions() {
  return useQuery<Execution[]>({
    queryKey: ['executions', 'active'],
    queryFn:  () => api.get<Execution[]>('/executions/active').catch(() => []),
    refetchInterval: 30_000,
  })
}

export function useExecution(id: string) {
  return useQuery<Execution>({
    queryKey: ['executions', id],
    queryFn:  () => api.get<Execution>(`/executions/${id}`),
    enabled:  !!id,
  })
}

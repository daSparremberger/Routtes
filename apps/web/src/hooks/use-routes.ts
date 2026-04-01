import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Route {
  id:         string
  name:       string
  shift?:     string
  status?:    string
  driver?:    { id: string; name: string } | null
  vehicle?:   { id: string; licensePlate: string } | null
  school?:    { id: string; name: string } | null
  stops?:     { id: string; studentName?: string }[]
  studentsCount?: number
  estimatedDepartureTime?: string
  createdAt?: string
}

export function useRoutes(shift?: string) {
  const path = shift ? `/routes?shift=${shift}` : '/routes'
  return useQuery<Route[]>({
    queryKey: ['routes', shift],
    queryFn:  () => api.get<Route[]>(path),
  })
}

export function useRoute(id: string) {
  return useQuery<Route>({
    queryKey: ['routes', id],
    queryFn:  () => api.get<Route>(`/routes/${id}`),
    enabled:  !!id,
  })
}

export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Route>) => api.post<Route>('/routes', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useUpdateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Route> & { id: string }) =>
      api.patch<Route>(`/routes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/routes/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

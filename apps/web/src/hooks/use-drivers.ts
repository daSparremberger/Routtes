import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Driver {
  id:         string
  name:       string
  phone?:     string
  email?:     string
  licenseCategory?: string
  status:     'active' | 'inactive'
  inviteStatus?: 'pending' | 'accepted' | 'none'
  routes?:    { id: string; name: string }[]
  vehicle?:   { id: string; licensePlate: string } | null
  createdAt?: string
}

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn:  () => api.get<Driver[]>('/drivers'),
  })
}

export function useDriver(id: string) {
  return useQuery<Driver>({
    queryKey: ['drivers', id],
    queryFn:  () => api.get<Driver>(`/drivers/${id}`),
    enabled:  !!id,
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Driver>) => api.post<Driver>('/drivers', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useUpdateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Driver> & { id: string }) =>
      api.patch<Driver>(`/drivers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useDeleteDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/drivers/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

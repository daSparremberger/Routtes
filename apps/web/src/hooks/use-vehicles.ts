import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Vehicle {
  id:           string
  name?:        string
  licensePlate: string
  model?:       string
  brand?:       string
  capacity?:    number
  status:       'active' | 'inactive' | 'maintenance'
  driver?:      { id: string; name: string } | null
  nextMaintenanceAt?: string
  createdAt?:   string
}

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn:  () => api.get<Vehicle[]>('/vehicles'),
  })
}

export function useVehicle(id: string) {
  return useQuery<Vehicle>({
    queryKey: ['vehicles', id],
    queryFn:  () => api.get<Vehicle>(`/vehicles/${id}`),
    enabled:  !!id,
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Vehicle>) => api.post<Vehicle>('/vehicles', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useUpdateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Vehicle> & { id: string }) =>
      api.patch<Vehicle>(`/vehicles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

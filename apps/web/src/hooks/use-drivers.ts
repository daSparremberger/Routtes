import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface DriverApi {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  created_at?: string
  driver_profiles?: {
    cnh?: string | null
    cnh_validity?: string | null
    cnh_category?: string | null
  } | null
}

export interface Driver {
  id: string
  name: string
  email?: string
  cnh?: string
  cnhValidity?: string | null
  licenseCategory?: string
  status: 'active' | 'inactive'
  createdAt?: string
}

export interface DriverUpsertInput {
  name: string
  email: string
  cnh?: string
  cnh_validity?: string
  cnh_category?: string
  status?: 'active' | 'inactive'
}

function mapDriver(driver: DriverApi): Driver {
  return {
    id: driver.id,
    name: driver.name,
    email: driver.email,
    cnh: driver.driver_profiles?.cnh ?? undefined,
    cnhValidity: driver.driver_profiles?.cnh_validity ?? null,
    licenseCategory: driver.driver_profiles?.cnh_category ?? undefined,
    status: driver.status,
    createdAt: driver.created_at,
  }
}

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const data = await api.get<DriverApi[]>('/drivers')
      return data.map(mapDriver)
    },
  })
}

export function useDriver(id: string) {
  return useQuery<Driver>({
    queryKey: ['drivers', id],
    queryFn: async () => mapDriver(await api.get<DriverApi>(`/drivers/${id}`)),
    enabled: !!id,
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DriverUpsertInput) => api.post<DriverApi>('/drivers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useUpdateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DriverUpsertInput> & { id: string }) =>
      api.patch<DriverApi>(`/drivers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useDeleteDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/drivers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

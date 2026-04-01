import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface VehicleApi {
  id: string
  plate: string
  capacity: number
  model?: string | null
  totem_id?: string | null
  status: 'active' | 'inactive' | 'maintenance'
  created_at?: string
  vehicle_drivers?: { users?: { id: string; name: string } | null }[]
}

export interface Vehicle {
  id: string
  name?: string
  licensePlate: string
  model?: string
  capacity?: number
  status: 'active' | 'inactive' | 'maintenance'
  totemId?: string
  driver?: { id: string; name: string } | null
  createdAt?: string
}

export interface VehicleUpsertInput {
  plate: string
  capacity: number
  model?: string
  totem_id?: string
  status?: 'active' | 'inactive'
}

function mapVehicle(vehicle: VehicleApi): Vehicle {
  const currentDriver = vehicle.vehicle_drivers?.find((entry) => entry.users)?.users ?? null
  return {
    id: vehicle.id,
    name: vehicle.plate,
    licensePlate: vehicle.plate,
    model: vehicle.model ?? undefined,
    capacity: vehicle.capacity,
    status: vehicle.status,
    totemId: vehicle.totem_id ?? undefined,
    driver: currentDriver ? { id: currentDriver.id, name: currentDriver.name } : null,
    createdAt: vehicle.created_at,
  }
}

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const data = await api.get<VehicleApi[]>('/vehicles')
      return data.map(mapVehicle)
    },
  })
}

export function useVehicle(id: string) {
  return useQuery<Vehicle>({
    queryKey: ['vehicles', id],
    queryFn: async () => mapVehicle(await api.get<VehicleApi>(`/vehicles/${id}`)),
    enabled: !!id,
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VehicleUpsertInput) => api.post<VehicleApi>('/vehicles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useUpdateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<VehicleUpsertInput> & { id: string }) =>
      api.patch<VehicleApi>(`/vehicles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

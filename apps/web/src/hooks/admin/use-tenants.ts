import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mgmt } from '@/lib/management-api'

export interface Tenant {
  id:         string
  name:       string
  city:       string
  state:      string
  status:     'active' | 'suspended' | 'inactive'
  created_at: string
}

export interface CreateTenantDto {
  name:  string
  city:  string
  state: string
}

export function useTenants() {
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn:  () => mgmt.get<Tenant[]>('/admin/tenants'),
  })
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', id],
    queryFn:  () => mgmt.get<Tenant>(`/admin/tenants/${id}`),
    enabled:  !!id,
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTenantDto) => mgmt.post<Tenant>('/admin/tenants', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  })
}

export function useActivateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mgmt.patch<Tenant>(`/admin/tenants/${id}/activate`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  })
}

export function useDeactivateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mgmt.patch<Tenant>(`/admin/tenants/${id}/deactivate`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  })
}

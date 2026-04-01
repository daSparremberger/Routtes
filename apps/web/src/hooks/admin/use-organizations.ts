import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mgmt } from '@/lib/management-api'

export interface Organization {
  id:        string
  name:      string
  tenant_id: string
  status:    'active' | 'inactive'
  tenants?:  { name: string; city: string; state: string }
  created_at: string
}

export interface CreateOrganizationDto {
  name:      string
  tenant_id: string
}

export function useOrganizations() {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn:  () => mgmt.get<Organization[]>('/admin/organizations'),
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateOrganizationDto) => mgmt.post<Organization>('/admin/organizations', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  })
}

export function useDeactivateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mgmt.patch<Organization>(`/admin/organizations/${id}/deactivate`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  })
}

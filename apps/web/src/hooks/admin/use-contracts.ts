import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mgmt } from '@/lib/management-api'

export interface Contract {
  id:              string
  organization_id: string
  status:          'active' | 'pending' | 'expired' | 'cancelled'
  monthly_value:   number
  starts_at:       string
  ends_at:         string | null
  organizations?:  { name: string; tenants?: { name: string } }
  created_at:      string
}

export interface CreateContractDto {
  organization_id: string
  monthly_value:   number
  starts_at:       string
  ends_at?:        string
}

export function useContracts(organizationId?: string) {
  return useQuery({
    queryKey: ['admin', 'contracts', organizationId],
    queryFn:  () => {
      const qs = organizationId ? `?organizationId=${organizationId}` : ''
      return mgmt.get<Contract[]>(`/admin/contracts${qs}`)
    },
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateContractDto) => mgmt.post<Contract>('/admin/contracts', dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'contracts'] }),
  })
}

export function useUpdateContractStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      mgmt.patch<Contract>(`/admin/contracts/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contracts'] }),
  })
}

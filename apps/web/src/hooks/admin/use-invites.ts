import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mgmt } from '@/lib/management-api'

export interface Invite {
  id:         string
  tenant_id:  string
  token:      string
  used:       boolean
  expires_at: string
  created_at: string
}

export interface CreateInviteDto {
  tenant_id: string
}

export function useInvitesByTenant(tenantId: string) {
  return useQuery({
    queryKey: ['admin', 'invites', tenantId],
    queryFn:  () => mgmt.get<Invite[]>(`/admin/invites/tenant/${tenantId}`),
    enabled:  !!tenantId,
  })
}

export function useGenerateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInviteDto) => mgmt.post<Invite>('/admin/invites', dto),
    onSuccess:  (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['admin', 'invites', vars.tenant_id] }),
  })
}

export function useResendInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mgmt.post<Invite>(`/admin/invites/${id}/resend`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  })
}

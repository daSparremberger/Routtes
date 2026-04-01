import { useQuery } from '@tanstack/react-query'
import { mgmt } from '@/lib/management-api'

export interface AdminKpis {
  tenantsActive:    number
  tenantsNewLast30d: number
  tenantsSuspended: number
  alerts:           number
}

export interface CommercialKpis {
  activeContracts:   number
  monthlyRevenue:    number
  pendingInvoices:   number
  expiringContracts: unknown[]
}

export function useAdminKpis() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'kpis'],
    queryFn:  () => mgmt.get<AdminKpis>('/admin/dashboard'),
  })
}

export function useCommercialKpis() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'commercial'],
    queryFn:  () => mgmt.get<CommercialKpis>('/admin/dashboard/commercial'),
  })
}

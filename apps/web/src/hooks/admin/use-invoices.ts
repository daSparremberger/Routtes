import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mgmt } from '@/lib/management-api'

export interface Invoice {
  id:          string
  contract_id: string
  status:      'pending' | 'paid' | 'cancelled' | 'overdue'
  amount:      number
  due_date:    string
  paid_at:     string | null
  contracts?:  { organizations?: { name: string } }
  created_at:  string
}

export function useInvoices(status?: string, contractId?: string) {
  return useQuery({
    queryKey: ['admin', 'invoices', status, contractId],
    queryFn:  () => {
      const params = new URLSearchParams()
      if (status)     params.set('status', status)
      if (contractId) params.set('contractId', contractId)
      const qs = params.toString() ? `?${params}` : ''
      return mgmt.get<Invoice[]>(`/admin/invoices${qs}`)
    },
  })
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mgmt.patch<Invoice>(`/admin/invoices/${id}/pay`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'invoices'] }),
  })
}

export function useCancelInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mgmt.patch<Invoice>(`/admin/invoices/${id}/cancel`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'invoices'] }),
  })
}

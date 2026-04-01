import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface School {
  id:         string
  name:       string
  address?:   string
  neighborhood?: string
  city?:      string
  phone?:     string
  contactName?: string
  routes?:    { id: string }[]
  students?:  { id: string }[]
  createdAt?: string
}

export function useSchools() {
  return useQuery<School[]>({
    queryKey: ['schools'],
    queryFn:  () => api.get<School[]>('/schools'),
  })
}

export function useSchool(id: string) {
  return useQuery<School>({
    queryKey: ['schools', id],
    queryFn:  () => api.get<School>(`/schools/${id}`),
    enabled:  !!id,
  })
}

export function useCreateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<School>) => api.post<School>('/schools', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['schools'] }),
  })
}

export function useUpdateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<School> & { id: string }) =>
      api.patch<School>(`/schools/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  })
}

export function useDeleteSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/schools/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['schools'] }),
  })
}

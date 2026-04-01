import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Student {
  id:         string
  name:       string
  status:     'active' | 'inactive'
  school?:    { id: string; name: string }
  guardians?: { name: string; phone?: string }[]
  addresses?: { street: string; neighborhood?: string }[]
  routeId?:   string | null
  createdAt?: string
}

export function useStudents(schoolId?: string) {
  const path = schoolId ? `/students?schoolId=${schoolId}` : '/students'
  return useQuery<Student[]>({
    queryKey: ['students', schoolId],
    queryFn:  () => api.get<Student[]>(path),
  })
}

export function useStudent(id: string) {
  return useQuery<Student>({
    queryKey: ['students', id],
    queryFn:  () => api.get<Student>(`/students/${id}`),
    enabled:  !!id,
  })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Student>) => api.post<Student>('/students', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Student> & { id: string }) =>
      api.patch<Student>(`/students/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

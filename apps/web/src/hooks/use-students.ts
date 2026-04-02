import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface StudentApi {
  id: string
  name: string
  status: 'active' | 'inactive'
  shift?: string
  class_name?: string | null
  special_needs?: string | null
  monthly_value?: number | null
  contract_start?: string | null
  school_id?: string | null
  schools?: { name: string } | null
  student_guardians?: { id: string; name: string; phone?: string | null; email?: string | null; is_primary?: boolean }[]
  student_addresses?: { id: string; address: string; lat?: number | null; lng?: number | null }[]
  created_at?: string
}

export interface Student {
  id: string
  name: string
  status: 'active' | 'inactive'
  shift?: string
  className?: string | null
  specialNeeds?: string | null
  monthlyValue?: number | null
  contractStart?: string | null
  schoolId?: string | null
  school?: { name: string }
  guardians?: { id: string; name: string; phone?: string; email?: string; isPrimary?: boolean }[]
  addresses?: { id: string; street: string; neighborhood?: string; lat?: number | null; lng?: number | null }[]
  createdAt?: string
}

export interface StudentUpsertInput {
  name: string
  school_id: string
  shift: 'morning' | 'afternoon' | 'evening'
  class_name?: string
  special_needs?: string
  monthly_value?: number
  contract_start?: string
  status?: 'active' | 'inactive'
}

export interface StudentGuardianInput {
  name: string
  phone: string
  email?: string
  is_primary?: boolean
}

export interface StudentAddressInput {
  address: string
  lat: number
  lng: number
}

function mapStudent(student: StudentApi): Student {
  return {
    id: student.id,
    name: student.name,
    status: student.status,
    shift: student.shift,
    className: student.class_name,
    specialNeeds: student.special_needs,
    monthlyValue: student.monthly_value,
    contractStart: student.contract_start,
    schoolId: student.school_id,
    school: student.schools?.name ? { name: student.schools.name } : undefined,
    guardians: student.student_guardians?.map((guardian) => ({
      id: guardian.id,
      name: guardian.name,
      phone: guardian.phone ?? undefined,
      email: guardian.email ?? undefined,
      isPrimary: guardian.is_primary,
    })),
    addresses: student.student_addresses?.map((address) => ({
      id: address.id,
      street: address.address,
      lat: address.lat,
      lng: address.lng,
    })),
    createdAt: student.created_at,
  }
}

export function useStudents(schoolId?: string) {
  const path = schoolId ? `/students?schoolId=${schoolId}` : '/students'
  return useQuery<Student[]>({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      const data = await api.get<StudentApi[]>(path)
      return data.map(mapStudent)
    },
  })
}

export function useStudent(id: string) {
  return useQuery<Student>({
    queryKey: ['students', id],
    queryFn: async () => mapStudent(await api.get<StudentApi>(`/students/${id}`)),
    enabled: !!id,
  })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentUpsertInput) => api.post<StudentApi>('/students', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<StudentUpsertInput> & { id: string }) =>
      api.patch<StudentApi>(`/students/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useAddStudentGuardian() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: StudentGuardianInput & { id: string }) =>
      api.post(`/students/${id}/guardians`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useRemoveStudentGuardian() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, guardianId }: { id: string; guardianId: string }) =>
      api.delete(`/students/${id}/guardians/${guardianId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useAddStudentAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: StudentAddressInput & { id: string }) =>
      api.post(`/students/${id}/addresses`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useRemoveStudentAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, addressId }: { id: string; addressId: string }) =>
      api.delete(`/students/${id}/addresses/${addressId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

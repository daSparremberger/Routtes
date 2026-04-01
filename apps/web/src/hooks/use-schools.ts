import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface SchoolApi {
  id: string
  name: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  type?: 'school' | 'service_point'
  status?: 'active' | 'inactive'
  school_schedules?: { id: string; shift: string; entry_time: string; exit_time: string }[]
  school_contacts?: { id: string; name: string; role?: string | null; phone?: string | null; email?: string | null }[]
  created_at?: string
}

export interface School {
  id: string
  name: string
  address?: string
  lat?: number | null
  lng?: number | null
  type?: 'school' | 'service_point'
  status?: 'active' | 'inactive'
  contacts?: { id: string; name: string; role?: string; phone?: string; email?: string }[]
  schedules?: { id: string; shift: string; entryTime: string; exitTime: string }[]
  createdAt?: string
}

export interface SchoolUpsertInput {
  name: string
  address?: string
  lat?: number
  lng?: number
  type: 'school' | 'service_point'
  status?: 'active' | 'inactive'
}

function mapSchool(school: SchoolApi): School {
  return {
    id: school.id,
    name: school.name,
    address: school.address ?? undefined,
    lat: school.lat,
    lng: school.lng,
    type: school.type,
    status: school.status,
    contacts: school.school_contacts?.map((contact) => ({
      id: contact.id,
      name: contact.name,
      role: contact.role ?? undefined,
      phone: contact.phone ?? undefined,
      email: contact.email ?? undefined,
    })),
    schedules: school.school_schedules?.map((schedule) => ({
      id: schedule.id,
      shift: schedule.shift,
      entryTime: schedule.entry_time,
      exitTime: schedule.exit_time,
    })),
    createdAt: school.created_at,
  }
}

export function useSchools() {
  return useQuery<School[]>({
    queryKey: ['schools'],
    queryFn: async () => {
      const data = await api.get<SchoolApi[]>('/schools')
      return data.map(mapSchool)
    },
  })
}

export function useSchool(id: string) {
  return useQuery<School>({
    queryKey: ['schools', id],
    queryFn: async () => mapSchool(await api.get<SchoolApi>(`/schools/${id}`)),
    enabled: !!id,
  })
}

export function useCreateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SchoolUpsertInput) => api.post<SchoolApi>('/schools', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  })
}

export function useUpdateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SchoolUpsertInput> & { id: string }) =>
      api.patch<SchoolApi>(`/schools/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  })
}

export function useDeleteSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/schools/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  })
}

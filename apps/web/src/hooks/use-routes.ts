import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'

interface RouteApi {
  id: string
  name: string
  shift?: string
  status?: string
  driver_id?: string | null
  vehicle_id?: string | null
  route_type?: string | null
  estimated_departure_time?: string | null
  route_stops?: { id: string; student_id?: string | null; school_id?: string | null }[]
  created_at?: string
}

export interface Route {
  id: string
  name: string
  shift?: string
  status?: string
  driverId?: string | null
  vehicleId?: string | null
  routeType?: string | null
  estimatedDepartureTime?: string | null
  stops?: { id: string; studentId?: string | null; schoolId?: string | null }[]
  studentsCount?: number
  createdAt?: string
}

export interface RouteUpsertInput {
  name: string
  shift: 'morning' | 'afternoon' | 'evening'
  driver_id: string
  vehicle_id: string
  route_type?: 'fixed' | 'variable'
}

function mapRoute(route: RouteApi): Route {
  return {
    id: route.id,
    name: route.name,
    shift: route.shift,
    status: route.status,
    driverId: route.driver_id,
    vehicleId: route.vehicle_id,
    routeType: route.route_type,
    estimatedDepartureTime: route.estimated_departure_time,
    stops: route.route_stops?.map((stop) => ({
      id: stop.id,
      studentId: stop.student_id,
      schoolId: stop.school_id,
    })),
    studentsCount: route.route_stops?.length ?? 0,
    createdAt: route.created_at,
  }
}

export function useRoutes(shift?: string) {
  const path = shift ? `/routes?shift=${shift}` : '/routes'
  return useQuery<Route[]>({
    queryKey: ['routes', shift],
    queryFn: async () => {
      const data = await api.get<RouteApi[]>(path)
      return data.map(mapRoute)
    },
  })
}

export function useRoute(id: string) {
  return useQuery<Route>({
    queryKey: ['routes', id],
    queryFn: async () => mapRoute(await api.get<RouteApi>(`/routes/${id}`)),
    enabled: !!id,
  })
}

export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RouteUpsertInput) => api.post<RouteApi>('/routes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useUpdateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RouteUpsertInput> & { id: string }) =>
      api.patch<RouteApi>(`/routes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/routes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useRoutesList(options?: { shift?: string }) {
  const { shift } = options ?? {}
  return useInfiniteQuery<PaginatedResponse<Route>>({
    queryKey: ['routes-list', shift],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (shift) params.set('shift', shift)
      const raw = await api.get<{ data: RouteApi[]; total: number; page: number; limit: number; hasMore: boolean }>(
        `/routes/paginated?${params}`,
      )
      return { ...raw, data: raw.data.map(mapRoute) }
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  })
}

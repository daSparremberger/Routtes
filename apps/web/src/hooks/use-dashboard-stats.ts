import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Student }  from './use-students'
import type { Driver }   from './use-drivers'
import type { Route }    from './use-routes'
import type { Vehicle }  from './use-vehicles'

export interface DashboardStats {
  totalStudents:   number
  activeStudents:  number
  totalRoutes:     number
  activeRoutes:    number
  totalDrivers:    number
  onlineDrivers:   number
  totalVehicles:   number
  isLoading:       boolean
}

export function useDashboardStats(): DashboardStats {
  const results = useQueries({
    queries: [
      { queryKey: ['students'],   queryFn: () => api.get<Student[]>('/students').catch(() => []) },
      { queryKey: ['routes'],     queryFn: () => api.get<Route[]>('/routes').catch(() => []) },
      { queryKey: ['drivers'],    queryFn: () => api.get<Driver[]>('/drivers').catch(() => []) },
      { queryKey: ['vehicles'],   queryFn: () => api.get<Vehicle[]>('/vehicles').catch(() => []) },
    ],
  })

  const [studentsQ, routesQ, driversQ, vehiclesQ] = results
  const isLoading = results.some((r) => r.isLoading)

  const students = (studentsQ.data ?? []) as Student[]
  const routes   = (routesQ.data   ?? []) as Route[]
  const drivers  = (driversQ.data  ?? []) as Driver[]
  const vehicles = (vehiclesQ.data ?? []) as Vehicle[]

  return {
    totalStudents:   students.length,
    activeStudents:  students.filter((s) => s.status === 'active').length,
    totalRoutes:     routes.length,
    activeRoutes:    routes.filter((r) => r.status === 'active' || r.status === 'approved').length,
    totalDrivers:    drivers.length,
    onlineDrivers:   drivers.filter((d) => d.status === 'active').length,
    totalVehicles:   vehicles.length,
    isLoading,
  }
}

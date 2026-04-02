import { useStats } from './use-stats'

export interface DashboardStats {
  totalStudents:  number
  activeStudents: number
  totalRoutes:    number
  activeRoutes:   number
  totalDrivers:   number
  onlineDrivers:  number
  totalVehicles:  number
  isLoading:      boolean
}

export function useDashboardStats(): DashboardStats {
  const { data, isLoading } = useStats()

  return {
    totalStudents:  data?.students.total  ?? 0,
    activeStudents: data?.students.active ?? 0,
    totalRoutes:    data?.routes.total    ?? 0,
    activeRoutes:   data?.routes.active   ?? 0,
    totalDrivers:   data?.drivers.total   ?? 0,
    onlineDrivers:  data?.drivers.active  ?? 0,
    totalVehicles:  data?.vehicles.total  ?? 0,
    isLoading,
  }
}

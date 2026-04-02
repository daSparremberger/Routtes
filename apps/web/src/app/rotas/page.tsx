'use client'

import { useMemo, useState } from 'react'
import { useShellConfig } from '@/components/layout/shell-context'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { EntityFormModal } from '@/components/entity-form-modal'
import { Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import {
  useCreateRoute,
  useDeleteRoute,
  useRoutes,
  useUpdateRoute,
  type Route,
  type RouteUpsertInput,
} from '@/hooks/use-routes'
import { useDrivers } from '@/hooks/use-drivers'
import { useVehicles } from '@/hooks/use-vehicles'
import { Car, Clock, Route as RouteIcon, Truck, Workflow } from 'lucide-react'

interface RouteItem extends MasterItem {
  _raw: Route
}

interface RouteFormState {
  name: string
  shift: 'morning' | 'afternoon' | 'evening'
  driver_id: string
  vehicle_id: string
  route_type: 'fixed' | 'variable'
}

const EMPTY_FORM: RouteFormState = {
  name: '',
  shift: 'morning',
  driver_id: '',
  vehicle_id: '',
  route_type: 'fixed',
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível salvar a rota.'
}

function toPayload(form: RouteFormState): RouteUpsertInput {
  return {
    name: form.name.trim(),
    shift: form.shift,
    driver_id: form.driver_id,
    vehicle_id: form.vehicle_id,
    route_type: form.route_type,
  }
}

export default function RotasPage() {
  const [search, setSearch] = useState('')
  useShellConfig({ title: 'Rotas', searchValue: search, onSearchChange: setSearch })
  const [form, setForm] = useState<RouteFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<Route | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const routes = useRoutes()
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const createRoute = useCreateRoute()
  const updateRoute = useUpdateRoute()
  const deleteRoute = useDeleteRoute()

  const driverMap = useMemo(
    () => new Map((drivers.data ?? []).map((driver) => [driver.id, driver])),
    [drivers.data],
  )
  const vehicleMap = useMemo(
    () => new Map((vehicles.data ?? []).map((vehicle) => [vehicle.id, vehicle])),
    [vehicles.data],
  )

  const items = useMemo<RouteItem[]>(
    () =>
      (routes.data ?? []).map((route) => ({
        id: route.id,
        title: route.name,
        subtitle: `${route.studentsCount ?? 0} parada${route.studentsCount === 1 ? '' : 's'}`,
        badge: route.status ?? 'draft',
        badgeVariant: route.status === 'approved' ? 'active' : route.status === 'inactive' ? 'default' : 'warn',
        _raw: route,
      })),
    [routes.data],
  )

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(route: Route) {
    setEditing(route)
    setForm({
      name: route.name,
      shift: (route.shift as RouteFormState['shift']) ?? 'morning',
      driver_id: route.driverId ?? '',
      vehicle_id: route.vehicleId ?? '',
      route_type: (route.routeType as RouteFormState['route_type']) ?? 'fixed',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.driver_id || !form.vehicle_id) {
      setFormError('Nome, motorista e veículo são obrigatórios.')
      return
    }

    try {
      setFormError(null)
      const payload = toPayload(form)
      if (editing) {
        await updateRoute.mutateAsync({ id: editing.id, ...payload })
      } else {
        await createRoute.mutateAsync(payload)
      }
      setModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function handleDelete(route: Route) {
    if (!window.confirm(`Arquivar a rota "${route.name}"?`)) return
    await deleteRoute.mutateAsync(route.id)
  }

  return (
    <>
      <MasterDetail
        items={items}
        isLoading={routes.isLoading}
        search={search}
        headerDescription="Monte as rotas da operacao com motorista, veiculo, turno e tipo de atendimento para organizar a execucao do dia."
        newLabel="Nova rota"
        emptyText="Nenhuma rota cadastrada."
        onNew={openCreate}
        onEdit={(item) => openEdit(item._raw)}
        onDelete={(item) => handleDelete(item._raw)}
        renderDetail={(item) => {
          const route = item._raw
          const driver = route.driverId ? driverMap.get(route.driverId) : undefined
          const vehicle = route.vehicleId ? vehicleMap.get(route.vehicleId) : undefined
          return (
            <>
              <DetailRow label="Motorista" value={driver?.name} icon={<Truck size={18} />} />
              <DetailRow label="Veículo" value={vehicle?.licensePlate} icon={<Car size={18} />} />
              <DetailRow label="Turno" value={formatShift(route.shift)} icon={<Clock size={18} />} />
              <DetailRow label="Tipo" value={route.routeType === 'variable' ? 'Variável' : 'Fixa'} icon={<Workflow size={18} />} />
              <DetailRow label="Paradas" value={route.studentsCount != null ? String(route.studentsCount) : undefined} icon={<RouteIcon size={18} />} />
            </>
          )
        }}
      />

      <EntityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar rota' : 'Nova rota'}
        description="Os campos obrigatórios seguem o DTO atual de rotas."
        onSubmit={handleSubmit}
        submitting={createRoute.isPending || updateRoute.isPending}
        submitLabel={editing ? 'Salvar alterações' : 'Criar rota'}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required />
          <Select label="Turno" value={form.shift} onChange={(e) => setForm((current) => ({ ...current, shift: e.target.value as RouteFormState['shift'] }))}>
            <option value="morning">Manhã</option>
            <option value="afternoon">Tarde</option>
            <option value="evening">Noite</option>
          </Select>
          <Select label="Motorista" value={form.driver_id} onChange={(e) => setForm((current) => ({ ...current, driver_id: e.target.value }))} required>
            <option value="">Selecione</option>
            {drivers.data?.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </Select>
          <Select label="Veículo" value={form.vehicle_id} onChange={(e) => setForm((current) => ({ ...current, vehicle_id: e.target.value }))} required>
            <option value="">Selecione</option>
            {vehicles.data?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.licensePlate}
              </option>
            ))}
          </Select>
          <Select label="Tipo de rota" value={form.route_type} onChange={(e) => setForm((current) => ({ ...current, route_type: e.target.value as RouteFormState['route_type'] }))}>
            <option value="fixed">Fixa</option>
            <option value="variable">Variável</option>
          </Select>
        </div>
      </EntityFormModal>
    </>
  )
}

function formatShift(shift?: string) {
  if (shift === 'morning') return 'Manhã'
  if (shift === 'afternoon') return 'Tarde'
  if (shift === 'evening') return 'Noite'
  return shift
}

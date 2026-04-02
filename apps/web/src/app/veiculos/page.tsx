'use client'

import { useMemo, useState } from 'react'
import { Car, Hash, Truck, Users } from 'lucide-react'
import { useShellConfig } from '@/components/layout/shell-context'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { EntityFormModal } from '@/components/entity-form-modal'
import { Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehiclesList,
  type Vehicle,
  type VehicleUpsertInput,
} from '@/hooks/use-vehicles'

interface VehicleItem extends MasterItem {
  _raw: Vehicle
}

interface VehicleFormState {
  plate: string
  capacity: string
  model: string
  totem_id: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: VehicleFormState = {
  plate: '',
  capacity: '',
  model: '',
  totem_id: '',
  status: 'active',
}

function toItem(vehicle: Vehicle): VehicleItem {
  return {
    id: vehicle.id,
    title: vehicle.licensePlate,
    subtitle: vehicle.model ?? 'Sem modelo',
    badge: vehicle.status === 'active' ? 'Ativo' : 'Inativo',
    badgeVariant: vehicle.status === 'active' ? 'active' : 'default',
    _raw: vehicle,
  }
}

function toFormState(vehicle?: Vehicle): VehicleFormState {
  if (!vehicle) return EMPTY_FORM
  return {
    plate: vehicle.licensePlate,
    capacity: vehicle.capacity != null ? String(vehicle.capacity) : '',
    model: vehicle.model ?? '',
    totem_id: vehicle.totemId ?? '',
    status: vehicle.status === 'inactive' ? 'inactive' : 'active',
  }
}

function toPayload(form: VehicleFormState): VehicleUpsertInput {
  return {
    plate: form.plate.trim(),
    capacity: Number(form.capacity),
    model: form.model.trim() || undefined,
    totem_id: form.totem_id.trim() || undefined,
    status: form.status,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Nao foi possivel salvar o veiculo.'
}

export default function VeiculosPage() {
  const [search, setSearch] = useState('')
  useShellConfig({ title: 'Veiculos', searchValue: search, onSearchChange: setSearch })
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const vehiclesList = useVehiclesList()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const deleteVehicle = useDeleteVehicle()
  const items = useMemo(
    () => (vehiclesList.data?.pages.flatMap((p) => p.data) ?? []).map(toItem),
    [vehiclesList.data],
  )

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle)
    setForm(toFormState(vehicle))
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.plate.trim() || !form.capacity || Number(form.capacity) <= 0) {
      setFormError('Placa e capacidade valida sao obrigatorias.')
      return
    }

    try {
      setFormError(null)
      const payload = toPayload(form)
      if (editing) {
        await updateVehicle.mutateAsync({ id: editing.id, ...payload })
      } else {
        await createVehicle.mutateAsync(payload)
      }
      setModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    if (!window.confirm(`Arquivar o veiculo "${vehicle.licensePlate}"?`)) return
    await deleteVehicle.mutateAsync(vehicle.id)
  }

  return (
    <>
      <MasterDetail
        items={items}
        isLoading={vehiclesList.isLoading}
        onLoadMore={() => vehiclesList.fetchNextPage()}
        hasMore={vehiclesList.hasNextPage ?? false}
        isFetchingMore={vehiclesList.isFetchingNextPage}
        search={search}
        headerDescription="Registre os veiculos da frota com placa, capacidade, modelo e identificadores usados na operacao."
        newLabel="Novo veiculo"
        emptyText="Nenhum veiculo cadastrado."
        onNew={openCreate}
        onEdit={(item) => openEdit(item._raw)}
        onDelete={(item) => handleDelete(item._raw)}
        renderDetail={(item) => {
          const vehicle = item._raw
          return (
            <>
              <DetailRow label="Placa" value={vehicle.licensePlate} icon={<Car size={18} />} />
              <DetailRow label="Capacidade" value={vehicle.capacity ? `${vehicle.capacity} lugares` : undefined} icon={<Users size={18} />} />
              <DetailRow label="Modelo" value={vehicle.model} icon={<Truck size={18} />} />
              <DetailRow label="Totem" value={vehicle.totemId} icon={<Hash size={18} />} />
            </>
          )
        }}
      />

      <EntityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar veiculo' : 'Novo veiculo'}
        description="Cadastro compacto com os campos principais da frota."
        onSubmit={handleSubmit}
        submitting={createVehicle.isPending || updateVehicle.isPending}
        submitLabel={editing ? 'Salvar alteracoes' : 'Criar veiculo'}
        error={formError}
        modalClassName="max-w-2xl h-[72vh]"
        contentClassName="space-y-5"
        footerClassName="flex justify-end gap-3 border-t border-white/[0.06] pt-4"
      >
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Dados do veiculo</p>
            <p className="mt-1 text-xs text-ink-muted">Estrutura inspirada no modal de referencia, com campos curtos e agrupados.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Placa"
              value={form.plate}
              onChange={(e) => setForm((current) => ({ ...current, plate: e.target.value.toUpperCase() }))}
              required
            />
            <Input
              label="Modelo"
              value={form.model}
              onChange={(e) => setForm((current) => ({ ...current, model: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Capacidade"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((current) => ({ ...current, capacity: e.target.value }))}
              required
            />
            <Input
              label="Totem ID"
              value={form.totem_id}
              onChange={(e) => setForm((current) => ({ ...current, totem_id: e.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as VehicleFormState['status'] }))}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Select>
          </div>
        </section>
      </EntityFormModal>
    </>
  )
}

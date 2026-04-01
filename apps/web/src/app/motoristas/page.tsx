'use client'

import { useMemo, useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { EntityFormModal } from '@/components/entity-form-modal'
import { Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import {
  useCreateDriver,
  useDeleteDriver,
  useDrivers,
  useUpdateDriver,
  type Driver,
  type DriverUpsertInput,
} from '@/hooks/use-drivers'
import { Calendar, Mail, Shield, User } from 'lucide-react'

interface DriverItem extends MasterItem {
  _raw: Driver
}

interface DriverFormState {
  name: string
  email: string
  cnh: string
  cnh_validity: string
  cnh_category: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: DriverFormState = {
  name: '',
  email: '',
  cnh: '',
  cnh_validity: '',
  cnh_category: '',
  status: 'active',
}

function toItem(driver: Driver): DriverItem {
  return {
    id: driver.id,
    title: driver.name,
    subtitle: driver.email ?? 'Sem e-mail',
    badge: driver.status === 'active' ? 'Online' : 'Offline',
    badgeVariant: driver.status === 'active' ? 'active' : 'default',
    _raw: driver,
  }
}

function toFormState(driver?: Driver): DriverFormState {
  if (!driver) return EMPTY_FORM
  return {
    name: driver.name,
    email: driver.email ?? '',
    cnh: driver.cnh ?? '',
    cnh_validity: driver.cnhValidity ? driver.cnhValidity.slice(0, 10) : '',
    cnh_category: driver.licenseCategory ?? '',
    status: driver.status,
  }
}

function toPayload(form: DriverFormState): DriverUpsertInput {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    cnh: form.cnh.trim() || undefined,
    cnh_validity: form.cnh_validity || undefined,
    cnh_category: form.cnh_category.trim() || undefined,
    status: form.status,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível salvar o motorista.'
}

export default function MotoristasPage() {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<DriverFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useDrivers()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const deleteDriver = useDeleteDriver()
  const items = useMemo(() => (data ?? []).map(toItem), [data])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(driver: Driver) {
    setEditing(driver)
    setForm(toFormState(driver))
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.')
      return
    }

    try {
      setFormError(null)
      const payload = toPayload(form)
      if (editing) {
        await updateDriver.mutateAsync({ id: editing.id, ...payload })
      } else {
        await createDriver.mutateAsync(payload)
      }
      setModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function handleDelete(driver: Driver) {
    if (!window.confirm(`Arquivar o motorista "${driver.name}"?`)) return
    await deleteDriver.mutateAsync(driver.id)
  }

  return (
    <Shell title="Motoristas" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Motoristas"
        newLabel="Novo motorista"
        emptyText="Nenhum motorista cadastrado."
        onNew={openCreate}
        onEdit={(item) => openEdit(item._raw)}
        onDelete={(item) => handleDelete(item._raw)}
        renderDetail={(item) => {
          const driver = item._raw
          return (
            <>
              <DetailRow label="E-mail" value={driver.email} icon={<Mail size={18} />} />
              <DetailRow label="CNH" value={driver.cnh} icon={<Shield size={18} />} />
              <DetailRow label="Categoria" value={driver.licenseCategory} icon={<User size={18} />} />
              <DetailRow label="Validade da CNH" value={formatDate(driver.cnhValidity)} icon={<Calendar size={18} />} />
            </>
          )
        }}
      />

      <EntityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar motorista' : 'Novo motorista'}
        description="Os dados são enviados diretamente para a API operacional."
        onSubmit={handleSubmit}
        submitting={createDriver.isPending || updateDriver.isPending}
        submitLabel={editing ? 'Salvar alterações' : 'Criar motorista'}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} required />
          <Input label="CNH" value={form.cnh} onChange={(e) => setForm((current) => ({ ...current, cnh: e.target.value }))} />
          <Input label="Categoria" value={form.cnh_category} onChange={(e) => setForm((current) => ({ ...current, cnh_category: e.target.value }))} />
          <Input label="Validade da CNH" type="date" value={form.cnh_validity} onChange={(e) => setForm((current) => ({ ...current, cnh_validity: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as DriverFormState['status'] }))}>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>
        </div>
      </EntityFormModal>
    </Shell>
  )
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : undefined
}

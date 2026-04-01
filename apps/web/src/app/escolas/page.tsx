'use client'

import { useMemo, useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { EntityFormModal } from '@/components/entity-form-modal'
import { Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import {
  useCreateSchool,
  useDeleteSchool,
  useSchools,
  useUpdateSchool,
  type School,
  type SchoolUpsertInput,
} from '@/hooks/use-schools'
import { Building2, MapPin, Phone, User } from 'lucide-react'

interface SchoolItem extends MasterItem {
  _raw: School
}

interface SchoolFormState {
  name: string
  address: string
  type: 'school' | 'service_point'
  lat: string
  lng: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: SchoolFormState = {
  name: '',
  address: '',
  type: 'school',
  lat: '',
  lng: '',
  status: 'active',
}

function toItem(school: School): SchoolItem {
  return {
    id: school.id,
    title: school.name,
    subtitle: school.address ?? 'Sem endereço',
    badge: school.type === 'service_point' ? 'Ponto' : 'Escola',
    _raw: school,
  }
}

function toFormState(school?: School): SchoolFormState {
  if (!school) return EMPTY_FORM
  return {
    name: school.name,
    address: school.address ?? '',
    type: school.type ?? 'school',
    lat: school.lat != null ? String(school.lat) : '',
    lng: school.lng != null ? String(school.lng) : '',
    status: school.status ?? 'active',
  }
}

function toPayload(form: SchoolFormState): SchoolUpsertInput {
  return {
    name: form.name.trim(),
    address: form.address.trim() || undefined,
    type: form.type,
    lat: form.lat ? Number(form.lat) : undefined,
    lng: form.lng ? Number(form.lng) : undefined,
    status: form.status,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível salvar a escola.'
}

export default function EscolasPage() {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<SchoolFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<School | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useSchools()
  const createSchool = useCreateSchool()
  const updateSchool = useUpdateSchool()
  const deleteSchool = useDeleteSchool()
  const items = useMemo(() => (data ?? []).map(toItem), [data])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(school: School) {
    setEditing(school)
    setForm(toFormState(school))
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório.')
      return
    }

    try {
      setFormError(null)
      const payload = toPayload(form)
      if (editing) {
        await updateSchool.mutateAsync({ id: editing.id, ...payload })
      } else {
        await createSchool.mutateAsync(payload)
      }
      setModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function handleDelete(school: School) {
    if (!window.confirm(`Arquivar a escola "${school.name}"?`)) return
    await deleteSchool.mutateAsync(school.id)
  }

  return (
    <Shell title="Escolas" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Escolas"
        newLabel="Nova escola"
        emptyText="Nenhuma escola cadastrada."
        onNew={openCreate}
        onEdit={(item) => openEdit(item._raw)}
        onDelete={(item) => handleDelete(item._raw)}
        renderDetail={(item) => {
          const school = item._raw
          return (
            <>
              <DetailRow label="Endereço" value={school.address} icon={<MapPin size={18} />} />
              <DetailRow label="Tipo" value={school.type === 'service_point' ? 'Ponto de serviço' : 'Escola'} icon={<Building2 size={18} />} />
              <DetailRow label="Contato" value={school.contacts?.[0]?.name} icon={<User size={18} />} />
              <DetailRow label="Telefone" value={school.contacts?.[0]?.phone} icon={<Phone size={18} />} />
            </>
          )
        }}
      />

      <EntityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar escola' : 'Nova escola'}
        description="Os campos enviados seguem o DTO atual da API."
        onSubmit={handleSubmit}
        submitting={createSchool.isPending || updateSchool.isPending}
        submitLabel={editing ? 'Salvar alterações' : 'Criar escola'}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required />
          <Select label="Tipo" value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value as SchoolFormState['type'] }))}>
            <option value="school">Escola</option>
            <option value="service_point">Ponto de serviço</option>
          </Select>
          <div className="md:col-span-2">
            <Input label="Endereço" value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} />
          </div>
          <Input label="Latitude" type="number" step="any" value={form.lat} onChange={(e) => setForm((current) => ({ ...current, lat: e.target.value }))} />
          <Input label="Longitude" type="number" step="any" value={form.lng} onChange={(e) => setForm((current) => ({ ...current, lng: e.target.value }))} />
        </div>
      </EntityFormModal>
    </Shell>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Building2, Clock3, MapPin, Phone, Plus, Search, Trash2, User } from 'lucide-react'
import { useShellConfig } from '@/components/layout/shell-context'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { EntityFormModal } from '@/components/entity-form-modal'
import { Input } from '@/components/ui'
import { ApiError } from '@/lib/api'
import {
  useAddSchoolContact,
  useAddSchoolSchedule,
  useCreateSchool,
  useDeleteSchool,
  useRemoveSchoolContact,
  useRemoveSchoolSchedule,
  useSchoolsList,
  useUpdateSchool,
  type School,
  type SchoolContactInput,
  type SchoolScheduleInput,
  type SchoolUpsertInput,
} from '@/hooks/use-schools'

interface SchoolItem extends MasterItem {
  _raw: School
}

interface ContactFormState {
  id?: string
  role: string
  name: string
  phone: string
}

interface ShiftFormState {
  enabled: boolean
  entry_time: string
  exit_time: string
}

interface SchoolFormState {
  name: string
  address_search: string
  type: 'school' | 'service_point'
  lat: string
  lng: string
  status: 'active' | 'inactive'
  shifts: Record<'morning' | 'afternoon' | 'evening', ShiftFormState>
  contacts: ContactFormState[]
}

const EMPTY_SHIFT: ShiftFormState = {
  enabled: false,
  entry_time: '',
  exit_time: '',
}

const EMPTY_CONTACT: ContactFormState = {
  role: '',
  name: '',
  phone: '',
}

const EMPTY_FORM: SchoolFormState = {
  name: '',
  address_search: '',
  type: 'school',
  lat: '',
  lng: '',
  status: 'active',
  shifts: {
    morning: { ...EMPTY_SHIFT },
    afternoon: { ...EMPTY_SHIFT },
    evening: { ...EMPTY_SHIFT },
  },
  contacts: [],
}

function toItem(school: School): SchoolItem {
  return {
    id: school.id,
    title: school.name,
    subtitle: school.address ?? 'Sem endereco',
    badge: school.type === 'service_point' ? 'Ponto' : 'Escola',
    _raw: school,
  }
}

function toFormState(school?: School): SchoolFormState {
  if (!school) return EMPTY_FORM

  const shifts: SchoolFormState['shifts'] = {
    morning: { ...EMPTY_SHIFT },
    afternoon: { ...EMPTY_SHIFT },
    evening: { ...EMPTY_SHIFT },
  }

  school.schedules?.forEach((schedule) => {
    if (schedule.shift === 'morning' || schedule.shift === 'afternoon' || schedule.shift === 'evening') {
      shifts[schedule.shift] = {
        enabled: true,
        entry_time: schedule.entryTime ?? '',
        exit_time: schedule.exitTime ?? '',
      }
    }
  })

  return {
    name: school.name,
    address_search: school.address ?? '',
    type: school.type ?? 'school',
    lat: school.lat != null ? String(school.lat) : '',
    lng: school.lng != null ? String(school.lng) : '',
    status: school.status ?? 'active',
    shifts,
    contacts:
      school.contacts?.length
        ? school.contacts.map((contact) => ({
            id: contact.id,
            role: contact.role ?? '',
            name: contact.name,
            phone: contact.phone ?? '',
          }))
        : [],
  }
}

function toPayload(form: SchoolFormState): SchoolUpsertInput {
  return {
    name: form.name.trim(),
    address: form.address_search.trim() || undefined,
    type: form.type,
    lat: form.lat ? Number(form.lat) : undefined,
    lng: form.lng ? Number(form.lng) : undefined,
    status: form.status,
  }
}

function getSchedulePayloads(form: SchoolFormState): SchoolScheduleInput[] {
  return (['morning', 'afternoon', 'evening'] as const)
    .filter((shift) => form.shifts[shift].enabled)
    .map((shift) => ({
      shift,
      entry_time: form.shifts[shift].entry_time,
      exit_time: form.shifts[shift].exit_time,
    }))
}

function getContactPayloads(form: SchoolFormState): SchoolContactInput[] {
  return form.contacts
    .filter((contact) => contact.name.trim() || contact.role.trim() || contact.phone.trim())
    .map((contact) => ({
      name: contact.name.trim(),
      role: contact.role.trim() || undefined,
      phone: contact.phone.trim() || undefined,
    }))
    .filter((contact) => contact.name)
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Nao foi possivel salvar a escola.'
}

export default function EscolasPage() {
  const [search, setSearch] = useState('')
  useShellConfig({ title: 'Escolas', searchValue: search, onSearchChange: setSearch })

  const [form, setForm] = useState<SchoolFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<School | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const schoolsList = useSchoolsList()
  const createSchool = useCreateSchool()
  const updateSchool = useUpdateSchool()
  const deleteSchool = useDeleteSchool()
  const addSchedule = useAddSchoolSchedule()
  const removeSchedule = useRemoveSchoolSchedule()
  const addContact = useAddSchoolContact()
  const removeContact = useRemoveSchoolContact()
  const items = useMemo(
    () => (schoolsList.data?.pages.flatMap((p) => p.data) ?? []).map(toItem),
    [schoolsList.data],
  )

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

  function updateShift(shift: 'morning' | 'afternoon' | 'evening', value: Partial<ShiftFormState>) {
    setForm((current) => ({
      ...current,
      shifts: {
        ...current.shifts,
        [shift]: { ...current.shifts[shift], ...value },
      },
    }))
  }

  function updateContact(index: number, value: Partial<ContactFormState>) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, ...value } : contact,
      ),
    }))
  }

  function addContactField() {
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, { ...EMPTY_CONTACT }],
    }))
  }

  function removeContactField(index: number) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.filter((_, i) => i !== index),
    }))
  }

  async function syncSchedules(schoolId: string) {
    if (editing?.schedules?.length) {
      await Promise.all(
        editing.schedules.map((schedule) =>
          removeSchedule.mutateAsync({ id: schoolId, scheduleId: schedule.id }),
        ),
      )
    }

    const schedules = getSchedulePayloads(form)
    if (schedules.some((schedule) => !schedule.entry_time || !schedule.exit_time)) {
      throw new Error('Preencha inicio e termino dos turnos ativados.')
    }

    await Promise.all(
      schedules.map((schedule) =>
        addSchedule.mutateAsync({ id: schoolId, ...schedule }),
      ),
    )
  }

  async function syncContacts(schoolId: string) {
    if (editing?.contacts?.length) {
      await Promise.all(
        editing.contacts.map((contact) =>
          removeContact.mutateAsync({ id: schoolId, contactId: contact.id }),
        ),
      )
    }

    const contacts = getContactPayloads(form)
    await Promise.all(
      contacts.map((contact) =>
        addContact.mutateAsync({ id: schoolId, ...contact }),
      ),
    )
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError('Nome da escola e obrigatorio.')
      return
    }

    try {
      setFormError(null)
      const payload = toPayload(form)
      const school = editing
        ? await updateSchool.mutateAsync({ id: editing.id, ...payload })
        : await createSchool.mutateAsync(payload)

      await syncSchedules(school.id)
      await syncContacts(school.id)
      setModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function handleDelete(school: School) {
    if (!window.confirm(`Arquivar a escola "${school.name}"?`)) return
    await deleteSchool.mutateAsync(school.id)
  }

  const submitting =
    createSchool.isPending ||
    updateSchool.isPending ||
    addSchedule.isPending ||
    removeSchedule.isPending ||
    addContact.isPending ||
    removeContact.isPending

  return (
    <>
      <MasterDetail
        items={items}
        isLoading={schoolsList.isLoading}
        onLoadMore={() => schoolsList.fetchNextPage()}
        hasMore={schoolsList.hasNextPage ?? false}
        isFetchingMore={schoolsList.isFetchingNextPage}
        search={search}
        headerDescription="Adicione as escolas atendidas pela operacao e mantenha pontos de servico, localizacao e contatos sempre atualizados."
        newLabel="Nova escola"
        emptyText="Nenhuma escola cadastrada."
        onNew={openCreate}
        onEdit={(item) => openEdit(item._raw)}
        onDelete={(item) => handleDelete(item._raw)}
        renderDetail={(item) => {
          const school = item._raw
          const scheduleText = school.schedules
            ?.map((schedule) => `${formatShift(schedule.shift)} ${schedule.entryTime} - ${schedule.exitTime}`)
            .join(' • ')

          return (
            <>
              <DetailRow label="Endereco" value={school.address} icon={<MapPin size={18} />} />
              <DetailRow label="Tipo" value={school.type === 'service_point' ? 'Ponto de servico' : 'Escola'} icon={<Building2 size={18} />} />
              <DetailRow label="Turnos" value={scheduleText} icon={<Clock3 size={18} />} />
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
        description="Cadastre a escola, turnos atendidos e contatos principais da operacao."
        modalClassName="max-w-2xl h-[72vh]"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={editing ? 'Salvar alteracoes' : 'Criar escola'}
        error={formError}
        contentClassName="space-y-5"
        footerClassName="flex justify-end gap-3 border-t border-white/[0.06] pt-4"
      >
        <div className="space-y-5">
          <div className="grid gap-4">
            <Input
              label="Nome da escola"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              required
            />
            <Input
              label="Endereco da escola"
              value={form.address_search}
              onChange={(e) => setForm((current) => ({ ...current, address_search: e.target.value }))}
              placeholder="Pesquise o endereco da escola"
              icon={<Search size={16} />}
            />
          </div>

          <section className="space-y-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-ink-primary">Turnos</p>
              <p className="mt-1 text-sm text-ink-muted">Selecione os turnos atendidos e informe inicio e termino.</p>
            </div>

            <div className="space-y-4">
              {([
                { id: 'morning', label: 'Manha' },
                { id: 'afternoon', label: 'Tarde' },
                { id: 'evening', label: 'Noite' },
              ] as const).map((shift) => (
                <div key={shift.id}>
                  <label className="flex items-center gap-3 text-sm font-medium text-ink-primary">
                    <input
                      type="checkbox"
                      checked={form.shifts[shift.id].enabled}
                      onChange={(e) =>
                        updateShift(shift.id, {
                          enabled: e.target.checked,
                          entry_time: e.target.checked ? form.shifts[shift.id].entry_time : '',
                          exit_time: e.target.checked ? form.shifts[shift.id].exit_time : '',
                        })
                      }
                      className="h-4 w-4 accent-[#f7af27]"
                    />
                    {shift.label}
                  </label>

                  {form.shifts[shift.id].enabled ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Input
                        label="Inicio"
                        type="time"
                        value={form.shifts[shift.id].entry_time}
                        onChange={(e) => updateShift(shift.id, { entry_time: e.target.value })}
                      />
                      <Input
                        label="Termino"
                        type="time"
                        value={form.shifts[shift.id].exit_time}
                        onChange={(e) => updateShift(shift.id, { exit_time: e.target.value })}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-primary">Contatos</p>
                <p className="mt-1 text-sm text-ink-muted">Adicione diretor, coordenador, secretario e outros responsaveis.</p>
              </div>
              <button
                type="button"
                onClick={addContactField}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 transition hover:text-brand-400"
              >
                <Plus size={16} />
                Adicionar contatos
              </button>
            </div>

            <div className="space-y-3">
              {form.contacts.map((contact, index) => (
                <div key={`${contact.id ?? 'new'}-${index}`} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr_1fr_auto]">
                  <Input
                    label="Funcao"
                    value={contact.role}
                    onChange={(e) => updateContact(index, { role: e.target.value })}
                    placeholder="Diretor"
                  />
                  <Input
                    label="Nome"
                    value={contact.name}
                    onChange={(e) => updateContact(index, { name: e.target.value })}
                    placeholder="Nome do contato"
                  />
                  <Input
                    label="Telefone"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, { phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                  <div className="self-end pb-[2px]">
                    <button
                      type="button"
                      onClick={() => removeContactField(index)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/[0.05] text-ink-primary transition hover:bg-white/[0.08]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </EntityFormModal>
    </>
  )
}

function formatShift(shift?: string) {
  if (shift === 'morning') return 'Manha'
  if (shift === 'afternoon') return 'Tarde'
  if (shift === 'evening') return 'Noite'
  return shift
}

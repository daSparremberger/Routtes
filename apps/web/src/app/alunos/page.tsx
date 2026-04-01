'use client'

import { useMemo, useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { EntityFormModal } from '@/components/entity-form-modal'
import { Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import {
  useCreateStudent,
  useDeleteStudent,
  useStudents,
  useUpdateStudent,
  type Student,
  type StudentUpsertInput,
} from '@/hooks/use-students'
import { useSchools } from '@/hooks/use-schools'
import { Calendar, DollarSign, MapPin, Phone, School, User } from 'lucide-react'

interface StudentItem extends MasterItem {
  _raw: Student
}

interface StudentFormState {
  name: string
  school_id: string
  shift: 'morning' | 'afternoon' | 'evening'
  class_name: string
  special_needs: string
  monthly_value: string
  contract_start: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: StudentFormState = {
  name: '',
  school_id: '',
  shift: 'morning',
  class_name: '',
  special_needs: '',
  monthly_value: '',
  contract_start: '',
  status: 'active',
}

function toItem(student: Student): StudentItem {
  return {
    id: student.id,
    title: student.name,
    subtitle: student.school?.name ?? 'Sem escola',
    badge: student.status === 'active' ? 'Ativo' : 'Inativo',
    badgeVariant: student.status === 'active' ? 'active' : 'default',
    _raw: student,
  }
}

function toFormState(student?: Student): StudentFormState {
  if (!student) return EMPTY_FORM
  return {
    name: student.name,
    school_id: student.schoolId ?? '',
    shift: (student.shift as StudentFormState['shift']) ?? 'morning',
    class_name: student.className ?? '',
    special_needs: student.specialNeeds ?? '',
    monthly_value: student.monthlyValue != null ? String(student.monthlyValue) : '',
    contract_start: student.contractStart ? student.contractStart.slice(0, 10) : '',
    status: student.status,
  }
}

function toPayload(form: StudentFormState): StudentUpsertInput {
  return {
    name: form.name.trim(),
    school_id: form.school_id,
    shift: form.shift,
    class_name: form.class_name.trim() || undefined,
    special_needs: form.special_needs.trim() || undefined,
    monthly_value: form.monthly_value ? Number(form.monthly_value) : undefined,
    contract_start: form.contract_start || undefined,
    status: form.status,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível salvar o aluno.'
}

export default function AlunosPage() {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<Student | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useStudents()
  const schools = useSchools()
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const deleteStudent = useDeleteStudent()
  const items = useMemo(() => (data ?? []).map(toItem), [data])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    setForm(toFormState(student))
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.school_id) {
      setFormError('Nome e escola são obrigatórios.')
      return
    }

    try {
      setFormError(null)
      const payload = toPayload(form)
      if (editing) {
        await updateStudent.mutateAsync({ id: editing.id, ...payload })
      } else {
        await createStudent.mutateAsync(payload)
      }
      setModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  async function handleDelete(student: Student) {
    if (!window.confirm(`Arquivar o aluno "${student.name}"?`)) return
    await deleteStudent.mutateAsync(student.id)
  }

  return (
    <Shell title="Alunos" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Alunos"
        newLabel="Novo aluno"
        emptyText="Nenhum aluno cadastrado."
        onNew={openCreate}
        onEdit={(item) => openEdit(item._raw)}
        onDelete={(item) => handleDelete(item._raw)}
        renderDetail={(item) => {
          const student = item._raw
          return (
            <>
              <DetailRow label="Escola" value={student.school?.name} icon={<School size={18} />} />
              <DetailRow label="Responsável" value={student.guardians?.[0]?.name} icon={<User size={18} />} />
              <DetailRow label="Telefone" value={student.guardians?.[0]?.phone} icon={<Phone size={18} />} />
              <DetailRow label="Endereço" value={student.addresses?.[0]?.street} icon={<MapPin size={18} />} />
              <DetailRow label="Início do contrato" value={formDate(student.contractStart)} icon={<Calendar size={18} />} />
              <DetailRow label="Mensalidade" value={student.monthlyValue ? `R$ ${student.monthlyValue}` : undefined} icon={<DollarSign size={18} />} />
            </>
          )
        }}
      />

      <EntityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar aluno' : 'Novo aluno'}
        description="Os campos seguem o contrato atual da API operacional."
        onSubmit={handleSubmit}
        submitting={createStudent.isPending || updateStudent.isPending}
        submitLabel={editing ? 'Salvar alterações' : 'Criar aluno'}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            required
          />
          <Select
            label="Escola"
            value={form.school_id}
            onChange={(e) => setForm((current) => ({ ...current, school_id: e.target.value }))}
            required
          >
            <option value="">Selecione</option>
            {schools.data?.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </Select>
          <Select
            label="Turno"
            value={form.shift}
            onChange={(e) => setForm((current) => ({ ...current, shift: e.target.value as StudentFormState['shift'] }))}
          >
            <option value="morning">Manhã</option>
            <option value="afternoon">Tarde</option>
            <option value="evening">Noite</option>
          </Select>
          <Input
            label="Turma"
            value={form.class_name}
            onChange={(e) => setForm((current) => ({ ...current, class_name: e.target.value }))}
          />
          <Input
            label="Mensalidade"
            type="number"
            value={form.monthly_value}
            onChange={(e) => setForm((current) => ({ ...current, monthly_value: e.target.value }))}
          />
          <Input
            label="Início do contrato"
            type="date"
            value={form.contract_start}
            onChange={(e) => setForm((current) => ({ ...current, contract_start: e.target.value }))}
          />
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Necessidades especiais</label>
            <textarea
              value={form.special_needs}
              onChange={(e) => setForm((current) => ({ ...current, special_needs: e.target.value }))}
              className="min-h-24 w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
          </div>
        </div>
      </EntityFormModal>
    </Shell>
  )
}

function formDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : undefined
}

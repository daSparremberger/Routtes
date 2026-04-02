'use client'

import { useMemo, useState } from 'react'
import { Calendar, DollarSign, Link2, LoaderCircle, Mail, MapPin, Phone, School, Search, Shield, User, Users } from 'lucide-react'
import { useShellConfig } from '@/components/layout/shell-context'
import { EntityFormModal } from '@/components/entity-form-modal'
import { DetailRow, MasterDetail, type MasterItem } from '@/components/master-detail'
import { Tabs } from '@/components/ui/tabs'
import { Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { useSchools } from '@/hooks/use-schools'
import {
  useCreateStudent,
  useDeleteStudent,
  useStudentsList,
  useUpdateStudent,
  type Student,
  type StudentUpsertInput,
} from '@/hooks/use-students'
import {
  useCreateDriver,
  useDeleteDriver,
  useDriversList,
  useUpdateDriver,
  type Driver,
  type DriverUpsertInput,
} from '@/hooks/use-drivers'

type PeopleTab = 'students' | 'drivers'

interface StudentItem extends MasterItem {
  _raw: Student
}

interface DriverItem extends MasterItem {
  _raw: Driver
}

interface StudentFormState {
  name: string
  birth_date: string
  phone: string
  address_search: string
  school_id: string
  shift: 'morning' | 'afternoon' | 'evening'
  school_year: string
  class_name: string
  guardian_name: string
  guardian_cpf: string
  guardian_birth_date: string
  guardian_phone: string
  special_needs: string
  general_notes: string
  monthly_value: string
  contract_start: string
  status: 'active' | 'inactive'
}

interface DriverFormState {
  name: string
  email: string
  cnh: string
  cnh_validity: string
  cnh_category: string
  status: 'active' | 'inactive'
}

const EMPTY_STUDENT_FORM: StudentFormState = {
  name: '',
  birth_date: '',
  phone: '',
  address_search: '',
  school_id: '',
  shift: 'morning',
  school_year: '',
  class_name: '',
  guardian_name: '',
  guardian_cpf: '',
  guardian_birth_date: '',
  guardian_phone: '',
  special_needs: '',
  general_notes: '',
  monthly_value: '',
  contract_start: '',
  status: 'active',
}

const EMPTY_DRIVER_FORM: DriverFormState = {
  name: '',
  email: '',
  cnh: '',
  cnh_validity: '',
  cnh_category: '',
  status: 'active',
}

function toStudentItem(student: Student): StudentItem {
  return {
    id: student.id,
    title: student.name,
    subtitle: student.school?.name ?? 'Sem escola',
    badge: student.status === 'active' ? 'Ativo' : 'Inativo',
    badgeVariant: student.status === 'active' ? 'active' : 'default',
    _raw: student,
  }
}

function toDriverItem(driver: Driver): DriverItem {
  return {
    id: driver.id,
    title: driver.name,
    subtitle: driver.email ?? 'Sem e-mail',
    badge: driver.status === 'active' ? 'Ativo' : 'Inativo',
    badgeVariant: driver.status === 'active' ? 'active' : 'default',
    _raw: driver,
  }
}

function toStudentFormState(student?: Student): StudentFormState {
  if (!student) return EMPTY_STUDENT_FORM
  return {
    name: student.name,
    birth_date: '',
    phone: '',
    address_search: student.addresses?.[0]?.street ?? '',
    school_id: student.schoolId ?? '',
    shift: (student.shift as StudentFormState['shift']) ?? 'morning',
    school_year: '',
    class_name: student.className ?? '',
    guardian_name: student.guardians?.[0]?.name ?? '',
    guardian_cpf: '',
    guardian_birth_date: '',
    guardian_phone: student.guardians?.[0]?.phone ?? '',
    special_needs: student.specialNeeds ?? '',
    general_notes: '',
    monthly_value: student.monthlyValue != null ? String(student.monthlyValue) : '',
    contract_start: student.contractStart ? student.contractStart.slice(0, 10) : '',
    status: student.status,
  }
}

function toDriverFormState(driver?: Driver): DriverFormState {
  if (!driver) return EMPTY_DRIVER_FORM
  return {
    name: driver.name,
    email: driver.email ?? '',
    cnh: driver.cnh ?? '',
    cnh_validity: driver.cnhValidity ? driver.cnhValidity.slice(0, 10) : '',
    cnh_category: driver.licenseCategory ?? '',
    status: driver.status,
  }
}

function toStudentPayload(form: StudentFormState): StudentUpsertInput {
  const yearAndClass = [form.school_year.trim(), form.class_name.trim()].filter(Boolean).join(' • ')

  return {
    name: form.name.trim(),
    school_id: form.school_id,
    shift: form.shift,
    class_name: yearAndClass || form.class_name.trim() || undefined,
    special_needs: [form.special_needs.trim(), form.general_notes.trim()].filter(Boolean).join('\n\n') || undefined,
    monthly_value: form.monthly_value ? Number(form.monthly_value) : undefined,
    contract_start: form.contract_start || undefined,
    status: form.status,
  }
}

function toDriverPayload(form: DriverFormState): DriverUpsertInput {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    cnh: form.cnh.trim() || undefined,
    cnh_validity: form.cnh_validity || undefined,
    cnh_category: form.cnh_category.trim() || undefined,
    status: form.status,
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export default function PessoasPage() {
  const [activeTab, setActiveTab] = useState<PeopleTab>('students')
  const [search, setSearch] = useState('')
  useShellConfig({ title: 'Pessoas', searchValue: search, onSearchChange: setSearch })

  const [studentForm, setStudentForm] = useState<StudentFormState>(EMPTY_STUDENT_FORM)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [studentFormError, setStudentFormError] = useState<string | null>(null)
  const [studentAddressOpen, setStudentAddressOpen] = useState(false)

  const [driverForm, setDriverForm] = useState<DriverFormState>(EMPTY_DRIVER_FORM)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [driverModalOpen, setDriverModalOpen] = useState(false)
  const [driverFormError, setDriverFormError] = useState<string | null>(null)

  const studentsList = useStudentsList({ enabled: activeTab === 'students' })
  const driversList = useDriversList({ enabled: activeTab === 'drivers' })
  const schools = useSchools()
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const deleteStudent = useDeleteStudent()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const deleteDriver = useDeleteDriver()

  const studentItems = useMemo(
    () => (studentsList.data?.pages.flatMap((p) => p.data) ?? []).map(toStudentItem),
    [studentsList.data],
  )
  const driverItems = useMemo(
    () => (driversList.data?.pages.flatMap((p) => p.data) ?? []).map(toDriverItem),
    [driversList.data],
  )

  const tabs = [
    { id: 'students', label: 'Alunos', icon: <School size={16} />, badge: studentItems.length },
    { id: 'drivers', label: 'Motoristas', icon: <Users size={16} />, badge: driverItems.length },
  ]

  function openCreateStudent() {
    setEditingStudent(null)
    setStudentForm(EMPTY_STUDENT_FORM)
    setStudentFormError(null)
    setStudentModalOpen(true)
  }

  function openEditStudent(student: Student) {
    setEditingStudent(student)
    setStudentForm(toStudentFormState(student))
    setStudentFormError(null)
    setStudentModalOpen(true)
  }

  async function handleSubmitStudent() {
    if (!studentForm.name.trim() || !studentForm.school_id) {
      setStudentFormError('Nome e escola sao obrigatorios.')
      return
    }

    try {
      setStudentFormError(null)
      const payload = toStudentPayload(studentForm)
      if (editingStudent) {
        await updateStudent.mutateAsync({ id: editingStudent.id, ...payload })
      } else {
        await createStudent.mutateAsync(payload)
      }
      setStudentModalOpen(false)
    } catch (error) {
      setStudentFormError(getErrorMessage(error, 'Nao foi possivel salvar o aluno.'))
    }
  }

  async function handleDeleteStudent(student: Student) {
    if (!window.confirm(`Arquivar o aluno "${student.name}"?`)) return
    await deleteStudent.mutateAsync(student.id)
  }

  function openCreateDriver() {
    setEditingDriver(null)
    setDriverForm(EMPTY_DRIVER_FORM)
    setDriverFormError(null)
    setDriverModalOpen(true)
  }

  function openEditDriver(driver: Driver) {
    setEditingDriver(driver)
    setDriverForm(toDriverFormState(driver))
    setDriverFormError(null)
    setDriverModalOpen(true)
  }

  async function handleSubmitDriver() {
    if (!driverForm.name.trim() || !driverForm.email.trim()) {
      setDriverFormError('Nome e e-mail sao obrigatorios.')
      return
    }

    try {
      setDriverFormError(null)
      const payload = toDriverPayload(driverForm)
      if (editingDriver) {
        await updateDriver.mutateAsync({ id: editingDriver.id, ...payload })
      } else {
        await createDriver.mutateAsync(payload)
      }
      setDriverModalOpen(false)
    } catch (error) {
      setDriverFormError(getErrorMessage(error, 'Nao foi possivel salvar o motorista.'))
    }
  }

  async function handleDeleteDriver(driver: Driver) {
    if (!window.confirm(`Arquivar o motorista "${driver.name}"?`)) return
    await deleteDriver.mutateAsync(driver.id)
  }

  function handleGenerateLink() {
    const currentTab = activeTab === 'students' ? 'alunos' : 'motoristas'
    window.alert(`Gerar link de compartilhamento para ${currentTab}.`)
  }

  return (
    <>
      {activeTab === 'students' ? (
        <MasterDetail
          items={studentItems}
          isLoading={studentsList.isLoading}
          onLoadMore={() => studentsList.fetchNextPage()}
          hasMore={studentsList.hasNextPage ?? false}
          isFetchingMore={studentsList.isFetchingNextPage}
          search={search}
          titleContent={
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(value) => setActiveTab(value as PeopleTab)}
              variant="pill"
              className="mt-2 w-fit rounded-[16px] bg-white/5"
            />
          }
          headerDescription="Adicione os alunos atendidos pela operacao e acompanhe contratos, escola e dados de embarque em um unico fluxo."
          headerActions={
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleGenerateLink}
                className="flex h-10 items-center justify-center gap-2 rounded-[15px] bg-white/[0.05] px-4 text-sm font-medium text-ink-primary transition hover:bg-white/[0.08] lg:h-11 lg:rounded-[16px]"
              >
                <Link2 size={16} />
                Gerar link
              </button>
            </div>
          }
          newLabel="Novo aluno"
          emptyText="Nenhum aluno cadastrado."
          onNew={openCreateStudent}
          onEdit={(item) => openEditStudent(item._raw)}
          onDelete={(item) => handleDeleteStudent(item._raw)}
          renderDetail={(item) => {
            const student = item._raw
            return (
              <>
                <DetailRow label="Escola" value={student.school?.name} icon={<School size={18} />} />
                <DetailRow label="Responsavel" value={student.guardians?.[0]?.name} icon={<User size={18} />} />
                <DetailRow label="Telefone" value={student.guardians?.[0]?.phone} icon={<Phone size={18} />} />
                <DetailRow label="Endereco" value={student.addresses?.[0]?.street} icon={<MapPin size={18} />} />
                <DetailRow label="Inicio do contrato" value={formatDate(student.contractStart)} icon={<Calendar size={18} />} />
                <DetailRow label="Mensalidade" value={student.monthlyValue ? `R$ ${student.monthlyValue}` : undefined} icon={<DollarSign size={18} />} />
              </>
            )
          }}
        />
      ) : (
        <MasterDetail
          items={driverItems}
          isLoading={driversList.isLoading}
          onLoadMore={() => driversList.fetchNextPage()}
          hasMore={driversList.hasNextPage ?? false}
          isFetchingMore={driversList.isFetchingNextPage}
          search={search}
          titleContent={
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(value) => setActiveTab(value as PeopleTab)}
              variant="pill"
              className="mt-2 w-fit rounded-[16px] bg-white/5"
            />
          }
          headerDescription="Registre os motoristas da frota com dados de contato, CNH e status operacional para manter a equipe organizada."
          headerActions={
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleGenerateLink}
                className="flex h-10 items-center justify-center gap-2 rounded-[15px] bg-white/[0.05] px-4 text-sm font-medium text-ink-primary transition hover:bg-white/[0.08] lg:h-11 lg:rounded-[16px]"
              >
                <Link2 size={16} />
                Gerar link
              </button>
            </div>
          }
          newLabel="Novo motorista"
          emptyText="Nenhum motorista cadastrado."
          onNew={openCreateDriver}
          onEdit={(item) => openEditDriver(item._raw)}
          onDelete={(item) => handleDeleteDriver(item._raw)}
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
      )}

      <EntityFormModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title={editingStudent ? 'Editar aluno' : 'Novo aluno'}
        description="Cadastro completo com dados pessoais, escola, responsavel, contrato e observacoes."
        onSubmit={handleSubmitStudent}
        submitting={createStudent.isPending || updateStudent.isPending}
        submitLabel={editingStudent ? 'Salvar alteracoes' : 'Criar aluno'}
        error={studentFormError}
        modalClassName="max-w-3xl h-[78vh]"
        contentClassName="space-y-6"
        footerClassName="flex justify-end gap-3 border-t border-white/[0.06] pt-4"
      >
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Dados pessoais</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Nome completo"
              value={studentForm.name}
              onChange={(e) => setStudentForm((current) => ({ ...current, name: e.target.value }))}
              required
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={studentForm.birth_date}
              onChange={(e) => setStudentForm((current) => ({ ...current, birth_date: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Telefone"
              value={studentForm.phone}
              onChange={(e) => setStudentForm((current) => ({ ...current, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
            <div className="relative">
              <Input
                label="Endereco"
                value={studentForm.address_search}
                onChange={(e) => {
                  setStudentForm((current) => ({ ...current, address_search: e.target.value }))
                  setStudentAddressOpen(Boolean(e.target.value.trim()))
                }}
                placeholder="Pesquise o endereco"
                icon={<Search size={16} />}
              />
              {studentAddressOpen && studentForm.address_search.trim().length >= 3 ? (
                <div className="absolute z-20 mt-1 w-full rounded-[16px] border border-white/[0.08] bg-shell-900 p-3 text-sm text-ink-muted shadow-modal">
                  Digite para buscar o endereco pela API.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Dados escolares</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Escola"
              value={studentForm.school_id}
              onChange={(e) => setStudentForm((current) => ({ ...current, school_id: e.target.value }))}
              required
            >
              <option value="">Selecione</option>
              {schools.data?.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Turno"
              value={studentForm.shift}
              onChange={(e) => setStudentForm((current) => ({ ...current, shift: e.target.value as StudentFormState['shift'] }))}
            >
              <option value="morning">Manha</option>
              <option value="afternoon">Tarde</option>
              <option value="evening">Noite</option>
            </Select>
            <Input
              label="Ano"
              value={studentForm.school_year}
              onChange={(e) => setStudentForm((current) => ({ ...current, school_year: e.target.value }))}
              placeholder="5o ano"
            />
            <Input
              label="Turma"
              value={studentForm.class_name}
              onChange={(e) => setStudentForm((current) => ({ ...current, class_name: e.target.value }))}
            />
            <Select
              label="Status"
              value={studentForm.status}
              onChange={(e) => setStudentForm((current) => ({ ...current, status: e.target.value as StudentFormState['status'] }))}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Select>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Dados do responsavel</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Nome completo"
              value={studentForm.guardian_name}
              onChange={(e) => setStudentForm((current) => ({ ...current, guardian_name: e.target.value }))}
            />
            <Input
              label="CPF"
              value={studentForm.guardian_cpf}
              onChange={(e) => setStudentForm((current) => ({ ...current, guardian_cpf: e.target.value }))}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Data de nascimento"
              type="date"
              value={studentForm.guardian_birth_date}
              onChange={(e) => setStudentForm((current) => ({ ...current, guardian_birth_date: e.target.value }))}
            />
            <Input
              label="Telefone"
              value={studentForm.guardian_phone}
              onChange={(e) => setStudentForm((current) => ({ ...current, guardian_phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Contrato</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Mensalidade"
              type="number"
              value={studentForm.monthly_value}
              onChange={(e) => setStudentForm((current) => ({ ...current, monthly_value: e.target.value }))}
            />
            <Input
              label="Inicio do contrato"
              type="date"
              value={studentForm.contract_start}
              onChange={(e) => setStudentForm((current) => ({ ...current, contract_start: e.target.value }))}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Saude e observacoes</p>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Restricoes</label>
              <textarea
                value={studentForm.special_needs}
                onChange={(e) => setStudentForm((current) => ({ ...current, special_needs: e.target.value }))}
                className="min-h-24 w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Observacoes gerais</label>
              <textarea
                value={studentForm.general_notes}
                onChange={(e) => setStudentForm((current) => ({ ...current, general_notes: e.target.value }))}
                className="min-h-24 w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
          </div>
        </section>
      </EntityFormModal>

      <EntityFormModal
        isOpen={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        title={editingDriver ? 'Editar motorista' : 'Novo motorista'}
        description="Cadastro enxuto para contato, documentacao e status operacional."
        onSubmit={handleSubmitDriver}
        submitting={createDriver.isPending || updateDriver.isPending}
        submitLabel={editingDriver ? 'Salvar alteracoes' : 'Criar motorista'}
        error={driverFormError}
        modalClassName="max-w-2xl h-[72vh]"
        contentClassName="space-y-5"
        footerClassName="flex justify-end gap-3 border-t border-white/[0.06] pt-4"
      >
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Dados do motorista</p>
            <p className="mt-1 text-xs text-ink-muted">Campos organizados no mesmo ritmo visual das referencias antigas.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Nome completo"
              value={driverForm.name}
              onChange={(e) => setDriverForm((current) => ({ ...current, name: e.target.value }))}
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={driverForm.email}
              onChange={(e) => setDriverForm((current) => ({ ...current, email: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="CNH"
              value={driverForm.cnh}
              onChange={(e) => setDriverForm((current) => ({ ...current, cnh: e.target.value }))}
            />
            <Input
              label="Categoria"
              value={driverForm.cnh_category}
              onChange={(e) => setDriverForm((current) => ({ ...current, cnh_category: e.target.value }))}
            />
            <Select
              label="Status"
              value={driverForm.status}
              onChange={(e) => setDriverForm((current) => ({ ...current, status: e.target.value as DriverFormState['status'] }))}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Validade da CNH"
              type="date"
              value={driverForm.cnh_validity}
              onChange={(e) => setDriverForm((current) => ({ ...current, cnh_validity: e.target.value }))}
            />
          </div>
        </section>
      </EntityFormModal>
    </>
  )
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : undefined
}

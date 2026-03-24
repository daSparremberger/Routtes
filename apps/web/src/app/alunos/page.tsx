'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, Input, Modal,
  Avatar, EmptyState, Skeleton, Dropdown,
  Pagination, Separator,
} from '@/components/ui'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Search, Users, MoreHorizontal,
  Pencil, Trash2, Download, Filter,
  School, Phone, MapPin, CheckCircle2, XCircle,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Turno   = 'Manhã' | 'Tarde' | 'Integral'
type Status  = 'ativo' | 'inativo'

interface Aluno {
  id:         string
  nome:       string
  escola:     string
  turno:      Turno
  responsavel:string
  telefone:   string
  endereco:   string
  status:     Status
  criadoEm:   string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ALUNOS: Aluno[] = [
  { id:'1',  nome:'Ana Beatriz Santos',   escola:'E.M. João Pessoa',     turno:'Manhã',    responsavel:'Maria Santos',     telefone:'(11) 99801-2345', endereco:'Rua das Flores, 45 — Jardim América',    status:'ativo',   criadoEm:'2026-01-15' },
  { id:'2',  nome:'Bruno Carvalho',        escola:'E.M. João Pessoa',     turno:'Tarde',    responsavel:'Carlos Carvalho',  telefone:'(11) 98723-4567', endereco:'Av. Brasil, 200 — Centro',                status:'ativo',   criadoEm:'2026-01-16' },
  { id:'3',  nome:'Carla Mendes',          escola:'E.E. Villa Nova',      turno:'Manhã',    responsavel:'José Mendes',      telefone:'(11) 97634-5678', endereco:'Rua do Bosque, 12 — Vila Nova',            status:'ativo',   criadoEm:'2026-01-17' },
  { id:'4',  nome:'Diego Ferreira',        escola:'E.E. Villa Nova',      turno:'Integral', responsavel:'Ana Ferreira',     telefone:'(11) 96545-6789', endereco:'Praça Central, 3 — Planalto',              status:'ativo',   criadoEm:'2026-01-18' },
  { id:'5',  nome:'Eduarda Lima',          escola:'C.E.I. Pequenos Passos',turno:'Manhã',   responsavel:'Roberto Lima',     telefone:'(11) 95456-7890', endereco:'Rua das Acácias, 78 — Jardim América',   status:'ativo',   criadoEm:'2026-01-19' },
  { id:'6',  nome:'Felipe Rocha',          escola:'E.M. João Pessoa',     turno:'Tarde',    responsavel:'Sônia Rocha',      telefone:'(11) 94367-8901', endereco:'Av. Paulista, 550 — Centro',               status:'inativo', criadoEm:'2026-01-20' },
  { id:'7',  nome:'Gabriela Alves',        escola:'E.E. Villa Nova',      turno:'Manhã',    responsavel:'Paulo Alves',      telefone:'(11) 93278-9012', endereco:'Rua Ipê Amarelo, 23 — Vila Nova',          status:'ativo',   criadoEm:'2026-01-21' },
  { id:'8',  nome:'Henrique Souza',        escola:'C.E.I. Pequenos Passos',turno:'Integral', responsavel:'Fernanda Souza',  telefone:'(11) 92189-0123', endereco:'Rua das Palmeiras, 67 — Planalto',         status:'ativo',   criadoEm:'2026-01-22' },
  { id:'9',  nome:'Isabella Costa',        escola:'E.M. João Pessoa',     turno:'Manhã',    responsavel:'Marcelo Costa',    telefone:'(11) 91090-1234', endereco:'Rua XV de Novembro, 89 — Centro',          status:'ativo',   criadoEm:'2026-01-23' },
  { id:'10', nome:'João Oliveira',         escola:'E.E. Villa Nova',      turno:'Tarde',    responsavel:'Luciana Oliveira', telefone:'(11) 90901-2345', endereco:'Rua dos Pinheiros, 34 — Jardim América',   status:'ativo',   criadoEm:'2026-01-24' },
  { id:'11', nome:'Karina Pereira',        escola:'C.E.I. Pequenos Passos',turno:'Manhã',  responsavel:'Rodrigo Pereira',  telefone:'(11) 89812-3456', endereco:'Av. das Américas, 120 — Planalto',         status:'ativo',   criadoEm:'2026-01-25' },
  { id:'12', nome:'Lucas Barbosa',         escola:'E.M. João Pessoa',     turno:'Integral', responsavel:'Patrícia Barbosa', telefone:'(11) 88723-4567', endereco:'Rua do Comércio, 45 — Centro',             status:'inativo', criadoEm:'2026-01-26' },
  { id:'13', nome:'Mariana Torres',        escola:'E.E. Villa Nova',      turno:'Tarde',    responsavel:'Eduardo Torres',   telefone:'(11) 87634-5678', endereco:'Alameda Santos, 67 — Vila Nova',            status:'ativo',   criadoEm:'2026-01-27' },
  { id:'14', nome:'Nicolas Martins',       escola:'E.M. João Pessoa',     turno:'Manhã',    responsavel:'Renata Martins',   telefone:'(11) 86545-6789', endereco:'Rua Haddock Lobo, 78 — Jardim América',    status:'ativo',   criadoEm:'2026-01-28' },
  { id:'15', nome:'Olivia Nascimento',     escola:'C.E.I. Pequenos Passos',turno:'Tarde',  responsavel:'Tiago Nascimento', telefone:'(11) 85456-7890', endereco:'Rua Augusta, 234 — Centro',                status:'ativo',   criadoEm:'2026-01-29' },
]

const ESCOLAS  = ['Todas as escolas', 'E.M. João Pessoa', 'E.E. Villa Nova', 'C.E.I. Pequenos Passos']
const TURNOS   = ['Todos os turnos', 'Manhã', 'Tarde', 'Integral']
const STATUSES = ['Todos', 'Ativo', 'Inativo']
const PER_PAGE = 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlunosPage() {
  const [search,        setSearch]        = useState('')
  const [filterEscola,  setFilterEscola]  = useState('Todas as escolas')
  const [filterTurno,   setFilterTurno]   = useState('Todos os turnos')
  const [filterStatus,  setFilterStatus]  = useState('Todos')
  const [page,          setPage]          = useState(1)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editTarget,    setEditTarget]    = useState<Aluno | null>(null)
  const [loading]                         = useState(false)

  // Filtered list
  const filtered = useMemo(() => {
    return MOCK_ALUNOS.filter((a) => {
      const matchSearch = !search ||
        a.nome.toLowerCase().includes(search.toLowerCase()) ||
        a.responsavel.toLowerCase().includes(search.toLowerCase())
      const matchEscola  = filterEscola  === 'Todas as escolas'  || a.escola  === filterEscola
      const matchTurno   = filterTurno   === 'Todos os turnos'   || a.turno   === filterTurno
      const matchStatus  = filterStatus  === 'Todos'             ||
        (filterStatus === 'Ativo' && a.status === 'ativo')       ||
        (filterStatus === 'Inativo' && a.status === 'inativo')
      return matchSearch && matchEscola && matchTurno && matchStatus
    })
  }, [search, filterEscola, filterTurno, filterStatus])

  const totalAtivos   = MOCK_ALUNOS.filter((a) => a.status === 'ativo').length
  const paginated     = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit   = (a: Aluno) => { setEditTarget(a); setModalOpen(true) }

  const hasFilters = search || filterEscola !== 'Todas as escolas' ||
    filterTurno !== 'Todos os turnos' || filterStatus !== 'Todos'

  return (
    <Shell
      title="Alunos"
      subtitle={`${totalAtivos} alunos ativos`}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>
            Exportar
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            Novo Aluno
          </Button>
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar aluno ou responsável…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={cn(
                'w-full h-9 pl-9 pr-3 text-sm',
                'bg-surface-card border border-surface-border rounded-md',
                'text-ink-primary placeholder:text-ink-muted',
                'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
                'transition-colors duration-150',
              )}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              value={filterEscola}
              options={ESCOLAS}
              onChange={(v) => { setFilterEscola(v); setPage(1) }}
            />
            <FilterSelect
              value={filterTurno}
              options={TURNOS}
              onChange={(v) => { setFilterTurno(v); setPage(1) }}
            />
            <FilterSelect
              value={filterStatus}
              options={STATUSES}
              onChange={(v) => { setFilterStatus(v); setPage(1) }}
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch(''); setFilterEscola('Todas as escolas')
                  setFilterTurno('Todos os turnos'); setFilterStatus('Todos')
                  setPage(1)
                }}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="sm:ml-auto shrink-0">
            <span className="text-xs text-ink-muted tabular-nums">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Tabela ────────────────────────────────────────────────────────── */}
        <Card flush>
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-[280px]">Aluno</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead className="w-24">Turno</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-[60px]" />
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: PER_PAGE }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton height={14} width={j === 0 ? '70%' : '50%'} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Users size={22} />}
                      title={hasFilters ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                      description={
                        hasFilters
                          ? 'Tente ajustar os filtros para encontrar o que procura.'
                          : 'Comece cadastrando o primeiro aluno da sua operação.'
                      }
                      action={!hasFilters ? { label: 'Novo Aluno', onClick: openCreate } : undefined}
                    />
                  </td>
                </TableRow>
              ) : (
                paginated.map((aluno) => (
                  <AlunoRow
                    key={aluno.id}
                    aluno={aluno}
                    onEdit={() => openEdit(aluno)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* ── Paginação ──────────────────────────────────────────────────────── */}
        {filtered.length > PER_PAGE && (
          <Pagination
            page={page}
            total={filtered.length}
            perPage={PER_PAGE}
            onChange={setPage}
          />
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────────── */}
      <AlunoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        aluno={editTarget}
      />
    </Shell>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function AlunoRow({ aluno, onEdit }: { aluno: Aluno; onEdit: () => void }) {
  return (
    <TableRow className="group">
      {/* Nome */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar name={aluno.nome} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary truncate">{aluno.nome}</p>
            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
              <MapPin size={10} />
              <span className="truncate max-w-[180px]">{aluno.endereco}</span>
            </p>
          </div>
        </div>
      </TableCell>

      {/* Escola */}
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
          <School size={13} className="text-ink-muted shrink-0" />
          <span className="truncate">{aluno.escola}</span>
        </div>
      </TableCell>

      {/* Turno */}
      <TableCell>
        <TurnoBadge turno={aluno.turno} />
      </TableCell>

      {/* Responsável */}
      <TableCell>
        <div className="min-w-0">
          <p className="text-sm text-ink-primary truncate">{aluno.responsavel}</p>
          <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
            <Phone size={10} />
            {aluno.telefone}
          </p>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        {aluno.status === 'ativo' ? (
          <Badge variant="active" dot>Ativo</Badge>
        ) : (
          <Badge variant="neutral">Inativo</Badge>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell>
        <Dropdown
          trigger={
            <button className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              'text-ink-muted hover:bg-surface-hover hover:text-ink-primary',
              'transition-colors opacity-0 group-hover:opacity-100',
            )}>
              <MoreHorizontal size={15} />
            </button>
          }
          items={[
            { label: 'Editar',            icon: <Pencil size={14} />,  onClick: onEdit },
            {
              label: aluno.status === 'ativo' ? 'Inativar' : 'Ativar',
              icon:  aluno.status === 'ativo'
                ? <XCircle size={14} />
                : <CheckCircle2 size={14} />,
            },
            { separator: true },
            { label: 'Excluir', icon: <Trash2 size={14} />, variant: 'danger' },
          ]}
          align="right"
        />
      </TableCell>
    </TableRow>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AlunoModal({
  isOpen, onClose, aluno,
}: {
  isOpen: boolean
  onClose: () => void
  aluno:  Aluno | null
}) {
  const isEdit = !!aluno

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Aluno' : 'Novo Aluno'}
      description={isEdit ? `Editando ${aluno.nome}` : 'Preencha os dados do novo aluno.'}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Nome completo <span className="text-danger">*</span>
            </label>
            <input
              defaultValue={aluno?.nome}
              placeholder="Ex: Ana Beatriz Santos"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Escola <span className="text-danger">*</span>
            </label>
            <select defaultValue={aluno?.escola} className={inputCls}>
              <option value="">Selecione…</option>
              {ESCOLAS.slice(1).map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Turno <span className="text-danger">*</span>
            </label>
            <select defaultValue={aluno?.turno} className={inputCls}>
              <option value="">Selecione…</option>
              {TURNOS.slice(1).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Endereço de embarque <span className="text-danger">*</span>
            </label>
            <input
              defaultValue={aluno?.endereco}
              placeholder="Rua, número — Bairro"
              className={inputCls}
            />
          </div>

          <Separator label="Responsável" className="col-span-2" />

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Nome do responsável <span className="text-danger">*</span>
            </label>
            <input
              defaultValue={aluno?.responsavel}
              placeholder="Nome completo"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Telefone
            </label>
            <input
              defaultValue={aluno?.telefone}
              placeholder="(11) 99999-9999"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button>{isEdit ? 'Salvar alterações' : 'Cadastrar aluno'}</Button>
      </div>
    </Modal>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const turnoMap: Record<Turno, string> = {
  'Manhã':    'bg-brand-50 text-brand-700 border-brand-200',
  'Tarde':    'bg-warn-light text-warn-dark border-warn/20',
  'Integral': 'bg-active-light text-active-dark border-active/20',
}

function TurnoBadge({ turno }: { turno: Turno }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      turnoMap[turno],
    )}>
      {turno}
    </span>
  )
}

function FilterSelect({
  value, options, onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 pl-7 pr-7 text-xs font-medium rounded-md appearance-none',
          'border border-surface-border bg-surface-card text-ink-secondary',
          'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
          'transition-colors duration-150 cursor-pointer',
        )}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

const inputCls = cn(
  'w-full h-9 px-3 text-sm rounded-md',
  'border border-surface-border bg-surface-card text-ink-primary',
  'placeholder:text-ink-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
  'transition-colors duration-150',
)

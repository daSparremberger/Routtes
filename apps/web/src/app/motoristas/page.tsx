'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, Avatar, EmptyState,
  Skeleton, Dropdown, Pagination, Modal, Separator,
} from '@/components/ui'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Search, Truck, MoreHorizontal,
  Pencil, Trash2, Download, Filter,
  Phone, CreditCard, CheckCircle2, XCircle,
  AlertCircle, Car,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CNHCategoria = 'B' | 'C' | 'D' | 'E'
type StatusMotorista = 'ativo' | 'inativo' | 'ferias'

interface Motorista {
  id:          string
  nome:        string
  telefone:    string
  cnh:         string
  cnhCategoria:CNHCategoria
  cnhValidade: string
  veiculo?:    string
  status:      StatusMotorista
  criadoEm:   string
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_MOTORISTAS: Motorista[] = [
  { id:'1',  nome:'Carlos Silva',    telefone:'(11) 99801-2345', cnh:'12345678901', cnhCategoria:'D', cnhValidade:'2027-06-30', veiculo:'ABC-1234', status:'ativo',   criadoEm:'2026-01-10' },
  { id:'2',  nome:'Maria Santos',   telefone:'(11) 98723-4567', cnh:'23456789012', cnhCategoria:'D', cnhValidade:'2026-11-15', veiculo:'DEF-5678', status:'ativo',   criadoEm:'2026-01-11' },
  { id:'3',  nome:'José Oliveira',  telefone:'(11) 97634-5678', cnh:'34567890123', cnhCategoria:'C', cnhValidade:'2028-03-20', veiculo:'GHI-9012', status:'ativo',   criadoEm:'2026-01-12' },
  { id:'4',  nome:'Pedro Costa',    telefone:'(11) 96545-6789', cnh:'45678901234', cnhCategoria:'D', cnhValidade:'2027-09-10', veiculo:'JKL-3456', status:'ativo',   criadoEm:'2026-01-13' },
  { id:'5',  nome:'Ana Lima',       telefone:'(11) 95456-7890', cnh:'56789012345', cnhCategoria:'B', cnhValidade:'2025-12-01', veiculo:undefined,  status:'inativo', criadoEm:'2026-01-14' },
  { id:'6',  nome:'Roberto Alves',  telefone:'(11) 94367-8901', cnh:'67890123456', cnhCategoria:'D', cnhValidade:'2026-07-25', veiculo:undefined,  status:'ferias',  criadoEm:'2026-01-15' },
  { id:'7',  nome:'Fernanda Cruz',  telefone:'(11) 93278-9012', cnh:'78901234567', cnhCategoria:'D', cnhValidade:'2028-01-08', veiculo:'MNO-7890', status:'ativo',   criadoEm:'2026-01-16' },
  { id:'8',  nome:'Ricardo Nunes',  telefone:'(11) 92189-0123', cnh:'89012345678', cnhCategoria:'C', cnhValidade:'2027-04-14', veiculo:undefined,  status:'ativo',   criadoEm:'2026-01-17' },
]

const CATEGORIAS = ['Todas', 'B', 'C', 'D', 'E']
const STATUSES   = ['Todos', 'Ativo', 'Inativo', 'Férias']
const PER_PAGE   = 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MotoristasPage() {
  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState('Todas')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [page,         setPage]         = useState(1)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Motorista | null>(null)
  const [loading]                       = useState(false)

  const filtered = useMemo(() => {
    return MOCK_MOTORISTAS.filter((m) => {
      const matchSearch = !search ||
        m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.cnh.includes(search) ||
        (m.veiculo?.includes(search.toUpperCase()) ?? false)
      const matchCat    = filterCat    === 'Todas'  || m.cnhCategoria === filterCat
      const matchStatus = filterStatus === 'Todos'  ||
        (filterStatus === 'Ativo'   && m.status === 'ativo')   ||
        (filterStatus === 'Inativo' && m.status === 'inativo') ||
        (filterStatus === 'Férias'  && m.status === 'ferias')
      return matchSearch && matchCat && matchStatus
    })
  }, [search, filterCat, filterStatus])

  const totalAtivos = MOCK_MOTORISTAS.filter((m) => m.status === 'ativo').length
  const emCampo     = MOCK_MOTORISTAS.filter((m) => m.veiculo && m.status === 'ativo').length
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit   = (m: Motorista) => { setEditTarget(m); setModalOpen(true) }

  const hasFilters = search || filterCat !== 'Todas' || filterStatus !== 'Todos'

  return (
    <Shell
      title="Motoristas"
      subtitle={`${totalAtivos} ativos · ${emCampo} em campo`}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>
            Exportar
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            Novo Motorista
          </Button>
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar nome, CNH ou placa…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect value={filterCat}    options={CATEGORIAS} label="CNH" onChange={(v) => { setFilterCat(v); setPage(1) }} />
            <FilterSelect value={filterStatus} options={STATUSES}   label=""   onChange={(v) => { setFilterStatus(v); setPage(1) }} />
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterCat('Todas'); setFilterStatus('Todos'); setPage(1) }}
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
                <TableHead className="w-[260px]">Motorista</TableHead>
                <TableHead className="w-[120px]">CNH</TableHead>
                <TableHead className="w-20">Categoria</TableHead>
                <TableHead>Validade CNH</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-[60px]" />
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton height={14} width={j === 0 ? '70%' : '50%'} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Truck size={22} />}
                      title={hasFilters ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'}
                      description={
                        hasFilters
                          ? 'Tente ajustar os filtros.'
                          : 'Comece cadastrando o primeiro motorista da sua frota.'
                      }
                      action={!hasFilters ? { label: 'Novo Motorista', onClick: openCreate } : undefined}
                    />
                  </td>
                </TableRow>
              ) : (
                paginated.map((m) => (
                  <MotoristaRow key={m.id} motorista={m} onEdit={() => openEdit(m)} />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {filtered.length > PER_PAGE && (
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        )}
      </div>

      <MotoristaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} motorista={editTarget} />
    </Shell>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MotoristaRow({ motorista: m, onEdit }: { motorista: Motorista; onEdit: () => void }) {
  const cnhExpired = new Date(m.cnhValidade) < new Date()
  const cnhNearExpiry = !cnhExpired && new Date(m.cnhValidade) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  return (
    <TableRow className="group">
      {/* Nome */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar name={m.nome} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary truncate">{m.nome}</p>
            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
              <Phone size={10} />
              {m.telefone}
            </p>
          </div>
        </div>
      </TableCell>

      {/* CNH */}
      <TableCell>
        <span className="text-sm font-mono text-ink-secondary">{m.cnh}</span>
      </TableCell>

      {/* Categoria */}
      <TableCell>
        <span className={cn(
          'inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold border',
          'bg-brand-50 text-brand-700 border-brand-200',
        )}>
          {m.cnhCategoria}
        </span>
      </TableCell>

      {/* Validade */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          {cnhExpired && <AlertCircle size={12} className="text-danger shrink-0" />}
          {cnhNearExpiry && !cnhExpired && <AlertCircle size={12} className="text-warn shrink-0" />}
          <span className={cn(
            'text-sm',
            cnhExpired   ? 'text-danger font-medium' :
            cnhNearExpiry ? 'text-warn-dark font-medium' :
            'text-ink-secondary',
          )}>
            {formatDate(m.cnhValidade)}
          </span>
        </div>
      </TableCell>

      {/* Veículo */}
      <TableCell>
        {m.veiculo ? (
          <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
            <Car size={13} className="text-ink-muted shrink-0" />
            <span className="font-mono text-xs">{m.veiculo}</span>
          </div>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={m.status} />
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
            { label: 'Editar', icon: <Pencil size={14} />, onClick: onEdit },
            {
              label: m.status === 'ativo' ? 'Inativar' : 'Ativar',
              icon: m.status === 'ativo' ? <XCircle size={14} /> : <CheckCircle2 size={14} />,
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

function MotoristaModal({
  isOpen, onClose, motorista,
}: { isOpen: boolean; onClose: () => void; motorista: Motorista | null }) {
  const isEdit = !!motorista

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Motorista' : 'Novo Motorista'}
      description={isEdit ? `Editando ${motorista.nome}` : 'Preencha os dados do motorista.'}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Nome completo <span className="text-danger">*</span>
            </label>
            <input defaultValue={motorista?.nome} placeholder="Nome completo" className={formInputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">Telefone</label>
            <input defaultValue={motorista?.telefone} placeholder="(11) 99999-9999" className={formInputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Número CNH <span className="text-danger">*</span>
            </label>
            <input defaultValue={motorista?.cnh} placeholder="00000000000" className={formInputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Categoria CNH <span className="text-danger">*</span>
            </label>
            <select defaultValue={motorista?.cnhCategoria} className={formInputCls}>
              <option value="">Selecione…</option>
              {['B','C','D','E'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Validade CNH <span className="text-danger">*</span>
            </label>
            <input type="date" defaultValue={motorista?.cnhValidade} className={formInputCls} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button>{isEdit ? 'Salvar alterações' : 'Cadastrar motorista'}</Button>
      </div>
    </Modal>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusMap: Record<StatusMotorista, { label: string; variant: 'active' | 'neutral' | 'warn'; dot?: boolean }> = {
  ativo:   { label: 'Ativo',   variant: 'active',  dot: true  },
  inativo: { label: 'Inativo', variant: 'neutral'             },
  ferias:  { label: 'Férias',  variant: 'warn',    dot: false },
}

function StatusBadge({ status }: { status: StatusMotorista }) {
  const cfg = statusMap[status]
  return <Badge variant={cfg.variant} dot={cfg.dot}>{cfg.label}</Badge>
}

function FilterSelect({
  value, options, label, onChange,
}: { value: string; options: string[]; label: string; onChange: (v: string) => void }) {
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
  'w-full h-9 pl-9 pr-3 text-sm',
  'bg-surface-card border border-surface-border rounded-md',
  'text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
  'transition-colors duration-150',
)

const formInputCls = cn(
  'w-full h-9 px-3 text-sm rounded-md',
  'border border-surface-border bg-surface-card text-ink-primary',
  'placeholder:text-ink-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
  'transition-colors duration-150',
)

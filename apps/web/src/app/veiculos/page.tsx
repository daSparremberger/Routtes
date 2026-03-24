'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, EmptyState,
  Skeleton, Dropdown, Pagination, Modal,
} from '@/components/ui'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Search, Car, MoreHorizontal,
  Pencil, Trash2, Download, Filter,
  AlertCircle, Users, Wrench,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type StatusVeiculo = 'disponivel' | 'em_rota' | 'manutencao' | 'inativo'

interface Veiculo {
  id:           string
  placa:        string
  modelo:       string
  marca:        string
  ano:          number
  capacidade:   number
  status:       StatusVeiculo
  motorista?:   string
  crlvValidade: string
  segValidade:  string
  criadoEm:    string
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_VEICULOS: Veiculo[] = [
  { id:'1', placa:'ABC-1234', modelo:'Sprinter 415',  marca:'Mercedes-Benz', ano:2022, capacidade:19, status:'em_rota',    motorista:'Carlos Silva',   crlvValidade:'2026-12-31', segValidade:'2026-06-30', criadoEm:'2026-01-10' },
  { id:'2', placa:'DEF-5678', modelo:'Sprinter 415',  marca:'Mercedes-Benz', ano:2021, capacidade:19, status:'em_rota',    motorista:'Maria Santos',   crlvValidade:'2026-12-31', segValidade:'2026-09-15', criadoEm:'2026-01-11' },
  { id:'3', placa:'GHI-9012', modelo:'Daily 35S14',   marca:'Iveco',         ano:2023, capacidade:22, status:'disponivel', motorista:undefined,        crlvValidade:'2027-03-20', segValidade:'2026-08-10', criadoEm:'2026-01-12' },
  { id:'4', placa:'JKL-3456', modelo:'Sprinter 515',  marca:'Mercedes-Benz', ano:2020, capacidade:19, status:'em_rota',    motorista:'Pedro Costa',    crlvValidade:'2026-12-31', segValidade:'2025-12-01', criadoEm:'2026-01-13' },
  { id:'5', placa:'MNO-7890', modelo:'Boxer Minibus', marca:'Peugeot',       ano:2022, capacidade:16, status:'em_rota',    motorista:'Fernanda Cruz',  crlvValidade:'2027-01-15', segValidade:'2027-01-15', criadoEm:'2026-01-14' },
  { id:'6', placa:'PQR-2345', modelo:'Daily 35S14',   marca:'Iveco',         ano:2019, capacidade:22, status:'manutencao', motorista:undefined,        crlvValidade:'2026-12-31', segValidade:'2026-11-20', criadoEm:'2026-01-15' },
  { id:'7', placa:'STU-6789', modelo:'Transit',       marca:'Ford',          ano:2023, capacidade:15, status:'disponivel', motorista:undefined,        crlvValidade:'2027-06-30', segValidade:'2027-06-30', criadoEm:'2026-01-16' },
  { id:'8', placa:'VWX-0123', modelo:'Sprinter 315',  marca:'Mercedes-Benz', ano:2018, capacidade:15, status:'inativo',   motorista:undefined,        crlvValidade:'2025-06-30', segValidade:'2025-06-30', criadoEm:'2026-01-17' },
]

const MARCAS   = ['Todas as marcas', 'Mercedes-Benz', 'Iveco', 'Peugeot', 'Ford']
const STATUSES = ['Todos', 'Disponível', 'Em rota', 'Manutenção', 'Inativo']
const PER_PAGE = 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VeiculosPage() {
  const [search,       setSearch]       = useState('')
  const [filterMarca,  setFilterMarca]  = useState('Todas as marcas')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [page,         setPage]         = useState(1)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Veiculo | null>(null)
  const [loading]                       = useState(false)

  const filtered = useMemo(() => {
    return MOCK_VEICULOS.filter((v) => {
      const matchSearch = !search ||
        v.placa.toLowerCase().includes(search.toLowerCase()) ||
        v.modelo.toLowerCase().includes(search.toLowerCase()) ||
        v.marca.toLowerCase().includes(search.toLowerCase())
      const matchMarca  = filterMarca  === 'Todas as marcas' || v.marca === filterMarca
      const matchStatus = filterStatus === 'Todos' ||
        (filterStatus === 'Disponível'  && v.status === 'disponivel') ||
        (filterStatus === 'Em rota'     && v.status === 'em_rota')    ||
        (filterStatus === 'Manutenção'  && v.status === 'manutencao') ||
        (filterStatus === 'Inativo'     && v.status === 'inativo')
      return matchSearch && matchMarca && matchStatus
    })
  }, [search, filterMarca, filterStatus])

  const disponíveis   = MOCK_VEICULOS.filter((v) => v.status === 'disponivel').length
  const emRota        = MOCK_VEICULOS.filter((v) => v.status === 'em_rota').length
  const paginated     = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit   = (v: Veiculo) => { setEditTarget(v); setModalOpen(true) }
  const hasFilters = search || filterMarca !== 'Todas as marcas' || filterStatus !== 'Todos'

  return (
    <Shell
      title="Veículos"
      subtitle={`${emRota} em rota · ${disponíveis} disponíveis`}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Exportar</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Novo Veículo</Button>
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
              placeholder="Buscar placa, modelo ou marca…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect value={filterMarca}  options={MARCAS}   onChange={(v) => { setFilterMarca(v);  setPage(1) }} />
            <FilterSelect value={filterStatus} options={STATUSES}  onChange={(v) => { setFilterStatus(v); setPage(1) }} />
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterMarca('Todas as marcas'); setFilterStatus('Todos'); setPage(1) }}
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
                <TableHead className="w-[240px]">Veículo</TableHead>
                <TableHead className="w-28">Placa</TableHead>
                <TableHead className="w-16">Ano</TableHead>
                <TableHead className="w-20">Capacidade</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>CRLV / Seguro</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-[60px]" />
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={14} width={j === 0 ? '70%' : '50%'} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Car size={22} />}
                      title={hasFilters ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
                      description={hasFilters ? 'Tente ajustar os filtros.' : 'Cadastre o primeiro veículo da frota.'}
                      action={!hasFilters ? { label: 'Novo Veículo', onClick: openCreate } : undefined}
                    />
                  </td>
                </TableRow>
              ) : (
                paginated.map((v) => (
                  <VeiculoRow key={v.id} veiculo={v} onEdit={() => openEdit(v)} />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {filtered.length > PER_PAGE && (
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        )}
      </div>

      <VeiculoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} veiculo={editTarget} />
    </Shell>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function VeiculoRow({ veiculo: v, onEdit }: { veiculo: Veiculo; onEdit: () => void }) {
  const segExpired    = new Date(v.segValidade)  < new Date()
  const crlvExpired   = new Date(v.crlvValidade) < new Date()
  const segNear       = !segExpired  && new Date(v.segValidade)  < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  const crlvNear      = !crlvExpired && new Date(v.crlvValidade) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  return (
    <TableRow className="group">
      {/* Modelo */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Car size={15} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary">{v.modelo}</p>
            <p className="text-xs text-ink-muted">{v.marca}</p>
          </div>
        </div>
      </TableCell>

      {/* Placa */}
      <TableCell>
        <span className="font-mono text-sm font-semibold text-ink-primary tracking-wider">{v.placa}</span>
      </TableCell>

      {/* Ano */}
      <TableCell>
        <span className="text-sm text-ink-secondary">{v.ano}</span>
      </TableCell>

      {/* Capacidade */}
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
          <Users size={13} className="text-ink-muted" />
          {v.capacidade}
        </div>
      </TableCell>

      {/* Motorista */}
      <TableCell>
        {v.motorista ? (
          <span className="text-sm text-ink-secondary">{v.motorista}</span>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        )}
      </TableCell>

      {/* Docs */}
      <TableCell>
        <div className="space-y-1">
          <DocValidade label="CRLV" validade={v.crlvValidade} expired={crlvExpired} near={crlvNear} />
          <DocValidade label="Seg."  validade={v.segValidade}  expired={segExpired}  near={segNear}  />
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <VeiculoStatusBadge status={v.status} />
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
            { label: 'Editar',      icon: <Pencil size={14} />,  onClick: onEdit },
            { label: 'Manutenção',  icon: <Wrench size={14} /> },
            { separator: true },
            { label: 'Excluir',     icon: <Trash2 size={14} />,  variant: 'danger' },
          ]}
          align="right"
        />
      </TableCell>
    </TableRow>
  )
}

function DocValidade({ label, validade, expired, near }: {
  label: string; validade: string; expired: boolean; near: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {(expired || near) && <AlertCircle size={10} className={expired ? 'text-danger' : 'text-warn'} />}
      <span className="text-2xs text-ink-muted w-7 shrink-0">{label}</span>
      <span className={cn(
        'text-2xs tabular-nums',
        expired ? 'text-danger font-medium' : near ? 'text-warn-dark font-medium' : 'text-ink-secondary',
      )}>
        {formatDate(validade)}
      </span>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function VeiculoModal({ isOpen, onClose, veiculo }: { isOpen: boolean; onClose: () => void; veiculo: Veiculo | null }) {
  const isEdit = !!veiculo
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Veículo' : 'Novo Veículo'}
      description={isEdit ? `Editando ${veiculo.placa}` : 'Preencha os dados do veículo.'}
      className="max-w-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Placa <span className="text-danger">*</span></label>
          <input defaultValue={veiculo?.placa} placeholder="ABC-1234" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Marca <span className="text-danger">*</span></label>
          <input defaultValue={veiculo?.marca} placeholder="Mercedes-Benz" className={formInputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Modelo <span className="text-danger">*</span></label>
          <input defaultValue={veiculo?.modelo} placeholder="Sprinter 415" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Ano <span className="text-danger">*</span></label>
          <input type="number" defaultValue={veiculo?.ano} placeholder="2023" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Capacidade <span className="text-danger">*</span></label>
          <input type="number" defaultValue={veiculo?.capacidade} placeholder="19" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Validade CRLV</label>
          <input type="date" defaultValue={veiculo?.crlvValidade} className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Validade Seguro</label>
          <input type="date" defaultValue={veiculo?.segValidade} className={formInputCls} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button>{isEdit ? 'Salvar alterações' : 'Cadastrar veículo'}</Button>
      </div>
    </Modal>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVeiculoMap: Record<StatusVeiculo, { label: string; variant: 'active' | 'brand' | 'warn' | 'neutral'; dot?: boolean }> = {
  disponivel:  { label: 'Disponível',  variant: 'active',  dot: false },
  em_rota:     { label: 'Em rota',     variant: 'brand',   dot: true  },
  manutencao:  { label: 'Manutenção',  variant: 'warn',    dot: false },
  inativo:     { label: 'Inativo',     variant: 'neutral'             },
}

function VeiculoStatusBadge({ status }: { status: StatusVeiculo }) {
  const cfg = statusVeiculoMap[status]
  return <Badge variant={cfg.variant} dot={cfg.dot}>{cfg.label}</Badge>
}

function FilterSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
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

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
  Plus, Search, School, MoreHorizontal,
  Pencil, Trash2, Download, Filter,
  MapPin, Phone, Users, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Turno = 'Manhã' | 'Tarde' | 'Integral' | 'Manhã e Tarde'

interface Escola {
  id:          string
  nome:        string
  endereco:    string
  telefone:    string
  turnos:      Turno[]
  alunos:      number
  rotas:       number
  status:      'ativa' | 'inativa'
  criadoEm:   string
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_ESCOLAS: Escola[] = [
  { id:'1', nome:'E.M. João Pessoa',         endereco:'Rua João Pessoa, 100 — Centro',         telefone:'(11) 3211-4500', turnos:['Manhã', 'Tarde'],     alunos:89,  rotas:4, status:'ativa',  criadoEm:'2026-01-05' },
  { id:'2', nome:'E.E. Villa Nova',           endereco:'Av. Villa Nova, 250 — Vila Nova',       telefone:'(11) 3222-5600', turnos:['Manhã', 'Tarde'],     alunos:67,  rotas:3, status:'ativa',  criadoEm:'2026-01-06' },
  { id:'3', nome:'C.E.I. Pequenos Passos',    endereco:'Rua das Crianças, 45 — Jardim América', telefone:'(11) 3233-6700', turnos:['Manhã', 'Integral'],  alunos:38,  rotas:2, status:'ativa',  criadoEm:'2026-01-07' },
  { id:'4', nome:'E.M. Professora Ana Lima',  endereco:'Rua Barão de Campinas, 78 — Planalto',  telefone:'(11) 3244-7800', turnos:['Manhã', 'Tarde'],     alunos:54,  rotas:3, status:'ativa',  criadoEm:'2026-01-08' },
  { id:'5', nome:'E.E. República',            endereco:'Praça da República, 12 — Centro',       telefone:'(11) 3255-8900', turnos:['Manhã e Tarde'],      alunos:36,  rotas:2, status:'ativa',  criadoEm:'2026-01-09' },
  { id:'6', nome:'C.M.E.I. Jardim Feliz',     endereco:'Rua dos Lírios, 67 — Jardim América',   telefone:'(11) 3266-9000', turnos:['Manhã', 'Tarde'],     alunos:0,   rotas:0, status:'inativa', criadoEm:'2026-01-10' },
]

const STATUSES = ['Todas', 'Ativa', 'Inativa']
const PER_PAGE = 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EscolasPage() {
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('Todas')
  const [page,         setPage]         = useState(1)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Escola | null>(null)
  const [loading]                       = useState(false)

  const filtered = useMemo(() => {
    return MOCK_ESCOLAS.filter((e) => {
      const matchSearch = !search ||
        e.nome.toLowerCase().includes(search.toLowerCase()) ||
        e.endereco.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'Todas' ||
        (filterStatus === 'Ativa'   && e.status === 'ativa')  ||
        (filterStatus === 'Inativa' && e.status === 'inativa')
      return matchSearch && matchStatus
    })
  }, [search, filterStatus])

  const totalAtivas = MOCK_ESCOLAS.filter((e) => e.status === 'ativa').length
  const totalAlunos = MOCK_ESCOLAS.reduce((s, e) => s + e.alunos, 0)
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit   = (e: Escola) => { setEditTarget(e); setModalOpen(true) }
  const hasFilters = search || filterStatus !== 'Todas'

  return (
    <Shell
      title="Escolas"
      subtitle={`${totalAtivas} ativas · ${totalAlunos} alunos atendidos`}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Exportar</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Nova Escola</Button>
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
              placeholder="Buscar escola ou endereço…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect value={filterStatus} options={STATUSES} onChange={(v) => { setFilterStatus(v); setPage(1) }} />
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('Todas'); setPage(1) }}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="sm:ml-auto shrink-0">
            <span className="text-xs text-ink-muted tabular-nums">
              {filtered.length} escola{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Tabela ────────────────────────────────────────────────────────── */}
        <Card flush>
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-[280px]">Escola</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Turnos</TableHead>
                <TableHead className="w-24 text-right">Alunos</TableHead>
                <TableHead className="w-20 text-right">Rotas</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-[60px]" />
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={14} width={j === 0 ? '70%' : '50%'} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<School size={22} />}
                      title={hasFilters ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
                      description={hasFilters ? 'Tente ajustar os filtros.' : 'Cadastre a primeira escola atendida.'}
                      action={!hasFilters ? { label: 'Nova Escola', onClick: openCreate } : undefined}
                    />
                  </td>
                </TableRow>
              ) : (
                paginated.map((e) => (
                  <EscolaRow key={e.id} escola={e} onEdit={() => openEdit(e)} />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {filtered.length > PER_PAGE && (
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        )}
      </div>

      <EscolaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} escola={editTarget} />
    </Shell>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function EscolaRow({ escola: e, onEdit }: { escola: Escola; onEdit: () => void }) {
  return (
    <TableRow className="group">
      {/* Nome */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <School size={15} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary truncate">{e.nome}</p>
            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
              <Phone size={10} />
              {e.telefone}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Endereço */}
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
          <MapPin size={12} className="text-ink-muted shrink-0" />
          <span className="truncate max-w-[220px]">{e.endereco}</span>
        </div>
      </TableCell>

      {/* Turnos */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {e.turnos.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-2xs font-medium text-ink-secondary">
              <Clock size={9} className="text-ink-muted" />
              {t}
            </span>
          ))}
        </div>
      </TableCell>

      {/* Alunos */}
      <TableCell>
        <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-ink-primary tabular-nums">
          <Users size={12} className="text-ink-muted" />
          {e.alunos}
        </div>
      </TableCell>

      {/* Rotas */}
      <TableCell>
        <div className="text-sm font-semibold text-ink-primary tabular-nums text-right">{e.rotas}</div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={e.status === 'ativa' ? 'active' : 'neutral'} dot={e.status === 'ativa'}>
          {e.status === 'ativa' ? 'Ativa' : 'Inativa'}
        </Badge>
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
            { label: 'Editar',  icon: <Pencil size={14} />, onClick: onEdit },
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

function EscolaModal({ isOpen, onClose, escola }: { isOpen: boolean; onClose: () => void; escola: Escola | null }) {
  const isEdit = !!escola
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Escola' : 'Nova Escola'}
      description={isEdit ? `Editando ${escola.nome}` : 'Cadastre uma escola atendida pela operação.'}
      className="max-w-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Nome <span className="text-danger">*</span></label>
          <input defaultValue={escola?.nome} placeholder="Ex: E.M. João Pessoa" className={formInputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Endereço <span className="text-danger">*</span></label>
          <input defaultValue={escola?.endereco} placeholder="Rua, número — Bairro" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Telefone</label>
          <input defaultValue={escola?.telefone} placeholder="(11) 3200-0000" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Status</label>
          <select defaultValue={escola?.status} className={formInputCls}>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button>{isEdit ? 'Salvar alterações' : 'Cadastrar escola'}</Button>
      </div>
    </Modal>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

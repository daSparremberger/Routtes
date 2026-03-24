'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, EmptyState,
  Skeleton, Dropdown, Pagination, Modal, Separator,
} from '@/components/ui'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Search, Route, MoreHorizontal,
  Pencil, Trash2, Download, Filter,
  School, Users, MapPin, Play, Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Turno = 'Manhã' | 'Tarde' | 'Integral'
type StatusRota = 'ativa' | 'inativa' | 'rascunho'
type TipoRota = 'ida' | 'volta' | 'ida_volta'

interface Parada {
  ordem:    number
  endereco: string
  alunos:   number
}

interface Rota {
  id:          string
  nome:        string
  escola:      string
  turno:       Turno
  tipo:        TipoRota
  paradas:     Parada[]
  alunos:      number
  motorista?:  string
  veiculo?:    string
  status:      StatusRota
  criadoEm:   string
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_ROTAS: Rota[] = [
  {
    id:'1', nome:'Rota Jardim América — Manhã', escola:'E.M. João Pessoa', turno:'Manhã',
    tipo:'ida_volta', alunos:16, motorista:'Carlos Silva', veiculo:'ABC-1234', status:'ativa', criadoEm:'2026-01-20',
    paradas:[
      { ordem:1, endereco:'Rua das Flores, 45',     alunos:3 },
      { ordem:2, endereco:'Av. Brasil, 200',         alunos:5 },
      { ordem:3, endereco:'Rua do Bosque, 12',       alunos:4 },
      { ordem:4, endereco:'Praça Central, 3',        alunos:4 },
    ],
  },
  {
    id:'2', nome:'Rota Centro — Tarde', escola:'E.M. João Pessoa', turno:'Tarde',
    tipo:'ida_volta', alunos:12, motorista:'Maria Santos', veiculo:'DEF-5678', status:'ativa', criadoEm:'2026-01-21',
    paradas:[
      { ordem:1, endereco:'Rua das Acácias, 78',    alunos:4 },
      { ordem:2, endereco:'Av. Paulista, 550',       alunos:4 },
      { ordem:3, endereco:'Rua XV de Novembro, 89',  alunos:4 },
    ],
  },
  {
    id:'3', nome:'Rota Vila Nova — Manhã', escola:'E.E. Villa Nova', turno:'Manhã',
    tipo:'ida_volta', alunos:11, motorista:'José Oliveira', veiculo:'GHI-9012', status:'ativa', criadoEm:'2026-01-22',
    paradas:[
      { ordem:1, endereco:'Rua Ipê Amarelo, 23',     alunos:3 },
      { ordem:2, endereco:'Alameda Santos, 67',       alunos:4 },
      { ordem:3, endereco:'Rua dos Pinheiros, 34',   alunos:4 },
    ],
  },
  {
    id:'4', nome:'Rota Planalto — Tarde', escola:'E.M. João Pessoa', turno:'Tarde',
    tipo:'ida_volta', alunos:14, motorista:'Pedro Costa', veiculo:'JKL-3456', status:'ativa', criadoEm:'2026-01-23',
    paradas:[
      { ordem:1, endereco:'Av. das Américas, 120',   alunos:5 },
      { ordem:2, endereco:'Rua do Comércio, 45',     alunos:5 },
      { ordem:3, endereco:'Rua Augusta, 234',        alunos:4 },
    ],
  },
  {
    id:'5', nome:'Rota CEI Pequenos Passos', escola:'C.E.I. Pequenos Passos', turno:'Integral',
    tipo:'ida_volta', alunos:22, motorista:undefined, veiculo:undefined, status:'rascunho', criadoEm:'2026-01-24',
    paradas:[],
  },
  {
    id:'6', nome:'Rota República — Manhã', escola:'E.E. República', turno:'Manhã',
    tipo:'ida', alunos:0, motorista:undefined, veiculo:undefined, status:'inativa', criadoEm:'2026-01-25',
    paradas:[],
  },
]

const ESCOLAS  = ['Todas as escolas', 'E.M. João Pessoa', 'E.E. Villa Nova', 'C.E.I. Pequenos Passos', 'E.E. República']
const TURNOS   = ['Todos os turnos', 'Manhã', 'Tarde', 'Integral']
const STATUSES = ['Todos', 'Ativa', 'Inativa', 'Rascunho']
const PER_PAGE = 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RotasPage() {
  const [search,       setSearch]       = useState('')
  const [filterEscola, setFilterEscola] = useState('Todas as escolas')
  const [filterTurno,  setFilterTurno]  = useState('Todos os turnos')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [page,         setPage]         = useState(1)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Rota | null>(null)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [loading]                       = useState(false)

  const filtered = useMemo(() => {
    return MOCK_ROTAS.filter((r) => {
      const matchSearch = !search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.escola.toLowerCase().includes(search.toLowerCase())
      const matchEscola = filterEscola === 'Todas as escolas' || r.escola === filterEscola
      const matchTurno  = filterTurno  === 'Todos os turnos'  || r.turno  === filterTurno
      const matchStatus = filterStatus === 'Todos' ||
        (filterStatus === 'Ativa'    && r.status === 'ativa')    ||
        (filterStatus === 'Inativa'  && r.status === 'inativa')  ||
        (filterStatus === 'Rascunho' && r.status === 'rascunho')
      return matchSearch && matchEscola && matchTurno && matchStatus
    })
  }, [search, filterEscola, filterTurno, filterStatus])

  const totalAtivas = MOCK_ROTAS.filter((r) => r.status === 'ativa').length
  const totalAlunos = MOCK_ROTAS.filter((r) => r.status === 'ativa').reduce((s, r) => s + r.alunos, 0)
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit   = (r: Rota) => { setEditTarget(r); setModalOpen(true) }
  const hasFilters = search || filterEscola !== 'Todas as escolas' || filterTurno !== 'Todos os turnos' || filterStatus !== 'Todos'

  return (
    <Shell
      title="Rotas"
      subtitle={`${totalAtivas} ativas · ${totalAlunos} alunos cobertos`}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Exportar</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Nova Rota</Button>
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
              placeholder="Buscar rota ou escola…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect value={filterEscola} options={ESCOLAS}  onChange={(v) => { setFilterEscola(v); setPage(1) }} />
            <FilterSelect value={filterTurno}  options={TURNOS}   onChange={(v) => { setFilterTurno(v);  setPage(1) }} />
            <FilterSelect value={filterStatus} options={STATUSES} onChange={(v) => { setFilterStatus(v); setPage(1) }} />
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterEscola('Todas as escolas'); setFilterTurno('Todos os turnos'); setFilterStatus('Todos'); setPage(1) }}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="sm:ml-auto shrink-0">
            <span className="text-xs text-ink-muted tabular-nums">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Lista ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <Skeleton height={20} width="40%" />
                <div className="mt-2">
                  <Skeleton height={14} width="60%" />
                </div>
              </Card>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Route size={22} />}
              title={hasFilters ? 'Nenhuma rota encontrada' : 'Nenhuma rota cadastrada'}
              description={hasFilters ? 'Tente ajustar os filtros.' : 'Comece criando a primeira rota da operação.'}
              action={!hasFilters ? { label: 'Nova Rota', onClick: openCreate } : undefined}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {paginated.map((rota) => (
              <RotaCard
                key={rota.id}
                rota={rota}
                expanded={expandedId === rota.id}
                onToggle={() => setExpandedId(expandedId === rota.id ? null : rota.id)}
                onEdit={() => openEdit(rota)}
              />
            ))}
          </div>
        )}

        {filtered.length > PER_PAGE && (
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        )}
      </div>

      <RotaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} rota={editTarget} />
    </Shell>
  )
}

// ─── Rota Card (expansível) ───────────────────────────────────────────────────

function RotaCard({
  rota, expanded, onToggle, onEdit,
}: { rota: Rota; expanded: boolean; onToggle: () => void; onEdit: () => void }) {
  return (
    <Card className={cn('transition-all duration-200', expanded && 'shadow-card-md')}>
      {/* Header */}
      <div
        className="flex items-start gap-4 cursor-pointer"
        onClick={onToggle}
      >
        {/* Icon */}
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5',
          rota.status === 'ativa'    ? 'bg-brand-50 text-brand-600' :
          rota.status === 'rascunho' ? 'bg-warn-light text-warn-dark' :
          'bg-surface-hover text-ink-muted',
        )}>
          <Route size={16} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-primary">{rota.nome}</span>
            <StatusRotaBadge status={rota.status} />
            <TurnoTag turno={rota.turno} />
            <TipoTag tipo={rota.tipo} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-ink-muted flex-wrap">
            <span className="flex items-center gap-1">
              <School size={11} />
              {rota.escola}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {rota.alunos} alunos
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {rota.paradas.length} paradas
            </span>
            {rota.motorista && (
              <span className="text-ink-secondary">{rota.motorista} · <span className="font-mono">{rota.veiculo}</span></span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {rota.status === 'ativa' && (
            <Button variant="ghost" size="sm" icon={<Play size={13} />}>
              Executar
            </Button>
          )}
          <Dropdown
            trigger={
              <button className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover hover:text-ink-primary transition-colors">
                <MoreHorizontal size={15} />
              </button>
            }
            items={[
              { label: 'Editar',     icon: <Pencil size={14} />, onClick: onEdit },
              { label: 'Duplicar',   icon: <Copy   size={14} /> },
              { separator: true },
              { label: 'Excluir',    icon: <Trash2 size={14} />, variant: 'danger' },
            ]}
            align="right"
          />
        </div>
      </div>

      {/* Paradas expandidas */}
      {expanded && rota.paradas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-border animate-fade-in">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            Paradas ({rota.paradas.length})
          </p>
          <ol className="space-y-2">
            {rota.paradas.map((p) => (
              <li key={p.ordem} className="flex items-center gap-3 group/parada">
                {/* Ordem */}
                <span className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  'text-2xs font-bold border',
                  p.ordem === 1
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-surface-hover text-ink-secondary border-surface-border',
                )}>
                  {p.ordem}
                </span>
                {/* Linha conectora */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-primary truncate">{p.endereco}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted shrink-0">
                    <Users size={11} />
                    {p.alunos}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function RotaModal({ isOpen, onClose, rota }: { isOpen: boolean; onClose: () => void; rota: Rota | null }) {
  const isEdit = !!rota
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Rota' : 'Nova Rota'}
      description={isEdit ? `Editando ${rota.nome}` : 'Configure a nova rota operacional.'}
      className="max-w-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Nome da rota <span className="text-danger">*</span></label>
          <input defaultValue={rota?.nome} placeholder="Ex: Rota Jardim América — Manhã" className={formInputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Escola <span className="text-danger">*</span></label>
          <select defaultValue={rota?.escola} className={formInputCls}>
            <option value="">Selecione…</option>
            {ESCOLAS.slice(1).map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Turno <span className="text-danger">*</span></label>
          <select defaultValue={rota?.turno} className={formInputCls}>
            <option value="">Selecione…</option>
            {['Manhã','Tarde','Integral'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Tipo</label>
          <select defaultValue={rota?.tipo} className={formInputCls}>
            <option value="ida">Ida</option>
            <option value="volta">Volta</option>
            <option value="ida_volta">Ida e Volta</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Status</label>
          <select defaultValue={rota?.status} className={formInputCls}>
            <option value="rascunho">Rascunho</option>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </select>
        </div>

        <Separator label="Escalação (opcional)" className="col-span-2" />

        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Motorista</label>
          <select className={formInputCls}>
            <option value="">Nenhum</option>
            {['Carlos Silva','Maria Santos','José Oliveira','Pedro Costa'].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">Veículo</label>
          <select className={formInputCls}>
            <option value="">Nenhum</option>
            {['ABC-1234','DEF-5678','GHI-9012','JKL-3456'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button>{isEdit ? 'Salvar alterações' : 'Criar rota'}</Button>
      </div>
    </Modal>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusRotaBadge({ status }: { status: StatusRota }) {
  if (status === 'ativa')    return <Badge variant="active"  dot>Ativa</Badge>
  if (status === 'rascunho') return <Badge variant="warn">Rascunho</Badge>
  return <Badge variant="neutral">Inativa</Badge>
}

const turnoColors: Record<Turno, string> = {
  'Manhã':    'bg-brand-50 text-brand-700 border-brand-200',
  'Tarde':    'bg-warn-light text-warn-dark border-warn/20',
  'Integral': 'bg-active-light text-active-dark border-active/20',
}

function TurnoTag({ turno }: { turno: Turno }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-2xs font-medium border', turnoColors[turno])}>
      {turno}
    </span>
  )
}

function TipoTag({ tipo }: { tipo: TipoRota }) {
  const labels: Record<TipoRota, string> = { ida: 'Ida', volta: 'Volta', ida_volta: 'Ida e volta' }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-2xs font-medium border bg-surface-hover text-ink-secondary border-surface-border">
      {labels[tipo]}
    </span>
  )
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

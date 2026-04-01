'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, CardHeader, Separator,
} from '@/components/ui'
import {
  Building2, Bell, Shield, Palette,
  Save, Globe, Phone, Mail, Clock,
  ChevronRight, User, LogOut, Key,
  Smartphone, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Seções de configuração ───────────────────────────────────────────────────

type Section = 'organizacao' | 'notificacoes' | 'seguranca' | 'aparencia' | 'conta'

const sections: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id:'organizacao',  label:'Organização',    icon:Building2,     description:'Dados da empresa e operação' },
  { id:'notificacoes', label:'Notificações',   icon:Bell,          description:'Push, WhatsApp e alertas' },
  { id:'seguranca',    label:'Segurança',      icon:Shield,        description:'Senhas, sessões e acessos' },
  { id:'aparencia',    label:'Aparência',      icon:Palette,       description:'Tema e preferências visuais' },
  { id:'conta',        label:'Minha conta',    icon:User,          description:'Perfil e dados pessoais' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [activeSection, setActiveSection] = useState<Section>('organizacao')

  return (
    <Shell
      title="Configurações"
    >
      <div className="flex gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 140px)' }}>

        {/* ── Sidebar de seções ──────────────────────────────────────────────── */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon
              const active = activeSection === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                    'transition-colors duration-150 group',
                    active
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary border border-transparent',
                  )}
                >
                  <Icon size={16} className={cn('shrink-0', active ? 'text-brand-600' : 'text-ink-muted group-hover:text-ink-secondary')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                  </div>
                  {active && <ChevronRight size={14} className="text-brand-400 shrink-0" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {activeSection === 'organizacao'  && <OrganizacaoSection />}
          {activeSection === 'notificacoes' && <NotificacoesSection />}
          {activeSection === 'seguranca'    && <SegurancaSection />}
          {activeSection === 'aparencia'    && <AparenciaSection />}
          {activeSection === 'conta'        && <ContaSection />}
        </div>
      </div>
    </Shell>
  )
}

// ─── Organização ──────────────────────────────────────────────────────────────

function OrganizacaoSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Dados da Organização" subtitle="Informações da empresa de transporte" />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Nome da organização <span className="text-danger">*</span></label>
            <input defaultValue="Transporte Escolar Silva & Filhos" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>CNPJ</label>
            <input defaultValue="12.345.678/0001-90" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone principal</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input defaultValue="(11) 3200-0000" className={cn(inputCls, 'pl-9')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>E-mail de contato</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input defaultValue="contato@transportesilva.com.br" className={cn(inputCls, 'pl-9')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Site</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input defaultValue="www.transportesilva.com.br" className={cn(inputCls, 'pl-9')} />
            </div>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Endereço</label>
            <input defaultValue="Rua das Operações, 123 — São Paulo, SP" className={inputCls} />
          </div>
        </div>
        <SaveButton />
      </Card>

      <Card>
        <CardHeader title="Configurações Operacionais" subtitle="Parâmetros da operação diária" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fuso horário</label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <select className={cn(inputCls, 'pl-9')}>
                <option>America/Sao_Paulo (GMT-3)</option>
                <option>America/Manaus (GMT-4)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Tolerância de atraso (min)</label>
            <input type="number" defaultValue={10} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Máx. tentativas de notificação</label>
            <input type="number" defaultValue={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Intervalo de rastreamento (seg)</label>
            <input type="number" defaultValue={15} className={inputCls} />
          </div>
        </div>
        <SaveButton />
      </Card>
    </div>
  )
}

// ─── Notificações ─────────────────────────────────────────────────────────────

function NotificacoesSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Push Notifications (FCM)" subtitle="Notificações para o app dos motoristas" />
        <div className="space-y-4">
          <ToggleRow
            label="Início de rota"
            description="Notifica o motorista quando a rota é iniciada"
            icon={<Smartphone size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Aluno embarcado"
            description="Confirma o embarque de cada aluno"
            icon={<Smartphone size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Alerta de atraso"
            description="Notifica ao ultrapassar a tolerância configurada"
            icon={<Smartphone size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Fim de rota"
            description="Notifica a conclusão da execução"
            icon={<Smartphone size={15} />}
            defaultChecked
          />
        </div>
        <SaveButton />
      </Card>

      <Card>
        <CardHeader
          title="WhatsApp Business"
          subtitle="Notificações automáticas para responsáveis"
          action={<Badge variant="active" dot>Conectado</Badge>}
        />
        <div className="space-y-4">
          <ToggleRow
            label="Aluno embarcado"
            description="Notifica o responsável quando o aluno embarca na van"
            icon={<MessageSquare size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Aluno desembarcado"
            description="Notifica a chegada na escola ou em casa"
            icon={<MessageSquare size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Rota cancelada"
            description="Aviso automático de cancelamento de rota"
            icon={<MessageSquare size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Atraso significativo"
            description="Alerta quando o atraso supera 15 minutos"
            icon={<MessageSquare size={15} />}
          />
        </div>
        <SaveButton />
      </Card>
    </div>
  )
}

// ─── Segurança ────────────────────────────────────────────────────────────────

function SegurancaSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Sessão e Autenticação" subtitle="Configurações de acesso ao dashboard" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tempo de sessão (horas)</label>
            <input type="number" defaultValue={24} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Máx. tentativas de login</label>
            <input type="number" defaultValue={5} className={inputCls} />
          </div>
        </div>
        <Separator className="my-4" />
        <div className="space-y-3">
          <ToggleRow
            label="Autenticação via Google"
            description="Login com contas Google (recomendado)"
            icon={<Key size={15} />}
            defaultChecked
          />
          <ToggleRow
            label="Exigir 2FA para gestores"
            description="Dupla autenticação obrigatória para perfis de gestor"
            icon={<Shield size={15} />}
          />
        </div>
        <SaveButton />
      </Card>

      <Card accent="warn">
        <CardHeader title="Zona de Perigo" subtitle="Ações irreversíveis — proceda com cuidado" />
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-ink-primary">Exportar todos os dados</p>
              <p className="text-xs text-ink-muted mt-0.5">Download completo dos dados da organização</p>
            </div>
            <Button variant="secondary" size="sm">Exportar</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-danger">Excluir organização</p>
              <p className="text-xs text-ink-muted mt-0.5">Remove permanentemente todos os dados</p>
            </div>
            <Button variant="secondary" size="sm" className="text-danger border-danger/30 hover:bg-danger-light">
              Excluir
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── Aparência ────────────────────────────────────────────────────────────────

function AparenciaSection() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Tema" subtitle="Escolha o modo de exibição do dashboard" />
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                theme === t ? 'border-brand-600 bg-brand-50' : 'border-surface-border hover:border-brand-300',
              )}
            >
              {/* Preview */}
              <div className={cn(
                'w-full h-10 rounded-md border',
                t === 'light'  ? 'bg-white border-surface-border' :
                t === 'dark'   ? 'bg-shell-900 border-shell-600' :
                'bg-gradient-to-r from-white to-shell-900 border-surface-border',
              )} />
              <span className={cn(
                'text-sm font-medium',
                theme === t ? 'text-brand-700' : 'text-ink-secondary',
              )}>
                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-3">
          Modo escuro está em desenvolvimento — disponível em breve.
        </p>
        <SaveButton />
      </Card>

      <Card>
        <CardHeader title="Preferências de exibição" />
        <div className="space-y-4">
          <ToggleRow
            label="Sidebar recolhida por padrão"
            description="Inicia com o menu lateral compacto"
            icon={<Palette size={15} />}
          />
          <ToggleRow
            label="Animações de interface"
            description="Transições e microinterações"
            icon={<Palette size={15} />}
            defaultChecked
          />
        </div>
        <SaveButton />
      </Card>
    </div>
  )
}

// ─── Conta ────────────────────────────────────────────────────────────────────

function ContaSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Perfil" subtitle="Dados da sua conta de gestor" />
        <div className="flex items-start gap-5 mb-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xl font-bold">
            A
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-primary">Ana Coordenadora</p>
            <p className="text-xs text-ink-muted">ana@transporte.com.br</p>
            <Badge variant="brand" className="mt-2">Gestor</Badge>
          </div>
          <Button variant="secondary" size="sm">Alterar foto</Button>
        </div>
        <Separator className="mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome completo</label>
            <input defaultValue="Ana Coordenadora" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input defaultValue="(11) 99999-8888" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>E-mail</label>
            <input defaultValue="ana@transporte.com.br" disabled className={cn(inputCls, 'opacity-60 cursor-not-allowed')} />
            <p className="text-2xs text-ink-muted mt-1">O e-mail é gerenciado pela autenticação Google.</p>
          </div>
        </div>
        <SaveButton />
      </Card>

      <Card>
        <CardHeader title="Sessão" />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-ink-primary">Encerrar sessão</p>
            <p className="text-xs text-ink-muted mt-0.5">Sai do dashboard em todos os dispositivos</p>
          </div>
          <Button variant="secondary" size="sm" icon={<LogOut size={14} />}>
            Sair
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, icon, defaultChecked,
}: { label: string; description: string; icon: React.ReactNode; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(!!defaultChecked)

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-ink-muted">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={cn(
          'relative shrink-0 h-5 w-9 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-surface-border',
        )}
        role="switch"
        aria-checked={checked}
      >
        <span className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </button>
    </div>
  )
}

function SaveButton() {
  return (
    <div className="flex justify-end mt-5 pt-4 border-t border-surface-border">
      <Button size="sm" icon={<Save size={14} />}>Salvar alterações</Button>
    </div>
  )
}

const labelCls = 'block text-sm font-medium text-ink-primary mb-1.5'

const inputCls = cn(
  'w-full h-9 px-3 text-sm rounded-md',
  'border border-surface-border bg-surface-card text-ink-primary',
  'placeholder:text-ink-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
  'transition-colors duration-150',
)

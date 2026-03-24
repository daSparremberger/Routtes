import Link from 'next/link'
import { Button } from '@/components/ui'
import {
  ArrowRight, MapPin, Clock, ShieldCheck, Smartphone,
  Target, LayoutDashboard, CheckCircle2, Users, Route,
  Play, AlertTriangle, Truck, TrendingUp, Star,
  Building2, GraduationCap, User,
} from 'lucide-react'

export const metadata = {
  title: 'Routtes — Plataforma Operacional de Transporte Escolar',
  description:
    'A base operacional inteligente do seu transporte escolar. Gestão, rotas em tempo real e segurança.',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const socialProof = [
  { value: '1.2M+', label: 'Rotas Navegadas' },
  { value: '99.9%', label: 'Uptime Operacional' },
  { value: '5k+',   label: 'Motoristas' },
  { value: '220',   label: 'Prefeituras & Escolas' },
]

const features = [
  {
    icon:  MapPin,
    color: 'text-brand-600',
    bg:    'bg-brand-50',
    title: 'Roteirização Inteligente',
    desc:  'Cálculo preditivo com Mapbox considerando as paradas reais da van, não apenas o trajeto de carros comuns.',
  },
  {
    icon:  ShieldCheck,
    color: 'text-active',
    bg:    'bg-active-light',
    title: 'Segurança Total',
    desc:  'Trava anti-esquecimento e monitoramento que notifica imediatamente se um aluno não foi desembarcado.',
  },
  {
    icon:  Clock,
    color: 'text-warn-dark',
    bg:    'bg-warn-light',
    title: 'Previsibilidade Realtime',
    desc:  'Alertas automáticos via FCM para pais quando o veículo estiver próximo do ponto de embarque.',
  },
  {
    icon:  Smartphone,
    color: 'text-brand-600',
    bg:    'bg-brand-50',
    title: 'App do Motorista',
    desc:  'Interface operacional focada em execução — mapa 3D, check-in de alunos e reporte de eventos.',
  },
  {
    icon:  LayoutDashboard,
    color: 'text-active',
    bg:    'bg-active-light',
    title: 'Dashboard Operacional',
    desc:  'Central de controle com execuções ao vivo, alertas, frequência e histórico completo.',
  },
  {
    icon:  Route,
    color: 'text-warn-dark',
    bg:    'bg-warn-light',
    title: 'Gestão de Frotas',
    desc:  'Controle completo de veículos, motoristas, escalas e manutenção em um único lugar.',
  },
]

const audiences = [
  {
    icon:  Building2,
    title: 'Prefeituras',
    desc:  'Controle centralizado de toda a frota pública municipal, com relatórios para prestação de contas.',
    items: ['Gestão multi-escola', 'Relatórios de frequência', 'Controle de contratos'],
  },
  {
    icon:  GraduationCap,
    title: 'Empresas de Vans',
    desc:  'Operação profissional para frotas de qualquer tamanho, com rotas otimizadas e rastreamento.',
    items: ['Otimização de rotas', 'Painel do gestor', 'App para motoristas'],
  },
  {
    icon:  User,
    title: 'Autônomos',
    desc:  'Tudo que o motorista autônomo precisa para gerenciar sozinho — do cadastro dos alunos à execução.',
    items: ['App único completo', 'Sem gestor necessário', 'Gestão simplificada'],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-surface flex flex-col font-sans">

      {/* ─── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-ink-primary">Routtes</span>
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-ink-secondary">
            <Link href="#como-funciona" className="hover:text-ink-primary transition-colors duration-150">
              Como Funciona
            </Link>
            <Link href="#recursos" className="hover:text-ink-primary transition-colors duration-150">
              Recursos
            </Link>
            <Link href="#publico" className="hover:text-ink-primary transition-colors duration-150">
              Para quem
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Entrar
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Acessar Painel</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ─── HERO ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-24">
          {/* Background */}
          <div className="absolute inset-0 bg-dot-grid opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/80 via-surface to-surface" />

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Copy */}
              <div className="max-w-xl animate-fade-in">
                <div className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-700 mb-6 gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-brand-600 opacity-50 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                  </span>
                  Operação de transporte inteligente
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink-primary mb-5 leading-[1.1]">
                  A base operacional do seu{' '}
                  <span className="text-gradient">transporte escolar</span>
                  .
                </h1>

                <p className="text-lg text-ink-secondary mb-8 leading-relaxed">
                  Gerencie rotas, motoristas e alunos em um único sistema. Do cadastro ao rastreamento em tempo real — tudo integrado.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" icon={<ArrowRight size={16} />} iconPosition="right">
                    Começar agora
                  </Button>
                  <Button variant="secondary" size="lg">
                    Ver demonstração
                  </Button>
                </div>

                {/* Trust badges */}
                <div className="mt-8 flex items-center gap-4 text-xs text-ink-muted">
                  {['Sem cartão de crédito', 'Setup em 30 min', 'Suporte incluído'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-active" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard mockup */}
              <div className="relative animate-slide-up">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ───────────────────────────────────────────────────── */}
        <section className="border-y border-surface-border bg-surface-card py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {socialProof.map((item, i) => (
                <div key={i} className="py-2">
                  <p className="text-3xl font-bold text-ink-primary tabular-nums">{item.value}</p>
                  <p className="text-sm text-ink-muted mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── COMO FUNCIONA ───────────────────────────────────────────────────── */}
        <section id="como-funciona" className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-3">
                Processo
              </p>
              <h2 className="text-3xl font-bold text-ink-primary mb-4">
                Operação fluida do início ao fim
              </h2>
              <p className="text-lg text-ink-secondary">
                Três passos para dominar a logística diária sem planilhas ou dor de cabeça.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-surface-border" />

              {[
                {
                  step:  '01',
                  icon:  Target,
                  color: 'bg-brand-600',
                  title: 'Planeje as Rotas',
                  desc:  'Cadastre os alunos e a Routtes gera a rota otimizada automaticamente via Mapbox.',
                },
                {
                  step:  '02',
                  icon:  Smartphone,
                  color: 'bg-active',
                  title: 'Execute com o App',
                  desc:  'O motorista usa o app focado: mapa 3D guiado, alertas simples e registro de presença.',
                },
                {
                  step:  '03',
                  icon:  LayoutDashboard,
                  color: 'bg-brand-600',
                  title: 'Controle em Tempo Real',
                  desc:  'O gestor acompanha no dashboard: atrasos, avarias, check-ins — tudo em tempo real.',
                },
              ].map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.step}
                    className="relative bg-surface-card rounded-2xl p-8 border border-surface-border shadow-card hover:shadow-card-md transition-shadow"
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <div className={`h-10 w-10 ${step.color} text-white rounded-xl flex items-center justify-center shrink-0`}>
                        <Icon size={20} />
                      </div>
                      <span className="text-4xl font-bold text-surface-border leading-none mt-0.5 select-none">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-ink-primary mb-2">{step.title}</h3>
                    <p className="text-sm text-ink-secondary leading-relaxed">{step.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ────────────────────────────────────────────────────────── */}
        <section id="recursos" className="py-24 bg-surface-card border-y border-surface-border">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-3">
                Recursos
              </p>
              <h2 className="text-3xl font-bold text-ink-primary mb-4">
                Tudo que você precisa na operação
              </h2>
              <p className="text-lg text-ink-secondary">
                Uma plataforma completa, não um conjunto de ferramentas soltas.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => {
                const Icon = f.icon
                return (
                  <div
                    key={f.title}
                    className="rounded-xl p-6 border border-surface-border bg-surface hover:bg-surface-card hover:shadow-card-md transition-all duration-200 group"
                  >
                    <div className={`h-10 w-10 ${f.bg} ${f.color} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="text-base font-semibold text-ink-primary mb-2">{f.title}</h3>
                    <p className="text-sm text-ink-secondary leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── APP MOCKUP SECTION ──────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-3">
                  App do Motorista
                </p>
                <h2 className="text-3xl font-bold text-ink-primary mb-4">
                  Interface focada em quem está no volante
                </h2>
                <p className="text-lg text-ink-secondary mb-8 leading-relaxed">
                  Mapa 3D inclinado estilo navegação profissional. Registro de presença com um toque. Sem distrações, apenas o essencial para executar com segurança.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: MapPin,        text: 'Mapa Mapbox 3D com câmera inclinada e rota destacada' },
                    { icon: CheckCircle2,  text: 'Check-in de alunos com um toque — embarcou / não compareceu' },
                    { icon: ShieldCheck,   text: 'Encerramento seguro com checklist anti-esquecimento' },
                    { icon: AlertTriangle, text: 'Reporte de eventos: avaria, atraso, desvio' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.text} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon size={13} />
                        </div>
                        <p className="text-sm text-ink-secondary">{item.text}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Flutter App Mockup */}
              <div className="flex justify-center">
                <FlutterMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── PARA QUEM ────────────────────────────────────────────────────────── */}
        <section id="publico" className="py-24 bg-surface-card border-y border-surface-border">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-3">
                Para quem
              </p>
              <h2 className="text-3xl font-bold text-ink-primary mb-4">
                Feito para toda a cadeia operacional
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {audiences.map((a) => {
                const Icon = a.icon
                return (
                  <div
                    key={a.title}
                    className="rounded-2xl border border-surface-border bg-surface p-7"
                  >
                    <div className="h-12 w-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-5">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-lg font-semibold text-ink-primary mb-2">{a.title}</h3>
                    <p className="text-sm text-ink-secondary mb-5 leading-relaxed">{a.desc}</p>
                    <ul className="space-y-2.5">
                      {a.items.map((item) => (
                        <li key={item} className="flex items-center gap-2.5 text-sm">
                          <CheckCircle2 size={14} className="text-active shrink-0" />
                          <span className="text-ink-secondary">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-shell-900" />
          <div className="absolute inset-0 bg-dot-grid opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900/60 via-shell-900 to-shell-900" />

          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-700/50 bg-brand-900/50 px-3 py-1 text-sm text-brand-300 mb-6">
              <Star size={12} className="text-brand-400" />
              14 dias grátis, sem cartão
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-inverted mb-5 leading-tight">
              Pronto para transformar sua operação de transporte?
            </h2>
            <p className="text-ink-muted text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Pare de depender de planilhas e grupos de WhatsApp. Comece a usar inteligência operacional real.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-white text-shell-900 hover:bg-brand-50 h-12 px-8 shadow-lg font-semibold"
              >
                Começar Trial Grátis
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-shell-600 text-ink-muted hover:bg-shell-800 hover:text-ink-inverted h-12 px-8"
              >
                Falar com consultor
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-shell-900 border-t border-shell-800">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-brand-600 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold text-ink-inverted">Routtes</span>
            </div>
            <p className="text-xs text-ink-muted text-center">
              © {new Date().getFullYear()} Routtes. A base inteligente do transporte escolar.
            </p>
            <div className="flex gap-5 text-xs text-ink-muted">
              <Link href="#" className="hover:text-ink-inverted transition-colors">Privacidade</Link>
              <Link href="#" className="hover:text-ink-inverted transition-colors">Termos</Link>
              <Link href="#" className="hover:text-ink-inverted transition-colors">Contato</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Dashboard Mockup (HTML/Tailwind) ────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Glow */}
      <div className="absolute -inset-4 bg-brand-600/10 rounded-3xl blur-2xl" />

      {/* Window chrome */}
      <div className="relative rounded-2xl border border-surface-border shadow-modal overflow-hidden bg-surface-card">
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border bg-surface">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-danger opacity-80" />
            <div className="h-3 w-3 rounded-full bg-warn opacity-80" />
            <div className="h-3 w-3 rounded-full bg-active opacity-80" />
          </div>
          <div className="flex-1 mx-3">
            <div className="h-5 rounded-md bg-surface-hover mx-auto max-w-32" />
          </div>
        </div>

        <div className="flex h-72">
          {/* Sidebar mini */}
          <div className="w-12 bg-shell-900 flex flex-col items-center py-3 gap-3">
            <div className="h-6 w-6 rounded-md bg-brand-600 flex items-center justify-center">
              <div className="h-2 w-2 rounded-sm bg-white opacity-80" />
            </div>
            {[LayoutDashboard, Users, Route, Play, TrendingUp].map((Icon, i) => (
              <div
                key={i}
                className={`h-7 w-7 rounded-md flex items-center justify-center ${i === 0 ? 'bg-shell-700' : 'hover:bg-shell-800'}`}
              >
                <Icon size={13} className={i === 0 ? 'text-brand-400' : 'text-shell-500'} />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-hidden">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { v: '12', l: 'Rotas', c: 'text-active', bg: 'bg-active-light' },
                { v: '284', l: 'Alunos', c: 'text-brand-600', bg: 'bg-brand-50' },
                { v: '8', l: 'Ativos', c: 'text-brand-600', bg: 'bg-brand-50' },
                { v: '3', l: 'Alertas', c: 'text-warn-dark', bg: 'bg-warn-light' },
              ].map((kpi) => (
                <div key={kpi.l} className="bg-surface-card rounded-lg border border-surface-border p-2.5">
                  <div className={`text-sm font-bold tabular-nums ${kpi.c}`}>{kpi.v}</div>
                  <div className="text-2xs text-ink-muted mt-0.5">{kpi.l}</div>
                </div>
              ))}
            </div>

            {/* Execution cards */}
            <div className="space-y-1.5 mb-3">
              {[
                { name: 'Rota Jardim América',  pct: 87, status: 'active',  driver: 'Carlos S.' },
                { name: 'Rota Centro',           pct: 75, status: 'active',  driver: 'Maria S.'  },
                { name: 'Rota Planalto',         pct: 43, status: 'warn',    driver: 'Pedro C.'  },
              ].map((r) => (
                <div
                  key={r.name}
                  className="flex items-center gap-2.5 bg-surface-card rounded-lg border border-surface-border px-2.5 py-1.5"
                >
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    r.status === 'active' ? 'bg-active' : 'bg-warn'
                  }`} />
                  <span className="text-2xs font-medium text-ink-primary flex-1 truncate">{r.name}</span>
                  <span className="text-2xs text-ink-muted shrink-0">{r.driver}</span>
                  <div className="w-10 h-1 rounded-full bg-surface-hover overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${r.status === 'active' ? 'bg-active' : 'bg-warn'}`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                  <span className="text-2xs font-medium tabular-nums text-ink-muted shrink-0 w-6 text-right">
                    {r.pct}%
                  </span>
                </div>
              ))}
            </div>

            {/* Alert + Mini chart row */}
            <div className="grid grid-cols-5 gap-2">
              {/* Alerts */}
              <div className="col-span-3 bg-warn-light border border-warn/20 rounded-lg px-2.5 py-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={10} className="text-warn-dark" />
                  <span className="text-2xs font-semibold text-warn-dark">3 Alertas</span>
                </div>
                {['Rota Planalto: atraso 18 min', 'Avaria GHI-9012'].map((a) => (
                  <div key={a} className="text-2xs text-warn-dark opacity-80 truncate">{a}</div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div className="col-span-2 bg-surface-card border border-surface-border rounded-lg px-2.5 py-2">
                <div className="text-2xs font-semibold text-ink-muted mb-1.5">Esta semana</div>
                <div className="flex items-end gap-0.5 h-8">
                  {[6, 8, 7, 10, 9].map((v, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${i === 4 ? 'bg-brand-600' : 'bg-brand-200'}`}
                      style={{ height: `${(v / 10) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Flutter App Mockup ───────────────────────────────────────────────────────

function FlutterMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-active/10 rounded-3xl blur-2xl" />

      {/* Phone frame */}
      <div className="relative w-[220px] rounded-[32px] border-4 border-shell-800 bg-shell-900 shadow-modal overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-2xs text-ink-muted font-medium">14:32</span>
          <div className="flex gap-1">
            <div className="h-1.5 w-4 rounded-full bg-ink-muted/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-ink-muted/40" />
          </div>
        </div>

        {/* Map area */}
        <div className="relative h-48 bg-shell-800 overflow-hidden">
          {/* Simulated 3D map */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 192" preserveAspectRatio="xMidYMid slice">
            {/* Road grid (perspective) */}
            <g opacity="0.3">
              <line x1="0" y1="60" x2="220" y2="80" stroke="#2A3F5F" strokeWidth="8" />
              <line x1="0" y1="90" x2="220" y2="110" stroke="#2A3F5F" strokeWidth="8" />
              <line x1="0" y1="120" x2="220" y2="140" stroke="#2A3F5F" strokeWidth="8" />
              <line x1="40" y1="40" x2="20" y2="192" stroke="#2A3F5F" strokeWidth="8" />
              <line x1="80" y1="40" x2="70" y2="192" stroke="#2A3F5F" strokeWidth="8" />
              <line x1="130" y1="40" x2="140" y2="192" stroke="#2A3F5F" strokeWidth="8" />
              <line x1="180" y1="40" x2="210" y2="192" stroke="#2A3F5F" strokeWidth="8" />
            </g>
            {/* Route highlight */}
            <path
              d="M 30 180 Q 60 140 90 110 Q 120 80 160 55"
              fill="none" stroke="#2563EB" strokeWidth="5"
              strokeLinecap="round" opacity="0.9"
            />
            {/* Route glow */}
            <path
              d="M 30 180 Q 60 140 90 110 Q 120 80 160 55"
              fill="none" stroke="#60A5FA" strokeWidth="9"
              strokeLinecap="round" opacity="0.25"
            />
            {/* Vehicle */}
            <circle cx="90" cy="110" r="6" fill="#2563EB" />
            <circle cx="90" cy="110" r="10" fill="#2563EB" opacity="0.3" />
            {/* Stops */}
            <circle cx="55" cy="148" r="4" fill="#10B981" stroke="#0B1120" strokeWidth="1.5" />
            <circle cx="130" cy="80" r="4" fill="#F59E0B" stroke="#0B1120" strokeWidth="1.5" />
          </svg>

          {/* Info chips overlay */}
          <div className="absolute top-3 left-3 right-3 flex gap-1.5">
            <div className="glass-dark rounded-full px-2.5 py-1 flex items-center gap-1.5">
              <Truck size={10} className="text-brand-400" />
              <span className="text-2xs text-ink-inverted font-medium">ABC-1234</span>
            </div>
          </div>
        </div>

        {/* Bottom sheet */}
        <div className="bg-shell-900 px-4 pt-4 pb-5">
          {/* Handle */}
          <div className="w-8 h-1 rounded-full bg-shell-600 mx-auto mb-4" />

          {/* Stop info */}
          <div className="mb-3">
            <p className="text-2xs text-ink-muted mb-0.5">Próxima parada</p>
            <p className="text-sm font-semibold text-ink-inverted">Rua das Flores, 45</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock size={10} className="text-brand-400" />
              <span className="text-2xs text-brand-400">~3 min</span>
              <span className="text-2xs text-ink-muted ml-1">• 2 alunos</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Embarcou', color: 'bg-active text-white' },
              { label: 'Ausente',  color: 'bg-warn-light text-warn-dark' },
              { label: 'Pulou',    color: 'bg-danger-light text-danger' },
            ].map((btn) => (
              <button
                key={btn.label}
                className={`${btn.color} rounded-lg py-2 text-2xs font-semibold text-center`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

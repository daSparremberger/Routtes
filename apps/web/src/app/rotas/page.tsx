'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useRoutes, type Route } from '@/hooks/use-routes'
import { Truck, Car, School, Clock, Users } from 'lucide-react'

interface RouteItem extends MasterItem {
  _raw: Route
}

function toItem(r: Route): RouteItem {
  const count = r.studentsCount ?? r.stops?.length ?? 0
  const statusBadge = r.status === 'active' || r.status === 'approved' ? 'active'
    : r.status === 'draft' ? 'default'
    : 'warn'
  return {
    id:       r.id,
    title:    r.name,
    subtitle: `${count} aluno${count !== 1 ? 's' : ''}`,
    badge:    r.status ?? 'rascunho',
    badgeVariant: statusBadge,
    _raw:     r,
  }
}

export default function RotasPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useRoutes()
  const items = (data ?? []).map(toItem)

  return (
    <Shell title="Rotas" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Rotas"
        newLabel="Nova Rota"
        emptyText="Nenhuma rota cadastrada."
        renderDetail={(item) => {
          const r = item._raw
          const count = r.studentsCount ?? r.stops?.length ?? 0
          return (
            <div className="space-y-3">
              <DetailRow label="Motorista"  value={r.driver?.name}                     icon={<Truck  size={16} />} />
              <DetailRow label="Veículo"    value={r.vehicle?.licensePlate}            icon={<Car    size={16} />} />
              <DetailRow label="Escola"     value={r.school?.name}                     icon={<School size={16} />} />
              <DetailRow label="Turno"      value={r.shift}                            icon={<Clock  size={16} />} />
              <DetailRow
                label="Alunos"
                value={count > 0 ? `${count} aluno${count !== 1 ? 's' : ''}` : null}
                icon={<Users size={16} />}
              />
              <DetailRow
                label="Saída prevista"
                value={r.estimatedDepartureTime}
                icon={<Clock size={16} />}
              />
            </div>
          )
        }}
      />
    </Shell>
  )
}

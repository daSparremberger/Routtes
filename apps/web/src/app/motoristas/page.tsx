'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useDrivers, type Driver } from '@/hooks/use-drivers'
import { Phone, Mail, Shield, Car, Route } from 'lucide-react'

interface DriverItem extends MasterItem {
  _raw: Driver
}

function toItem(d: Driver): DriverItem {
  const routeCount = d.routes?.length ?? 0
  return {
    id:       d.id,
    title:    d.name,
    subtitle: `${routeCount} rota${routeCount !== 1 ? 's' : ''} vinculada${routeCount !== 1 ? 's' : ''}`,
    badge:    d.status === 'active' ? 'Online' : 'Offline',
    badgeVariant: d.status === 'active' ? 'active' : 'default',
    _raw:     d,
  }
}

export default function MotoristasPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useDrivers()
  const items = (data ?? []).map(toItem)

  return (
    <Shell title="Motoristas" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Motoristas"
        newLabel="Novo Motorista"
        emptyText="Nenhum motorista cadastrado."
        renderDetail={(item) => {
          const d = item._raw
          return (
            <div className="space-y-3">
              <DetailRow label="CNH"      value={d.licenseCategory ? `Categoria ${d.licenseCategory}` : null} icon={<Shield size={16} />} />
              <DetailRow label="Telefone" value={d.phone}           icon={<Phone  size={16} />} />
              <DetailRow label="E-mail"   value={d.email}           icon={<Mail   size={16} />} />
              <DetailRow label="Veículo"  value={d.vehicle?.licensePlate}                      icon={<Car    size={16} />} />
              <DetailRow
                label="Rotas"
                value={d.routes?.map((r) => r.name).join(', ') || 'Sem rotas'}
                icon={<Route size={16} />}
              />
            </div>
          )
        }}
      />
    </Shell>
  )
}

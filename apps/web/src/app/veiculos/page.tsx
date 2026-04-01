'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useVehicles, type Vehicle } from '@/hooks/use-vehicles'
import { Car, Users, Truck, Calendar, User } from 'lucide-react'

interface VehicleItem extends MasterItem {
  _raw: Vehicle
}

function toItem(v: Vehicle): VehicleItem {
  const statusLabel = v.status === 'active' ? 'Ativo' : v.status === 'maintenance' ? 'Manutenção' : 'Inativo'
  const badgeVariant = v.status === 'active' ? 'active' : v.status === 'maintenance' ? 'warn' : 'default'
  return {
    id:       v.id,
    title:    v.name ?? v.licensePlate,
    subtitle: v.brand ? `${v.brand} ${v.model ?? ''}`.trim() : v.model ?? v.licensePlate,
    badge:    statusLabel,
    badgeVariant,
    _raw:     v,
  }
}

export default function VeiculosPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useVehicles()
  const items = (data ?? []).map(toItem)

  return (
    <Shell title="Veículos" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Veículos"
        newLabel="Novo Veículo"
        emptyText="Nenhum veículo cadastrado."
        renderDetail={(item) => {
          const v = item._raw
          return (
            <div className="space-y-3">
              <DetailRow label="Placa"         value={v.licensePlate}    icon={<Car      size={16} />} />
              <DetailRow label="Capacidade"    value={v.capacity ? `${v.capacity} lugares` : null} icon={<Users size={16} />} />
              <DetailRow label="Motorista"     value={v.driver?.name}    icon={<Truck    size={16} />} />
              <DetailRow label="Modelo"        value={v.model}           icon={<Car      size={16} />} />
              <DetailRow
                label="Próx. manutenção"
                value={v.nextMaintenanceAt
                  ? new Date(v.nextMaintenanceAt).toLocaleDateString('pt-BR')
                  : null}
                icon={<Calendar size={16} />}
              />
            </div>
          )
        }}
      />
    </Shell>
  )
}

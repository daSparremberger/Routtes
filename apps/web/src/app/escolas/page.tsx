'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useSchools, type School } from '@/hooks/use-schools'
import { MapPin, Phone, User, Route, Users } from 'lucide-react'

interface SchoolItem extends MasterItem {
  _raw: School
}

function toItem(s: School): SchoolItem {
  const routeCount = s.routes?.length ?? 0
  return {
    id:       s.id,
    title:    s.name,
    subtitle: s.neighborhood ?? s.city ?? s.address ?? '',
    badge:    `${routeCount} rota${routeCount !== 1 ? 's' : ''}`,
    _raw:     s,
  }
}

export default function EscolasPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useSchools()
  const items = (data ?? []).map(toItem)

  return (
    <Shell title="Escolas" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Escolas"
        newLabel="Nova Escola"
        emptyText="Nenhuma escola cadastrada."
        renderDetail={(item) => {
          const s = item._raw
          const studentCount = s.students?.length ?? 0
          return (
            <div className="space-y-3">
              <DetailRow label="Endereço"   value={s.address}       icon={<MapPin size={16} />} />
              <DetailRow label="Responsável" value={s.contactName}  icon={<User   size={16} />} />
              <DetailRow label="Telefone"   value={s.phone}         icon={<Phone  size={16} />} />
              <DetailRow
                label="Alunos"
                value={studentCount > 0 ? `${studentCount} aluno${studentCount !== 1 ? 's' : ''}` : null}
                icon={<Users size={16} />}
              />
              <DetailRow
                label="Rotas"
                value={s.routes && s.routes.length > 0 ? `${s.routes.length} rota${s.routes.length !== 1 ? 's' : ''}` : null}
                icon={<Route size={16} />}
              />
            </div>
          )
        }}
      />
    </Shell>
  )
}

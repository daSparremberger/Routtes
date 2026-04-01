'use client'

import { useState } from 'react'
import { Shell } from '@/components/layout/shell'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useStudents, type Student } from '@/hooks/use-students'
import { MapPin, Phone, User, School, Route } from 'lucide-react'

interface StudentItem extends MasterItem {
  _raw: Student
}

function toItem(s: Student): StudentItem {
  return {
    id:       s.id,
    title:    s.name,
    subtitle: s.school?.name ?? 'Sem escola',
    badge:    s.status === 'active' ? 'Ativo' : 'Inativo',
    badgeVariant: s.status === 'active' ? 'active' : 'default',
    _raw:     s,
  }
}

export default function AlunosPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useStudents()
  const items = (data ?? []).map(toItem)

  return (
    <Shell title="Alunos" searchValue={search} onSearchChange={setSearch}>
      <MasterDetail
        items={items}
        isLoading={isLoading}
        search={search}
        pageTitle="Alunos"
        newLabel="Novo Aluno"
        emptyText="Nenhum aluno cadastrado."
        renderDetail={(item) => {
          const s = item._raw
          return (
            <div className="space-y-3">
              <DetailRow label="Escola"       value={s.school?.name}                     icon={<School size={16} />} />
              <DetailRow label="Endereço"     value={s.addresses?.[0]
                ? `${s.addresses[0].street}${s.addresses[0].neighborhood ? ` — ${s.addresses[0].neighborhood}` : ''}`
                : null}                                                                  icon={<MapPin size={16} />} />
              <DetailRow label="Responsável"  value={s.guardians?.[0]?.name}             icon={<User size={16} />} />
              <DetailRow label="Telefone"     value={s.guardians?.[0]?.phone}            icon={<Phone size={16} />} />
              <DetailRow label="Rota"         value={s.routeId ?? 'Sem rota'}            icon={<Route size={16} />} />
            </div>
          )
        }}
      />
    </Shell>
  )
}

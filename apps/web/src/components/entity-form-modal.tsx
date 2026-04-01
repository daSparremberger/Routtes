'use client'

import type { ReactNode } from 'react'
import { Button, Modal } from '@/components/ui'

interface EntityFormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  onSubmit: () => void
  submitting?: boolean
  submitLabel?: string
  error?: string | null
  children: ReactNode
}

export function EntityFormModal({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  submitting,
  submitLabel = 'Salvar',
  error,
  children,
}: EntityFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} className="max-w-2xl">
      <div className="grid gap-4">{children}</div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </Modal>
  )
}

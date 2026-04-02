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
  modalClassName?: string
  contentClassName?: string
  footerClassName?: string
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
  modalClassName,
  contentClassName,
  footerClassName,
}: EntityFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      className={modalClassName ?? 'max-w-2xl h-[72vh]'}
    >
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className={contentClassName ?? 'grid gap-4'}>{children}</div>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className={footerClassName ?? 'flex justify-end gap-3'}>
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

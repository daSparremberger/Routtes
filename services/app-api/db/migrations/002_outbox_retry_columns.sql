-- services/app-api/db/migrations/002_outbox_retry_columns.sql
-- Migration 002: Adiciona suporte a retry no outbox_events

ALTER TABLE app.outbox_events
  ADD COLUMN IF NOT EXISTS retry_count        INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error         TEXT,
  ADD COLUMN IF NOT EXISTS failed_permanently BOOLEAN  NOT NULL DEFAULT FALSE;

-- Índice atualizado: exclui eventos com falha permanente
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending
  ON app.outbox_events (published, failed_permanently, created_at)
  WHERE published = FALSE AND failed_permanently = FALSE;

COMMENT ON COLUMN app.outbox_events.retry_count IS 'Número de tentativas de processamento realizadas';
COMMENT ON COLUMN app.outbox_events.last_error IS 'Último erro de processamento (para debug)';
COMMENT ON COLUMN app.outbox_events.failed_permanently IS 'TRUE quando retry_count >= 3 e todas falharam';

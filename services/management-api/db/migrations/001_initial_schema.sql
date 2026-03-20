-- ============================================================
-- Routtes — Migration 001: Schema management (completo)
-- Aplicar via Neon MCP na branch de teste antes do production
-- ============================================================

CREATE SCHEMA IF NOT EXISTS management;

-- Tipos ENUM
CREATE TYPE management.tenant_status AS ENUM ('active', 'suspended', 'inactive');
CREATE TYPE management.contract_status AS ENUM ('active', 'suspended', 'terminated');
CREATE TYPE management.invoice_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE management.user_role AS ENUM ('superadmin', 'manager');
CREATE TYPE management.invite_role AS ENUM ('manager');
CREATE TYPE management.dep_type AS ENUM ('required', 'exclusive_group');

-- tenants
CREATE TABLE management.tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city       VARCHAR(255) NOT NULL,
  state      CHAR(2) NOT NULL,
  status     management.tenant_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenants_city_state_unique UNIQUE (city, state)
);

-- organizations
CREATE TABLE management.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES management.tenants(id),
  razao_social    VARCHAR(255) NOT NULL,
  cnpj            VARCHAR(18) NOT NULL,
  financial_email VARCHAR(255) NOT NULL,
  billing_address JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizations_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT organizations_cnpj_unique UNIQUE (cnpj)
);

-- licenses
CREATE TABLE management.licenses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES management.tenants(id),
  max_vehicles           INT NOT NULL DEFAULT 0,
  max_drivers            INT NOT NULL DEFAULT 0,
  max_managers           INT NOT NULL DEFAULT 0,
  synced_from_contract_id UUID,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT licenses_tenant_unique UNIQUE (tenant_id)
);

-- contracts
CREATE TABLE management.contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES management.organizations(id),
  monthly_value   DECIMAL(10,2) NOT NULL,
  modules         TEXT[] NOT NULL DEFAULT '{}',
  max_vehicles    INT NOT NULL DEFAULT 0,
  max_drivers     INT NOT NULL DEFAULT 0,
  max_managers    INT NOT NULL DEFAULT 0,
  starts_at       DATE NOT NULL,
  ends_at         DATE,
  status          management.contract_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX contracts_org_status_idx ON management.contracts(organization_id, status);

-- invoices
-- Nota: paid_by referencia app.users.id mas não tem FK constraint (cross-schema — integridade na camada de aplicação)
CREATE TABLE management.invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL REFERENCES management.contracts(id),
  competence_month DATE NOT NULL,
  value            DECIMAL(10,2) NOT NULL,
  status           management.invoice_status NOT NULL DEFAULT 'pending',
  paid_at          TIMESTAMPTZ,
  paid_by          UUID, -- referencia app.users.id sem FK (cross-schema)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_contract_month_unique UNIQUE (contract_id, competence_month)
);

-- modules
CREATE TABLE management.modules (
  id              VARCHAR(64) PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  dependencies    TEXT[] NOT NULL DEFAULT '{}',
  dependency_type management.dep_type
);

-- tenant_modules
CREATE TABLE management.tenant_modules (
  tenant_id  UUID NOT NULL REFERENCES management.tenants(id),
  module_id  VARCHAR(64) NOT NULL REFERENCES management.modules(id),
  enabled    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, module_id)
);

-- admins (superadmin users)
CREATE TABLE management.admins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tenant_metrics
CREATE TABLE management.tenant_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES management.tenants(id),
  date            DATE NOT NULL,
  login_count     INT NOT NULL DEFAULT 0,
  execution_count INT NOT NULL DEFAULT 0,
  request_count   INT NOT NULL DEFAULT 0,
  CONSTRAINT tenant_metrics_date_unique UNIQUE (tenant_id, date)
);

-- gestor_invites
CREATE TABLE management.gestor_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES management.tenants(id),
  token      VARCHAR(128) UNIQUE NOT NULL,
  email      VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_logs
CREATE TABLE management.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  actor_id      UUID NOT NULL,
  action        VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id   UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_logs_tenant_resource_idx ON management.audit_logs(tenant_id, resource_type, resource_id);
CREATE INDEX audit_logs_actor_idx ON management.audit_logs(actor_id, created_at);

-- outbox_events
CREATE TABLE management.outbox_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id   UUID NOT NULL,
  event_type     VARCHAR(128) NOT NULL,
  payload        JSONB NOT NULL,
  published      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX outbox_events_pending_idx ON management.outbox_events(published, created_at)
  WHERE published = false;

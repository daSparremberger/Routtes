-- ============================================================
-- Routtes — Migration 001: Schema app (completo)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS app;

-- ENUMs
CREATE TYPE app.user_role    AS ENUM ('manager', 'driver', 'guardian');
CREATE TYPE app.user_status  AS ENUM ('active', 'inactive');
CREATE TYPE app.shift_type   AS ENUM ('morning', 'afternoon', 'evening');
CREATE TYPE app.school_type  AS ENUM ('school', 'service_point');
CREATE TYPE app.route_type   AS ENUM ('fixed', 'variable');
CREATE TYPE app.route_status AS ENUM ('draft', 'approved', 'active', 'inactive');
CREATE TYPE app.exec_status  AS ENUM ('prepared', 'in_progress', 'finished', 'cancelled');
CREATE TYPE app.stop_status  AS ENUM ('pending', 'boarded', 'skipped', 'absent');
CREATE TYPE app.stop_type    AS ENUM ('pickup', 'dropoff', 'school');
CREATE TYPE app.attend_dec   AS ENUM ('yes', 'no', 'no_response');
CREATE TYPE app.attend_src   AS ENUM ('guardian', 'manager', 'api');
CREATE TYPE app.event_type   AS ENUM ('delay', 'detour', 'mechanical', 'observation', 'other');
CREATE TYPE app.invite_role  AS ENUM ('driver');

-- users (gestores, motoristas, responsáveis)
CREATE TABLE app.users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  role         app.user_role NOT NULL,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  fcm_token    VARCHAR(512),
  status       app.user_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX users_tenant_role_idx ON app.users(tenant_id, role);

-- driver_profiles
CREATE TABLE app.driver_profiles (
  user_id      UUID PRIMARY KEY REFERENCES app.users(id),
  cnh          VARCHAR(32) NOT NULL,
  cnh_validity DATE NOT NULL,
  cnh_category VARCHAR(4) NOT NULL
);

-- invite_tokens (motoristas)
CREATE TABLE app.invite_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  token      VARCHAR(128) UNIQUE NOT NULL,
  role       app.invite_role NOT NULL DEFAULT 'driver',
  email      VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES app.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- schools / pontos de serviço
CREATE TABLE app.schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  name       VARCHAR(255) NOT NULL,
  address    VARCHAR(512),
  lat        DECIMAL(10,7),
  lng        DECIMAL(10,7),
  type       app.school_type NOT NULL DEFAULT 'school',
  status     app.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX schools_tenant_status_idx ON app.schools(tenant_id, status);

-- school_schedules
CREATE TABLE app.school_schedules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES app.schools(id),
  shift      app.shift_type NOT NULL,
  entry_time TIME NOT NULL,
  exit_time  TIME NOT NULL
);

-- school_contacts
CREATE TABLE app.school_contacts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES app.schools(id),
  name      VARCHAR(255) NOT NULL,
  role      VARCHAR(128),
  phone     VARCHAR(32),
  email     VARCHAR(255)
);

-- students
CREATE TABLE app.students (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  name           VARCHAR(255) NOT NULL,
  school_id      UUID NOT NULL REFERENCES app.schools(id),
  shift          app.shift_type NOT NULL,
  class_name     VARCHAR(64),
  special_needs  TEXT,
  monthly_value  DECIMAL(10,2),
  contract_start DATE,
  status         app.user_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX students_tenant_school_idx ON app.students(tenant_id, school_id, shift);
CREATE INDEX students_tenant_status_idx ON app.students(tenant_id, status);

-- student_guardians
CREATE TABLE app.student_guardians (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES app.students(id),
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(32) NOT NULL,
  email      VARCHAR(255),
  is_primary BOOLEAN NOT NULL DEFAULT false
);

-- student_addresses
CREATE TABLE app.student_addresses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES app.students(id),
  address    VARCHAR(512),
  lat        DECIMAL(10,7),
  lng        DECIMAL(10,7)
);

-- vehicles
CREATE TABLE app.vehicles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  plate      VARCHAR(16) NOT NULL,
  capacity   INT NOT NULL,
  model      VARCHAR(128),
  totem_id   VARCHAR(128),
  status     app.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicles_tenant_plate_unique UNIQUE (tenant_id, plate)
);

-- vehicle_drivers
CREATE TABLE app.vehicle_drivers (
  vehicle_id     UUID NOT NULL REFERENCES app.vehicles(id),
  driver_user_id UUID NOT NULL REFERENCES app.users(id),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vehicle_id, driver_user_id)
);

-- routes
CREATE TABLE app.routes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        VARCHAR(255) NOT NULL,
  shift       app.shift_type NOT NULL,
  driver_id   UUID REFERENCES app.users(id),
  vehicle_id  UUID REFERENCES app.vehicles(id),
  route_type  app.route_type NOT NULL DEFAULT 'fixed',
  status      app.route_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES app.users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX routes_tenant_shift_status_idx ON app.routes(tenant_id, shift, status);

-- route_stops
CREATE TABLE app.route_stops (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id   UUID NOT NULL REFERENCES app.routes(id),
  "order"    INT NOT NULL,
  student_id UUID REFERENCES app.students(id),
  school_id  UUID REFERENCES app.schools(id),
  lat        DECIMAL(10,7),
  lng        DECIMAL(10,7),
  stop_type  app.stop_type NOT NULL
);
CREATE INDEX route_stops_route_order_idx ON app.route_stops(route_id, "order");

-- route_optimizations
CREATE TABLE app.route_optimizations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id           UUID NOT NULL REFERENCES app.routes(id),
  optimized_by       UUID NOT NULL REFERENCES app.users(id),
  criteria           VARCHAR(16) NOT NULL CHECK (criteria IN ('distance', 'time')),
  stops_order_before JSONB NOT NULL,
  stops_order_after  JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- route_executions
CREATE TABLE app.route_executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  route_id     UUID NOT NULL REFERENCES app.routes(id),
  driver_id    UUID NOT NULL REFERENCES app.users(id),
  vehicle_id   UUID NOT NULL REFERENCES app.vehicles(id),
  service_date DATE NOT NULL,
  status       app.exec_status NOT NULL DEFAULT 'prepared',
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  total_km     DECIMAL(8,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX executions_tenant_date_idx ON app.route_executions(tenant_id, service_date);
CREATE INDEX executions_driver_date_idx ON app.route_executions(driver_id, service_date);
CREATE INDEX executions_route_date_idx  ON app.route_executions(route_id, service_date);

-- execution_stops
CREATE TABLE app.execution_stops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID NOT NULL REFERENCES app.route_executions(id),
  route_stop_id UUID NOT NULL REFERENCES app.route_stops(id),
  "order"       INT NOT NULL,
  status        app.stop_status NOT NULL DEFAULT 'pending',
  recorded_at   TIMESTAMPTZ
);
CREATE INDEX exec_stops_execution_order_idx ON app.execution_stops(execution_id, "order");

-- attendance
CREATE TABLE app.attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  student_id   UUID NOT NULL REFERENCES app.students(id),
  route_id     UUID NOT NULL REFERENCES app.routes(id),
  service_date DATE NOT NULL,
  direction    VARCHAR(8) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  decision     app.attend_dec NOT NULL DEFAULT 'no_response',
  source       app.attend_src NOT NULL,
  override_by  UUID REFERENCES app.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_unique UNIQUE (student_id, route_id, service_date, direction)
);
CREATE INDEX attendance_tenant_route_date_idx ON app.attendance(tenant_id, route_id, service_date);

-- route_events
CREATE TABLE app.route_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES app.route_executions(id),
  type         app.event_type NOT NULL,
  description  TEXT,
  lat          DECIMAL(10,7),
  lng          DECIMAL(10,7),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages (RF17 — pós-MVP)
CREATE TABLE app.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  from_user_id UUID NOT NULL REFERENCES app.users(id),
  to_user_id   UUID NOT NULL REFERENCES app.users(id),
  content     TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX messages_tenant_from_to_idx ON app.messages(tenant_id, from_user_id, to_user_id);
CREATE INDEX messages_tenant_to_read_idx ON app.messages(tenant_id, to_user_id, read_at);

-- notifications
CREATE TABLE app.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES app.users(id),
  type           VARCHAR(64) NOT NULL,
  payload        JSONB NOT NULL,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fcm_message_id VARCHAR(255)
);

-- audit_logs
CREATE TABLE app.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  actor_id      UUID NOT NULL,
  action        VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id   UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX app_audit_logs_tenant_idx ON app.audit_logs(tenant_id, resource_type, resource_id);

-- outbox_events
CREATE TABLE app.outbox_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id   UUID NOT NULL,
  event_type     VARCHAR(128) NOT NULL,
  payload        JSONB NOT NULL,
  published      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX app_outbox_pending_idx ON app.outbox_events(published, created_at)
  WHERE published = false;

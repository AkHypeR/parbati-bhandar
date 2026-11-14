-- Node API foundation only. This does not import or alter any Cloudflare D1 data.
-- Future domain migrations must be reviewed against the live D1 schema and tested on a copy.
CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  idempotency_key text PRIMARY KEY,
  request_hash char(64) NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT api_idempotency_status_range CHECK (
    response_status IS NULL OR (response_status >= 100 AND response_status <= 599)
  )
);
CREATE INDEX IF NOT EXISTS api_idempotency_expiry_idx
  ON api_idempotency_keys (expires_at);

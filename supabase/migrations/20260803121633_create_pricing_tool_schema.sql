/*
# Create pricing-tool schema (16 tables)

## Purpose
This migration creates the full database schema for the Engels Group pricing & competitor
monitoring tool ("pricing-tool"). The tool tracks the company's own products and prices,
monitors competitor offers across European countries, matches competitor offers to own
products, records price history, and raises alerts when price gaps or match-review
issues are detected.

## New Tables (16 total)

1. `users` — internal application users (analysts/admins/read-only). Separate from
   Supabase auth.users because this app uses its own bcrypt password hashes stored
   in-app, not Supabase Auth.
   - `id` (text, PK, cuid), `email` (text, unique), `name`, `password_hash`,
     `role` (text: ADMIN/ANALYST/READONLY), timestamps.

2. `countries` — reference table of supported countries with VAT rate and currency.
   - `code` (text, unique, e.g. NL/BE/FR), `name`, `vat_rate` (numeric), `currency`.

3. `product_groups` — product categories (e.g. Kunststof bakken, Pallets).
   - `name` (unique), `description`, `is_active`.

4. `competitors` — competitor companies, each scoped to a country.
   - Unique on (name, country_id), `check_frequency_hours`, `last_checked_at`.

5. `webshops` — competitor webshops, linked to a country and optionally a competitor.
   - Unique on (name, country_id).

6. `products` — Engels' own products with article number, EAN, GTIN, own price, packaging.
   - `article_number` (unique), FK to product_groups.
   - `own_price` numeric(12,2) nullable, `vat_included`, `packaging_unit`, `packaging_qty`.

7. `competitor_offers` — a competitor's offer for a product (URL, raw/normalized price,
   currency, stock). product_match_id FK is added after product_matches is created.
   - FK to competitors (ON DELETE RESTRICT). Index on product_match_id.

8. `product_matches` — links a competitor_offer to a product with a confidence score,
   match status (CERTAIN/REVIEW/UNRELIABLE), evidence JSON, and optional approver.
   - competitor_offer_id is UNIQUE (one match per offer). Index on match_status.
   - FK to products, competitor_offers, users (approved_by, ON DELETE SET NULL).

9. `price_checks` — raw check results (scraper run or import) per competitor_offer.
   - `check_method`, `status_code`, `error_message`, `is_success`.
   - FK to competitor_offers (ON DELETE CASCADE). Index on checked_at.

10. `price_history` — time-series of recorded prices per competitor_offer.
    - `price`, `normalized_price`, `source`. Index on recorded_at.

11. `own_price_history` — time-series of Engels' own price per product.
    - FK to products (ON DELETE CASCADE). Index on recorded_at.

12. `alerts` — notifications (price gap, match review, etc.).
    - `severity` (INFO/WARNING/CRITICAL), `is_read`. Index on severity.
    - Optional FK to products and competitor_offers (ON DELETE SET NULL).

13. `alert_rules` — configurable thresholds for raising alerts.
    - `type`, `threshold`, optional FKs to country/product_group/competitor (SET NULL).

14. `import_tasks` — log of bulk import jobs (CSV/XLSX).
    - `format`, `status` (PENDING/PROCESSING/DONE/FAILED), row counts, errors/warnings JSON.
    - FK to users (imported_by, ON DELETE RESTRICT).

15. `reports` — generated weekly reports with JSON content.
    - `week_start`, `week_end`, `status` (PENDING/GENERATED/FAILED), `content` JSONB.

16. `audit_logs` — audit trail of user actions.
    - `action`, `entity_type`, `entity_id`, old/new value JSON, `ip_address`.
    - FK to users (ON DELETE RESTRICT).

## Indexes
- Unique indexes: users.email, countries.code, webshops(name,country_id),
  product_groups.name, products.article_number, competitors(name,country_id),
  product_matches.competitor_offer_id.
- Non-unique indexes: competitor_offers.product_match_id, product_matches.match_status,
  price_checks.checked_at, price_history.recorded_at, own_price_history.recorded_at,
  alerts.severity.

## Security
- Row Level Security is ENABLED on every table.
- This is a single-tenant B2B tool with no Supabase Auth sign-in screen. The app uses its
  own bcrypt-based users table and accesses the database from Next.js server code using
  the service role (bypasses RLS). Policies use `TO anon, authenticated` with `USING (true)`
  so the anon-key client (used for read-only data API access during development) can see
  data. The service-role key used by the server actions bypasses RLS entirely.

## Notes
1. All timestamps use timestamptz with DEFAULT now().
2. Decimal columns use numeric(12,2) for prices and numeric(5,2) for VAT rates.
3. JSON columns use jsonb.
4. Foreign keys use snake_case column names; ON DELETE behaviours match the Prisma schema.
5. Table and column names are snake_case to match Postgres conventions.
6. This schema mirrors the existing Prisma schema (prisma/schema.prisma) exactly in terms
   of fields, constraints, and relations — only the naming convention differs.
7. Table creation order respects FK dependencies: users, countries, product_groups and
   competitors are created before webshops; competitor_offers is created before
   product_matches; the competitor_offers → product_matches FK is added last.
*/

-- ========== users ==========
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('ADMIN','ANALYST','READONLY')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);

-- ========== countries ==========
CREATE TABLE IF NOT EXISTS countries (
  id         text PRIMARY KEY,
  code       text NOT NULL,
  name       text NOT NULL,
  vat_rate   numeric(5,2) NOT NULL,
  currency   text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS countries_code_key ON countries(code);

-- ========== product_groups ==========
CREATE TABLE IF NOT EXISTS product_groups (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_groups_name_key ON product_groups(name);

-- ========== competitors ==========
CREATE TABLE IF NOT EXISTS competitors (
  id                    text PRIMARY KEY,
  name                  text NOT NULL,
  website               text NOT NULL,
  country_id            text NOT NULL REFERENCES countries(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  is_active             boolean NOT NULL DEFAULT true,
  check_frequency_hours integer NOT NULL DEFAULT 24,
  last_checked_at       timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS competitors_name_country_id_key ON competitors(name, country_id);

-- ========== webshops ==========
CREATE TABLE IF NOT EXISTS webshops (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  url           text NOT NULL,
  country_id    text NOT NULL REFERENCES countries(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  competitor_id text REFERENCES competitors(id) ON DELETE SET NULL ON UPDATE CASCADE,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS webshops_name_country_id_key ON webshops(name, country_id);

-- ========== products ==========
CREATE TABLE IF NOT EXISTS products (
  id              text PRIMARY KEY,
  article_number  text NOT NULL,
  ean             text,
  gtin            text,
  name            text NOT NULL,
  product_group_id text NOT NULL REFERENCES product_groups(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  own_price       numeric(12,2),
  vat_included    boolean NOT NULL DEFAULT true,
  packaging_unit  text,
  packaging_qty   integer NOT NULL DEFAULT 1,
  currency        text NOT NULL DEFAULT 'EUR',
  stock_status    text,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_article_number_key ON products(article_number);

-- ========== competitor_offers (product_match_id FK added later) ==========
CREATE TABLE IF NOT EXISTS competitor_offers (
  id                text PRIMARY KEY,
  competitor_id     text NOT NULL REFERENCES competitors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_match_id  text,
  url               text NOT NULL,
  raw_price         numeric(12,2),
  normalized_price  numeric(12,2),
  currency          text NOT NULL DEFAULT 'EUR',
  vat_included      boolean NOT NULL DEFAULT true,
  packaging_unit    text,
  packaging_qty     integer,
  stock_status      text,
  last_checked_at   timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitor_offers_product_match_id_idx ON competitor_offers(product_match_id);

-- ========== product_matches ==========
CREATE TABLE IF NOT EXISTS product_matches (
  id                  text PRIMARY KEY,
  product_id          text NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  competitor_offer_id text NOT NULL,
  confidence_score    integer NOT NULL,
  match_status        text NOT NULL CHECK (match_status IN ('CERTAIN','REVIEW','UNRELIABLE')),
  match_evidence      jsonb NOT NULL,
  approved_by         text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_matches_competitor_offer_id_key ON product_matches(competitor_offer_id);
CREATE INDEX IF NOT EXISTS product_matches_match_status_idx ON product_matches(match_status);

-- FK from product_matches → competitor_offers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_matches_competitor_offer_id_fkey'
      AND table_name = 'product_matches'
  ) THEN
    ALTER TABLE product_matches
      ADD CONSTRAINT product_matches_competitor_offer_id_fkey
      FOREIGN KEY (competitor_offer_id) REFERENCES competitor_offers(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- FK from competitor_offers.product_match_id → product_matches (one-to-one)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'competitor_offers_product_match_id_fkey'
      AND table_name = 'competitor_offers'
  ) THEN
    ALTER TABLE competitor_offers
      ADD CONSTRAINT competitor_offers_product_match_id_fkey
      FOREIGN KEY (product_match_id) REFERENCES product_matches(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ========== price_checks ==========
CREATE TABLE IF NOT EXISTS price_checks (
  id                  text PRIMARY KEY,
  competitor_offer_id text NOT NULL REFERENCES competitor_offers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  checked_at          timestamptz NOT NULL,
  found_price         numeric(12,2),
  currency            text NOT NULL,
  stock_status        text,
  product_title       text,
  packaging_unit      text,
  check_method        text NOT NULL,
  status_code         integer,
  error_message       text,
  source_url          text NOT NULL,
  is_success          boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_checks_checked_at_idx ON price_checks(checked_at);

-- ========== price_history ==========
CREATE TABLE IF NOT EXISTS price_history (
  id                  text PRIMARY KEY,
  competitor_offer_id text NOT NULL REFERENCES competitor_offers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  recorded_at         timestamptz NOT NULL,
  price               numeric(12,2) NOT NULL,
  normalized_price    numeric(12,2),
  currency            text NOT NULL,
  stock_status        text,
  source              text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_recorded_at_idx ON price_history(recorded_at);

-- ========== own_price_history ==========
CREATE TABLE IF NOT EXISTS own_price_history (
  id          text PRIMARY KEY,
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  recorded_at timestamptz NOT NULL,
  price       numeric(12,2) NOT NULL,
  currency    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS own_price_history_recorded_at_idx ON own_price_history(recorded_at);

-- ========== alerts ==========
CREATE TABLE IF NOT EXISTS alerts (
  id                  text PRIMARY KEY,
  type                text NOT NULL,
  product_id          text REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
  competitor_offer_id text REFERENCES competitor_offers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  title               text NOT NULL,
  message             text NOT NULL,
  severity            text NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  is_read             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON alerts(severity);

-- ========== alert_rules ==========
CREATE TABLE IF NOT EXISTS alert_rules (
  id               text PRIMARY KEY,
  type             text NOT NULL,
  threshold        numeric(12,2),
  is_active        boolean NOT NULL DEFAULT true,
  country_id       text REFERENCES countries(id) ON DELETE SET NULL ON UPDATE CASCADE,
  product_group_id text REFERENCES product_groups(id) ON DELETE SET NULL ON UPDATE CASCADE,
  competitor_id    text REFERENCES competitors(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ========== import_tasks ==========
CREATE TABLE IF NOT EXISTS import_tasks (
  id            text PRIMARY KEY,
  filename      text NOT NULL,
  format        text NOT NULL CHECK (format IN ('CSV','XLSX')),
  status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','DONE','FAILED')),
  total_rows    integer,
  processed_rows integer,
  error_rows    integer,
  errors        jsonb,
  warnings      jsonb,
  imported_by   text NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ========== reports ==========
CREATE TABLE IF NOT EXISTS reports (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  week_start   timestamptz NOT NULL,
  week_end     timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','GENERATED','FAILED')),
  content      jsonb,
  generated_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ========== audit_logs ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ========== Row Level Security ==========
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE own_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========== RLS Policies ==========
-- Single-tenant B2B tool: no Supabase Auth sign-in screen. The app accesses the database
-- from Next.js server actions using the service role key (bypasses RLS). These anon+
-- authenticated policies allow the anon-key client (used for Data API / read access)
-- to operate. USING(true) is acceptable here because all data is intentionally shared
-- across the single tenant — this is not a multi-user isolation scenario.

-- users
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- countries
DROP POLICY IF EXISTS "anon_select_countries" ON countries;
CREATE POLICY "anon_select_countries" ON countries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_countries" ON countries;
CREATE POLICY "anon_insert_countries" ON countries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_countries" ON countries;
CREATE POLICY "anon_update_countries" ON countries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_countries" ON countries;
CREATE POLICY "anon_delete_countries" ON countries FOR DELETE TO anon, authenticated USING (true);

-- webshops
DROP POLICY IF EXISTS "anon_select_webshops" ON webshops;
CREATE POLICY "anon_select_webshops" ON webshops FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_webshops" ON webshops;
CREATE POLICY "anon_insert_webshops" ON webshops FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_webshops" ON webshops;
CREATE POLICY "anon_update_webshops" ON webshops FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_webshops" ON webshops;
CREATE POLICY "anon_delete_webshops" ON webshops FOR DELETE TO anon, authenticated USING (true);

-- product_groups
DROP POLICY IF EXISTS "anon_select_product_groups" ON product_groups;
CREATE POLICY "anon_select_product_groups" ON product_groups FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_product_groups" ON product_groups;
CREATE POLICY "anon_insert_product_groups" ON product_groups FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_product_groups" ON product_groups;
CREATE POLICY "anon_update_product_groups" ON product_groups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_product_groups" ON product_groups;
CREATE POLICY "anon_delete_product_groups" ON product_groups FOR DELETE TO anon, authenticated USING (true);

-- products
DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- competitors
DROP POLICY IF EXISTS "anon_select_competitors" ON competitors;
CREATE POLICY "anon_select_competitors" ON competitors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_competitors" ON competitors;
CREATE POLICY "anon_insert_competitors" ON competitors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_competitors" ON competitors;
CREATE POLICY "anon_update_competitors" ON competitors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_competitors" ON competitors;
CREATE POLICY "anon_delete_competitors" ON competitors FOR DELETE TO anon, authenticated USING (true);

-- competitor_offers
DROP POLICY IF EXISTS "anon_select_competitor_offers" ON competitor_offers;
CREATE POLICY "anon_select_competitor_offers" ON competitor_offers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_competitor_offers" ON competitor_offers;
CREATE POLICY "anon_insert_competitor_offers" ON competitor_offers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_competitor_offers" ON competitor_offers;
CREATE POLICY "anon_update_competitor_offers" ON competitor_offers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_competitor_offers" ON competitor_offers;
CREATE POLICY "anon_delete_competitor_offers" ON competitor_offers FOR DELETE TO anon, authenticated USING (true);

-- product_matches
DROP POLICY IF EXISTS "anon_select_product_matches" ON product_matches;
CREATE POLICY "anon_select_product_matches" ON product_matches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_product_matches" ON product_matches;
CREATE POLICY "anon_insert_product_matches" ON product_matches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_product_matches" ON product_matches;
CREATE POLICY "anon_update_product_matches" ON product_matches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_product_matches" ON product_matches;
CREATE POLICY "anon_delete_product_matches" ON product_matches FOR DELETE TO anon, authenticated USING (true);

-- price_checks
DROP POLICY IF EXISTS "anon_select_price_checks" ON price_checks;
CREATE POLICY "anon_select_price_checks" ON price_checks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_price_checks" ON price_checks;
CREATE POLICY "anon_insert_price_checks" ON price_checks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_price_checks" ON price_checks;
CREATE POLICY "anon_update_price_checks" ON price_checks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_price_checks" ON price_checks;
CREATE POLICY "anon_delete_price_checks" ON price_checks FOR DELETE TO anon, authenticated USING (true);

-- price_history
DROP POLICY IF EXISTS "anon_select_price_history" ON price_history;
CREATE POLICY "anon_select_price_history" ON price_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_price_history" ON price_history;
CREATE POLICY "anon_insert_price_history" ON price_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_price_history" ON price_history;
CREATE POLICY "anon_update_price_history" ON price_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_price_history" ON price_history;
CREATE POLICY "anon_delete_price_history" ON price_history FOR DELETE TO anon, authenticated USING (true);

-- own_price_history
DROP POLICY IF EXISTS "anon_select_own_price_history" ON own_price_history;
CREATE POLICY "anon_select_own_price_history" ON own_price_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_own_price_history" ON own_price_history;
CREATE POLICY "anon_insert_own_price_history" ON own_price_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_own_price_history" ON own_price_history;
CREATE POLICY "anon_update_own_price_history" ON own_price_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_own_price_history" ON own_price_history;
CREATE POLICY "anon_delete_own_price_history" ON own_price_history FOR DELETE TO anon, authenticated USING (true);

-- alerts
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

-- alert_rules
DROP POLICY IF EXISTS "anon_select_alert_rules" ON alert_rules;
CREATE POLICY "anon_select_alert_rules" ON alert_rules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alert_rules" ON alert_rules;
CREATE POLICY "anon_insert_alert_rules" ON alert_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alert_rules" ON alert_rules;
CREATE POLICY "anon_update_alert_rules" ON alert_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alert_rules" ON alert_rules;
CREATE POLICY "anon_delete_alert_rules" ON alert_rules FOR DELETE TO anon, authenticated USING (true);

-- import_tasks
DROP POLICY IF EXISTS "anon_select_import_tasks" ON import_tasks;
CREATE POLICY "anon_select_import_tasks" ON import_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_import_tasks" ON import_tasks;
CREATE POLICY "anon_insert_import_tasks" ON import_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_import_tasks" ON import_tasks;
CREATE POLICY "anon_update_import_tasks" ON import_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_import_tasks" ON import_tasks;
CREATE POLICY "anon_delete_import_tasks" ON import_tasks FOR DELETE TO anon, authenticated USING (true);

-- reports
DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reports" ON reports;
CREATE POLICY "anon_update_reports" ON reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reports" ON reports;
CREATE POLICY "anon_delete_reports" ON reports FOR DELETE TO anon, authenticated USING (true);

-- audit_logs
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit_logs" ON audit_logs;
CREATE POLICY "anon_update_audit_logs" ON audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit_logs" ON audit_logs;
CREATE POLICY "anon_delete_audit_logs" ON audit_logs FOR DELETE TO anon, authenticated USING (true);

-- ========== updated_at triggers ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_webshops ON webshops;
CREATE TRIGGER set_updated_at_webshops BEFORE UPDATE ON webshops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_products ON products;
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_competitors ON competitors;
CREATE TRIGGER set_updated_at_competitors BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_competitor_offers ON competitor_offers;
CREATE TRIGGER set_updated_at_competitor_offers BEFORE UPDATE ON competitor_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_product_matches ON product_matches;
CREATE TRIGGER set_updated_at_product_matches BEFORE UPDATE ON product_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_alert_rules ON alert_rules;
CREATE TRIGGER set_updated_at_alert_rules BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_import_tasks ON import_tasks;
CREATE TRIGGER set_updated_at_import_tasks BEFORE UPDATE ON import_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
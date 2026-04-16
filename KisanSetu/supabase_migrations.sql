-- ============================================================
--  KisanSetu — Supabase SQL Migrations
--  Run these statements in your Supabase SQL Editor
--  (Dashboard → SQL Editor → New Query → Paste → Run)
--
--  Each statement uses IF NOT EXISTS / IF EXISTS guards
--  so they are SAFE to re-run multiple times.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 1: Storage Location for Inventory (FR-5.1)
-- Adds a free-text storage location column to farmer_inventory.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE farmer_inventory
    ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'On-Farm Storage';

COMMENT ON COLUMN farmer_inventory.storage_location IS
    'Where the batch is physically stored: Warehouse A, Cold Storage, On-Farm Storage, etc.';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 2: Notification Preferences Table (FR-7.3)
-- Stores per-user notification opt-in/out settings.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,
    in_app           BOOLEAN     NOT NULL DEFAULT true,
    order_alerts     BOOLEAN     NOT NULL DEFAULT true,
    booking_alerts   BOOLEAN     NOT NULL DEFAULT true,
    price_alerts     BOOLEAN     NOT NULL DEFAULT true,
    expiry_alerts    BOOLEAN     NOT NULL DEFAULT true,
    email_marketing  BOOLEAN     NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: users can only read/write their own preferences
CREATE POLICY IF NOT EXISTS "Users manage own notification prefs"
    ON notification_preferences
    FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE notification_preferences IS
    'Per-user notification channel and type preferences (FR-7.3).';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 3: KYC Fields on Users Table (FR-1.1 / SRS §4.1.3)
-- Stores Aadhaar, PAN, KYC status and document URL per user.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS aadhaar_number  TEXT,
    ADD COLUMN IF NOT EXISTS pan_number      TEXT,
    ADD COLUMN IF NOT EXISTS kyc_status      TEXT NOT NULL DEFAULT 'not_submitted',
    ADD COLUMN IF NOT EXISTS kyc_doc_url     TEXT,
    ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ;

-- Valid kyc_status values: not_submitted | skipped | pending_verification | verified | rejected
-- Add a check constraint (safe to run even if column already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_kyc_status' AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_kyc_status
            CHECK (kyc_status IN ('not_submitted','skipped','pending_verification','verified','rejected'));
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN users.aadhaar_number  IS 'Aadhaar card number (stored encrypted in production).';
COMMENT ON COLUMN users.pan_number      IS 'PAN card number (optional, for GST transactions).';
COMMENT ON COLUMN users.kyc_status      IS 'not_submitted | skipped | pending_verification | verified | rejected';
COMMENT ON COLUMN users.kyc_doc_url     IS 'Public URL to the uploaded Aadhaar/document in Supabase Storage.';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 4: Admin Audit Log Table (FR-1.6)
-- Immutable log of every action performed in the Admin panel.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    action        TEXT        NOT NULL,
    target_type   TEXT,                          -- 'user' | 'listing' | 'dispute' | 'system'
    target_id     TEXT,                          -- UUID or string ID of the target record
    detail        TEXT,                          -- Human-readable description
    performed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

    -- Admin logs should be append-only — disable UPDATE and DELETE for all roles
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- MIGRATION 5: Equipment Moderation (FR-4.1)
-- Adds status column to rental_equipment for admin approval.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.rental_equipment 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Verified'
    CHECK (status IN ('Pending', 'Verified', 'Rejected'));

COMMENT ON COLUMN public.rental_equipment.status IS 'Moderation state: Pending | Verified | Rejected';

-- ─────────────────────────────────────────────────────────────
-- MIGRATION 6: Profiles Table Alignment (Consolidating with Users)
-- Ensuring public.profiles has all the fields from the admin logic.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS aadhaar_number  TEXT,
    ADD COLUMN IF NOT EXISTS pan_number      TEXT,
    ADD COLUMN IF NOT EXISTS kyc_status      TEXT NOT NULL DEFAULT 'not_submitted'
        CHECK (kyc_status IN ('not_submitted','skipped','pending_verification','verified','rejected')),
    ADD COLUMN IF NOT EXISTS kyc_doc_url     TEXT,
    ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_banned       BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON TABLE public.profiles IS 'Unified user profile and KYC storage (FR-1.1).';

CREATE POLICY IF NOT EXISTS "Admin audit log — insert only"
    ON admin_audit_log
    FOR INSERT
    WITH CHECK (true);   -- Any authenticated user (admin) can insert

CREATE POLICY IF NOT EXISTS "Admin audit log — read by admins"
    ON admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.role = 'admin'
        )
    );

-- Index for fast log retrieval
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
    ON admin_audit_log (created_at DESC);

COMMENT ON TABLE admin_audit_log IS
    'Append-only audit trail of all admin actions (FR-1.6, FR-7.2).';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 5: Banned Column on Users (FR-1.6)
-- The admin panel needs a `banned` boolean on the users table.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.banned IS
    'When true, user is blocked from logging in. Set by admin (FR-1.6).';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 6: Equipment Blocked Dates Table (FR-4.2 bonus)
-- Stores owner-blocked date ranges per equipment for the calendar.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_blocked_dates (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    equipment_id  UUID        REFERENCES equipment(id) ON DELETE CASCADE,
    from_date     DATE        NOT NULL,
    to_date       DATE        NOT NULL,
    reason        TEXT        DEFAULT 'Blocked by owner',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (to_date >= from_date)
);

-- Enable RLS
ALTER TABLE equipment_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Owners manage own blocked dates"
    ON equipment_blocked_dates
    FOR ALL
    USING  (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

COMMENT ON TABLE equipment_blocked_dates IS
    'Date ranges blocked by equipment owners (FR-4.2 — calendar availability).';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 7: Supabase Storage Bucket for KYC Documents
-- Run this separately if bucket doesn't exist.
-- ─────────────────────────────────────────────────────────────
-- NOTE: Bucket creation must be done via Supabase Dashboard UI:
--   → Storage → New Bucket → Name: "kyc-documents" → Private (NOT public)
--   → Then add policy: "Allow authenticated users to upload to own folder"
--
-- Alternatively, via Supabase API (runs in service_role context):
-- INSERT INTO storage.buckets (id, name, public)
--     VALUES ('kyc-documents', 'kyc-documents', false)
--     ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 8: Actioned_at column on bookings (FR-4.4)
-- Records when an owner approved/rejected a booking.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS actioned_at TIMESTAMPTZ;

COMMENT ON COLUMN bookings.actioned_at IS
    'Timestamp when the equipment owner approved or rejected this booking (FR-4.4).';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION 9: Disputes Table (FR-1.6 Expansion)
-- Stores platform disputes between buyers and farmers/owners.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    title         TEXT        NOT NULL,
    raised_by     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    against       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id      TEXT,
    description   TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved', 'escalated')),
    resolution    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins manage all disputes"
    ON disputes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.role = 'admin'
        )
    );

CREATE POLICY IF NOT EXISTS "Users view own disputes"
    ON disputes
    FOR SELECT
    USING (auth.uid() = raised_by OR auth.uid() = against);

COMMENT ON TABLE disputes IS
    'Platform disputes for admin resolution (FR-1.6).';

-- ─────────────────────────────────────────────────────────────
-- END OF MIGRATIONS
-- ─────────────────────────────────────────────────────────────
SELECT 'KisanSetu migrations applied successfully ✅' AS status;

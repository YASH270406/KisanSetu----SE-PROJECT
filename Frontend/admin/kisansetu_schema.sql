-- ============================================================
-- KisanSetu — Complete Supabase Schema
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- Project: https://ffigoosgvrtfgtgmrmxz.supabase.co
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. PROFILES  (extends auth.users)
-- SRS FR-1.1 to FR-1.6 — RBAC
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name     TEXT,
    phone_number  TEXT UNIQUE,
    role          TEXT NOT NULL DEFAULT 'farmer'
                      CHECK (role IN ('farmer','buyer','equipment_owner','admin')),
    is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url    TEXT,
    location      TEXT,
    land_area     FLOAT,
    business_type TEXT,
    business_name TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        COALESCE(NEW.raw_user_meta_data->>'role','farmer')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_read"        ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_update"      ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin_read_all"  ON public.profiles FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "admin_update_all" ON public.profiles FOR UPDATE USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 2. PRODUCE (Crop Listings)
-- SRS FR-3.1, FR-3.2, FR-3.5; Fig 1 State Machine
-- status  = admin moderation gate (Pending|Verified|Rejected)
-- listing_status = trade lifecycle  (Draft → Listed → … → Settled)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produce (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    crop_name      TEXT NOT NULL,
    variety        TEXT,
    quantity       NUMERIC NOT NULL CHECK (quantity > 0),
    unit           TEXT NOT NULL DEFAULT 'kg'
                       CHECK (unit IN ('kg','quintal','ton','piece')),
    price          NUMERIC NOT NULL CHECK (price >= 0),
    harvest_date   DATE,
    image_url      TEXT,
    description    TEXT,
    location       TEXT,
    status         TEXT NOT NULL DEFAULT 'Pending'
                       CHECK (status IN ('Pending','Verified','Rejected')),
    listing_status TEXT NOT NULL DEFAULT 'Draft'
                       CHECK (listing_status IN (
                           'Draft','Listed','Negotiation','Locked',
                           'InTransit','Delivered','Settled')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.produce ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer_own"      ON public.produce FOR ALL  USING (auth.uid() = farmer_id);
CREATE POLICY "buyer_read"      ON public.produce FOR SELECT USING (status = 'Verified');
CREATE POLICY "admin_all"       ON public.produce FOR ALL  USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 3. ORDERS + ORDER_ITEMS
-- SRS FR-3.3, FR-3.4, FR-3.5
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount     NUMERIC NOT NULL CHECK (total_amount >= 0),
    order_status     TEXT NOT NULL DEFAULT 'Pending'
                         CHECK (order_status IN (
                             'Pending','Confirmed','InTransit',
                             'Delivered','Cancelled','Settled')),
    delivery_address TEXT,
    payment_status   TEXT NOT NULL DEFAULT 'Pending'
                         CHECK (payment_status IN ('Pending','Paid','Refunded')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    listing_id       UUID REFERENCES public.produce(id) ON DELETE SET NULL,
    quantity_ordered NUMERIC NOT NULL CHECK (quantity_ordered > 0),
    price_per_unit   NUMERIC NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_own_orders"  ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "admin_all_orders"  ON public.orders FOR ALL USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "admin_order_items" ON public.order_items FOR ALL USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 4. RENTAL EQUIPMENT
-- SRS FR-4.1, FR-4.2
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rental_equipment (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    equipment_type       TEXT NOT NULL,
    model                TEXT,
    horsepower           INTEGER,
    rental_rate_per_hour NUMERIC NOT NULL CHECK (rental_rate_per_hour >= 0),
    rental_rate_per_day  NUMERIC,
    location             TEXT,
    is_available         BOOLEAN NOT NULL DEFAULT TRUE,
    image_url            TEXT,
    description          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rental_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_own"    ON public.rental_equipment FOR ALL  USING (auth.uid() = owner_id);
CREATE POLICY "all_read"     ON public.rental_equipment FOR SELECT USING (is_available = TRUE);
CREATE POLICY "admin_equip"  ON public.rental_equipment FOR ALL  USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 5. SERVICE BOOKINGS
-- SRS FR-4.3, FR-4.4, FR-4.5
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_bookings (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_type   TEXT NOT NULL CHECK (service_type IN ('equipment','professional')),
    resource_id    UUID NOT NULL,
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    start_time     TIME,
    total_cost     NUMERIC CHECK (total_cost >= 0),
    booking_status TEXT NOT NULL DEFAULT 'Pending'
                       CHECK (booking_status IN (
                           'Pending','Confirmed','Rejected','Completed','Cancelled')),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_own"       ON public.service_bookings FOR ALL  USING (auth.uid() = client_id);
CREATE POLICY "admin_bookings"   ON public.service_bookings FOR ALL  USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 6. DISPUTES
-- SRS FR-1.6, FR-7.2
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disputes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            TEXT NOT NULL,
    description      TEXT,
    status           TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open','resolved','escalated')),
    raised_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    against_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_dispute"  ON public.disputes FOR SELECT USING (
    auth.uid() = raised_by OR auth.uid() = against_user_id);
CREATE POLICY "user_create"       ON public.disputes FOR INSERT WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "admin_disputes"    ON public.disputes FOR ALL  USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 7. AUDIT LOGS  (IMMUTABLE — no update/delete policies)
-- SRS Section 6.4.2.4; FR-7.2
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action       TEXT NOT NULL,
    target_type  TEXT,
    target_id    TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at — immutable by design
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_insert_log" ON public.audit_logs FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "admin_read_log"   ON public.audit_logs FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- SRS FR-7.1, FR-7.3
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type  TEXT NOT NULL,
    message            TEXT NOT NULL,
    is_read            BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_channel   TEXT NOT NULL DEFAULT 'push'
                           CHECK (delivery_channel IN ('push','sms','email','in_app')),
    related_id         UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_notifs"    ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_update_notifs" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "insert_notifs"      ON public.notifications FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 9. MARKET PRICES (Mandi)
-- SRS FR-2.1 to FR-2.5
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_prices (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_name   TEXT NOT NULL,
    mandi_name  TEXT NOT NULL,
    state       TEXT,
    district    TEXT,
    price_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    min_price   NUMERIC,
    max_price   NUMERIC,
    modal_price NUMERIC NOT NULL,
    unit        TEXT DEFAULT 'quintal',
    source      TEXT DEFAULT 'eNAM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_prices"  ON public.market_prices FOR SELECT USING (TRUE);
CREATE POLICY "admin_prices"     ON public.market_prices FOR ALL USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 10. SOIL HEALTH CARDS
-- SRS FR-6.1, FR-6.2
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soil_health_cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id         TEXT UNIQUE,
    test_date       DATE,
    lab_name        TEXT,
    nitrogen        NUMERIC,
    phosphorus      NUMERIC,
    potassium       NUMERIC,
    ph_level        NUMERIC,
    organic_carbon  NUMERIC,
    soil_type       TEXT,
    recommendations TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.soil_health_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer_soil"  ON public.soil_health_cards FOR ALL    USING (auth.uid() = farmer_id);
CREATE POLICY "admin_soil"   ON public.soil_health_cards FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 11. HARVEST BATCHES
-- SRS FR-5.1 to FR-5.4
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.harvest_batches (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id       UUID REFERENCES public.produce(id) ON DELETE SET NULL,
    crop_type        TEXT NOT NULL,
    quantity         NUMERIC NOT NULL CHECK (quantity >= 0),
    unit             TEXT DEFAULT 'kg',
    storage_location TEXT,
    harvest_date     DATE NOT NULL,
    expiry_date      DATE,
    shelf_life_days  INTEGER,
    batch_status     TEXT NOT NULL DEFAULT 'In Storage'
                         CHECK (batch_status IN ('In Storage','Sold','Expired','Disposed')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.harvest_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer_batches" ON public.harvest_batches FOR ALL    USING (auth.uid() = farmer_id);
CREATE POLICY "admin_batches"  ON public.harvest_batches FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 12. REVIEWS
-- SRS Section 6.3 Database Schema
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_entity_id UUID NOT NULL,
    entity_type        TEXT NOT NULL
                           CHECK (entity_type IN ('farmer','buyer','equipment','professional')),
    rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment            TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_reviews"   ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "user_write_review"  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "admin_reviews"      ON public.reviews FOR ALL USING (
    EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));


-- ─────────────────────────────────────────────
-- 13. PERFORMANCE INDEXES
-- SRS NFR-5.1
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_produce_status     ON public.produce(status);
CREATE INDEX IF NOT EXISTS idx_produce_farmer     ON public.produce(farmer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status    ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_audit_action       ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created      ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_user        ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_prices_crop        ON public.market_prices(crop_name, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_banned    ON public.profiles(is_banned);


-- ─────────────────────────────────────────────
-- 14. AUTO updated_at TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles','produce','orders','service_bookings','disputes','notifications'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;
             CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
    END LOOP;
END $$;


-- ─────────────────────────────────────────────
-- 15. SEED — Make a user admin
-- Replace the UUID below with the real UUID from Supabase Auth > Users
-- ─────────────────────────────────────────────
-- UPDATE public.profiles SET role = 'admin' WHERE phone_number = '9999999999';

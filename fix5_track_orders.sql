-- ============================================================
-- KisanSetu | Fix 5 — Track Orders: transaction_ledger setup
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- STEP 1: Add missing columns to transaction_ledger
ALTER TABLE transaction_ledger 
  ADD COLUMN IF NOT EXISTS bid_id UUID REFERENCES bids(id),
  ADD COLUMN IF NOT EXISTS batch_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS crop_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS produce_id UUID REFERENCES produce(id),
  ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- STEP 2: Ensure reference_id column exists (may already)
ALTER TABLE transaction_ledger
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT 'Produce_Sale';

-- STEP 3: RLS — Buyers can read their own transactions
DROP POLICY IF EXISTS "Buyers can view own transactions" ON transaction_ledger;
CREATE POLICY "Buyers can view own transactions"
  ON transaction_ledger FOR SELECT
  USING (auth.uid() = from_user_id);

-- STEP 4: Buyers can create transactions (checkout)
DROP POLICY IF EXISTS "Buyers can insert transactions" ON transaction_ledger;
CREATE POLICY "Buyers can insert transactions"
  ON transaction_ledger FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- STEP 5: Buyers can update their own transactions (confirm receipt)
DROP POLICY IF EXISTS "Buyers can update own transactions" ON transaction_ledger;
CREATE POLICY "Buyers can update own transactions"
  ON transaction_ledger FOR UPDATE
  USING (auth.uid() = from_user_id);

-- STEP 6: Farmers can view transactions for their produce (to track sales)
DROP POLICY IF EXISTS "Farmers can view produce transactions" ON transaction_ledger;
CREATE POLICY "Farmers can view produce transactions"
  ON transaction_ledger FOR SELECT
  USING (auth.uid() = to_user_id);

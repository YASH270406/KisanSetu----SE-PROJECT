-- ============================================================
-- Fix: Buyers need UPDATE permission on their own bids
-- This is why buyer's counter was silently discarded while
-- the notification still fired (notification doesn't need RLS).
-- ============================================================

-- Allow buyers to counter/respond to their own bids
CREATE POLICY "Buyers can update their own bids"
  ON bids
  FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Also ensure buyers can READ their own bids (should exist, but add safely)
DROP POLICY IF EXISTS "Buyers can view their own bids" ON bids;
CREATE POLICY "Buyers can view their own bids"
  ON bids
  FOR SELECT
  USING (auth.uid() = buyer_id);

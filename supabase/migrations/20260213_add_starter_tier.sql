-- Add 'starter' to the subscription_tier CHECK constraint.
-- The tier exists in PLAN_PRICING (lib/yoco.ts) and frontend but was missing from the DB schema.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('artist', 'starter', 'artiste', 'starter_label', 'label', 'agency', 'enterprise'));

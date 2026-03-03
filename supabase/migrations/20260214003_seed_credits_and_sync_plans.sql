-- =============================================
-- Seed credits for all existing users based on their subscription tier
-- This ensures every user has credits allocated matching their plan
-- =============================================

-- Artist (free) = 20 credits
UPDATE public.profiles
SET credits_balance = 20,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'artist'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- Starter = 50 credits
UPDATE public.profiles
SET credits_balance = 50,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'starter'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- Artiste = 100 credits
UPDATE public.profiles
SET credits_balance = 100,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'artiste'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- Starter Label = 250 credits
UPDATE public.profiles
SET credits_balance = 250,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'starter_label'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- Label Pro = 500 credits
UPDATE public.profiles
SET credits_balance = 500,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'label'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- Agency Elite = 2000 credits
UPDATE public.profiles
SET credits_balance = 2000,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'agency'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- Enterprise = 99999 credits (effectively unlimited)
UPDATE public.profiles
SET credits_balance = 99999,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier = 'enterprise'
  AND (credits_balance IS NULL OR credits_balance = 0);

-- =============================================
-- Set admin users (tonydavidhampton@gmail.com, hamptonmusicgroup@gmail.com)
-- to Agency Elite plan with full credits and active status
-- =============================================
UPDATE public.profiles
SET subscription_tier = 'agency',
    subscription_status = 'active',
    credits_balance = 2000,
    credits_used = 0,
    credits_reset_at = NOW() + INTERVAL '30 days',
    subscription_period_end = NOW() + INTERVAL '365 days'
WHERE email IN ('tonydavidhampton@gmail.com', 'hamptonmusicgroup@gmail.com');

-- =============================================
-- Update the auto-create profile trigger to include credits
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, subscription_tier, subscription_status, credits_balance, credits_used, credits_reset_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'name',
        'artist',
        'active',
        20,
        0,
        NOW() + INTERVAL '30 days'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Monthly credits reset function (run via cron/pg_cron)
-- Resets credits_balance to the plan allocation for all active users
-- whose reset date has passed
-- =============================================
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void AS $$
BEGIN
    -- Artist = 20
    UPDATE public.profiles SET credits_balance = 20, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'artist' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    -- Starter = 50
    UPDATE public.profiles SET credits_balance = 50, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'starter' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    -- Artiste = 100
    UPDATE public.profiles SET credits_balance = 100, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'artiste' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    -- Starter Label = 250
    UPDATE public.profiles SET credits_balance = 250, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'starter_label' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    -- Label = 500
    UPDATE public.profiles SET credits_balance = 500, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'label' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    -- Agency = 2000
    UPDATE public.profiles SET credits_balance = 2000, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'agency' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    -- Enterprise = 99999
    UPDATE public.profiles SET credits_balance = 99999, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'enterprise' AND subscription_status = 'active' AND credits_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

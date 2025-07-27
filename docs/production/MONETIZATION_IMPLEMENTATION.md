# Monetization Implementation Guide for MatchDay Coach

## Executive Summary

This guide provides detailed implementation steps for monetizing MatchDay Coach through a freemium model with subscription tiers. The implementation leverages Supabase for backend management and Google Play Billing for payment processing.

**Revenue Model**: Freemium with Pro subscription
**Payment Methods**: Google Play Billing, Stripe (web)
**Target Conversion Rate**: 5-10% free to paid

---

## 1. Monetization Architecture

### 1.1 Database Schema

```sql
-- Subscription tiers configuration
CREATE TABLE subscription_tiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    features JSONB NOT NULL,
    max_players INTEGER,
    max_teams INTEGER,
    max_seasons INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES subscription_tiers(id),
    status VARCHAR(20) NOT NULL, -- active, cancelled, expired, trial
    payment_method VARCHAR(20), -- google_play, stripe, apple_pay
    google_play_token TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- players_count, games_count, etc
    value INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flags for A/B testing
CREATE TABLE feature_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    variant VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policies to ensure users can only see their own data
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage" ON usage_metrics
    FOR ALL USING (auth.uid() = user_id);
```

### 1.2 Subscription Tiers Configuration

```typescript
// src/config/subscriptions.ts
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: {
      maxPlayers: 25,
      maxSeasons: 1,
      maxTournaments: 1,
      maxGamesHistory: 10,
      exportFormats: ['csv'],
      formations: ['basic'],
      statistics: 'basic',
      backup: 'manual',
      support: 'community'
    }
  },
  PRO: {
    id: 'pro',
    name: 'MatchDay Coach Pro',
    price: { monthly: 9.99, yearly: 79.99 },
    features: {
      maxPlayers: -1, // unlimited
      maxSeasons: -1,
      maxTournaments: -1,
      maxGamesHistory: -1,
      exportFormats: ['csv', 'json', 'pdf', 'ics'],
      formations: ['all'],
      statistics: 'advanced',
      animations: true,
      backup: 'automatic',
      support: 'priority',
      api_access: true,
      multi_team: true,
      assistant_coaches: 3
    }
  },
  TEAM: {
    id: 'team',
    name: 'Team License',
    price: { monthly: 19.99, yearly: 199.99 },
    features: {
      ...SUBSCRIPTION_TIERS.PRO.features,
      assistant_coaches: 5,
      shared_resources: true,
      team_branding: true,
      analytics_dashboard: true
    }
  }
};
```

---

## 2. Feature Gating Implementation

### 2.1 Subscription Context

```typescript
// src/contexts/SubscriptionContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  tier: SubscriptionTier;
  checkFeature: (feature: string) => boolean;
  checkLimit: (metric: string, current: number) => boolean;
  isLoading: boolean;
}

export const SubscriptionContext = createContext<SubscriptionContextType>();

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('subscription_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_subscriptions',
        filter: `user_id=eq.${user?.id}`
      }, loadSubscription)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSubscription = async () => {
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*, tier:subscription_tiers(*)')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();
      
      setSubscription(data);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFeature = (feature: string): boolean => {
    const tier = subscription?.tier || SUBSCRIPTION_TIERS.FREE;
    return tier.features[feature] === true || tier.features[feature] === -1;
  };

  const checkLimit = (metric: string, current: number): boolean => {
    const tier = subscription?.tier || SUBSCRIPTION_TIERS.FREE;
    const limit = tier.features[metric];
    return limit === -1 || current < limit;
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      tier: subscription?.tier || SUBSCRIPTION_TIERS.FREE,
      checkFeature,
      checkLimit,
      isLoading
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
```

### 2.2 Feature Gate Component

```typescript
// src/components/FeatureGate.tsx
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { checkFeature } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (checkFeature(feature)) {
    return <>{children}</>;
  }

  if (showUpgradePrompt) {
    return (
      <>
        <div onClick={() => setShowUpgrade(true)}>
          {fallback || <LockedFeature feature={feature} />}
        </div>
        {showUpgrade && <UpgradeModal feature={feature} onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return <>{fallback}</>;
}

// Usage example
<FeatureGate feature="animations">
  <AnimationControls />
</FeatureGate>
```

### 2.3 Limit Enforcement

```typescript
// src/hooks/useEnforceLimit.ts
export function useEnforceLimit(metric: string) {
  const { checkLimit } = useSubscription();
  const [currentUsage, setCurrentUsage] = useState(0);

  useEffect(() => {
    loadCurrentUsage();
  }, [metric]);

  const loadCurrentUsage = async () => {
    const { data } = await supabase
      .from('usage_metrics')
      .select('value')
      .eq('user_id', user?.id)
      .eq('metric_type', metric)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();
    
    setCurrentUsage(data?.value || 0);
  };

  const canPerformAction = () => {
    return checkLimit(metric, currentUsage + 1);
  };

  const incrementUsage = async () => {
    if (!canPerformAction()) {
      throw new Error('Limit exceeded');
    }

    await supabase
      .from('usage_metrics')
      .insert({
        user_id: user?.id,
        metric_type: metric,
        value: currentUsage + 1
      });

    setCurrentUsage(prev => prev + 1);
  };

  return {
    currentUsage,
    canPerformAction,
    incrementUsage,
    limit: subscription?.tier?.features[metric] || SUBSCRIPTION_TIERS.FREE.features[metric]
  };
}
```

---

## 3. Payment Integration

### 3.1 Google Play Billing Integration

```typescript
// src/lib/billing/googlePlay.ts
import { GooglePlayBilling } from '@/native/billing';

export class GooglePlayBillingService {
  private billing: GooglePlayBilling;

  async initialize() {
    this.billing = await GooglePlayBilling.initialize({
      publicKey: process.env.NEXT_PUBLIC_GOOGLE_PLAY_PUBLIC_KEY
    });

    // Set up purchase update listener
    this.billing.onPurchaseUpdate(this.handlePurchaseUpdate);
  }

  async purchaseSubscription(tier: 'pro_monthly' | 'pro_yearly') {
    try {
      const purchase = await this.billing.purchaseSubscription(tier);
      
      // Verify purchase on backend
      const verified = await this.verifyPurchase(purchase);
      
      if (verified) {
        await this.activateSubscription(purchase);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  private async verifyPurchase(purchase: Purchase) {
    const { data, error } = await supabase.functions.invoke('verify-google-play-purchase', {
      body: {
        purchaseToken: purchase.purchaseToken,
        productId: purchase.productId
      }
    });

    return data?.verified === true;
  }

  private async activateSubscription(purchase: Purchase) {
    await supabase.from('user_subscriptions').upsert({
      user_id: user?.id,
      tier_id: this.getTierIdFromProduct(purchase.productId),
      status: 'active',
      payment_method: 'google_play',
      google_play_token: purchase.purchaseToken,
      current_period_start: new Date(purchase.purchaseTime),
      current_period_end: this.calculatePeriodEnd(purchase)
    });
  }

  async restorePurchases() {
    const purchases = await this.billing.getPurchases();
    
    for (const purchase of purchases) {
      if (purchase.purchaseState === 'purchased') {
        await this.verifyPurchase(purchase);
        await this.activateSubscription(purchase);
      }
    }
  }
}
```

### 3.2 Stripe Integration (Web)

```typescript
// src/lib/billing/stripe.ts
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export class StripeService {
  async createCheckoutSession(tierId: string, interval: 'month' | 'year') {
    const { data } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        tierId,
        interval,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancelled`
      }
    });

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId: data.sessionId });
  }

  async manageBilling() {
    const { data } = await supabase.functions.invoke('create-portal-session', {
      body: {
        returnUrl: window.location.href
      }
    });

    window.location.href = data.url;
  }
}
```

### 3.3 Supabase Edge Functions

```typescript
// supabase/functions/verify-google-play-purchase/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { google } from 'googleapis';

serve(async (req) => {
  const { purchaseToken, productId } = await req.json();

  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidPublisher = google.androidpublisher({
    version: 'v3',
    auth,
  });

  try {
    const response = await androidPublisher.purchases.subscriptions.get({
      packageName: 'com.matchdaycoach.app',
      subscriptionId: productId,
      token: purchaseToken,
    });

    const isValid = response.data.paymentState === 1;

    return new Response(
      JSON.stringify({ verified: isValid, data: response.data }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      { status: 400 }
    );
  }
});
```

---

## 4. Upgrade Flows

### 4.1 Paywall Component

```typescript
// src/components/Paywall.tsx
export function Paywall({ trigger, feature }: PaywallProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const { tier } = useSubscription();
  const { t } = useTranslation();

  const benefits = [
    'Unlimited players and teams',
    'Advanced statistics and analytics',
    'Tactical animations',
    'Priority support',
    'Cloud backup with history',
    'Export to PDF and more'
  ];

  return (
    <>
      {trigger === 'limit' && (
        <LimitReachedBanner onClick={() => setShowPaywall(true)} />
      )}

      <Modal isOpen={showPaywall} onClose={() => setShowPaywall(false)}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Upgrade to MatchDay Coach Pro
          </h2>
          
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600">
              Unlock all features and take your coaching to the next level
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <PricingCard
              title="Monthly"
              price="$9.99"
              period="/month"
              onSelect={() => purchase('pro_monthly')}
            />
            <PricingCard
              title="Yearly"
              price="$79.99"
              period="/year"
              savings="Save 33%"
              recommended
              onSelect={() => purchase('pro_yearly')}
            />
          </div>

          {/* Benefits List */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">What's included:</h3>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust Signals */}
          <div className="text-center text-sm text-gray-500">
            <p>✓ Cancel anytime</p>
            <p>✓ 7-day free trial</p>
            <p>✓ Secure payment via Google Play</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
```

### 4.2 Trial Implementation

```typescript
// src/hooks/useTrial.ts
export function useTrial() {
  const [trialStatus, setTrialStatus] = useState<'active' | 'expired' | 'none'>('none');
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('trial_end')
      .eq('user_id', user?.id)
      .single();

    if (data?.trial_end) {
      const trialEnd = new Date(data.trial_end);
      const now = new Date();
      
      if (trialEnd > now) {
        setTrialStatus('active');
        setDaysRemaining(Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
      } else {
        setTrialStatus('expired');
      }
    }
  };

  const startTrial = async () => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    await supabase.from('user_subscriptions').insert({
      user_id: user?.id,
      tier_id: SUBSCRIPTION_TIERS.PRO.id,
      status: 'trial',
      trial_end: trialEnd.toISOString()
    });

    setTrialStatus('active');
    setDaysRemaining(7);
  };

  return {
    trialStatus,
    daysRemaining,
    startTrial,
    canStartTrial: trialStatus === 'none'
  };
}
```

---

## 5. Analytics & Optimization

### 5.1 Conversion Tracking

```typescript
// src/lib/analytics/subscription.ts
export const SubscriptionAnalytics = {
  trackPaywallView(trigger: string, feature?: string) {
    mixpanel.track('Paywall Viewed', {
      trigger,
      feature,
      current_tier: subscription?.tier?.name || 'free',
      timestamp: new Date().toISOString()
    });
  },

  trackPurchaseInitiated(tier: string, interval: string) {
    mixpanel.track('Purchase Initiated', {
      tier,
      interval,
      price: SUBSCRIPTION_TIERS[tier].price[interval],
      timestamp: new Date().toISOString()
    });
  },

  trackPurchaseCompleted(tier: string, interval: string, revenue: number) {
    mixpanel.track('Purchase Completed', {
      tier,
      interval,
      revenue,
      timestamp: new Date().toISOString()
    });

    // Also track in Google Analytics
    gtag('event', 'purchase', {
      value: revenue,
      currency: 'USD',
      items: [{
        item_id: `${tier}_${interval}`,
        item_name: `MatchDay Coach ${tier}`,
        price: revenue
      }]
    });
  },

  trackChurn(reason?: string) {
    mixpanel.track('Subscription Cancelled', {
      reason,
      tier: subscription?.tier?.name,
      subscription_duration_days: calculateDuration(),
      timestamp: new Date().toISOString()
    });
  }
};
```

### 5.2 A/B Testing

```typescript
// src/hooks/useABTest.ts
export function useABTest(testName: string, variants: string[]) {
  const [variant, setVariant] = useState<string>('control');

  useEffect(() => {
    loadVariant();
  }, [testName]);

  const loadVariant = async () => {
    // Check if user already has a variant assigned
    const { data } = await supabase
      .from('feature_flags')
      .select('variant')
      .eq('user_id', user?.id)
      .eq('feature_name', testName)
      .single();

    if (data?.variant) {
      setVariant(data.variant);
    } else {
      // Assign new variant
      const newVariant = variants[Math.floor(Math.random() * variants.length)];
      
      await supabase.from('feature_flags').insert({
        user_id: user?.id,
        feature_name: testName,
        variant: newVariant,
        enabled: true
      });

      setVariant(newVariant);
    }
  };

  return variant;
}

// Usage
const pricingVariant = useABTest('pricing_display', ['default', 'savings_focus', 'feature_focus']);
```

---

## 6. Revenue Optimization

### 6.1 Dynamic Pricing

```typescript
// src/lib/pricing/dynamic.ts
export async function getDynamicPricing(userId: string) {
  // Get user's country
  const { data: profile } = await supabase
    .from('profiles')
    .select('country')
    .eq('user_id', userId)
    .single();

  // Apply purchasing power parity
  const pppMultiplier = PPP_MULTIPLIERS[profile?.country] || 1;
  
  return {
    monthly: Math.round(9.99 * pppMultiplier * 100) / 100,
    yearly: Math.round(79.99 * pppMultiplier * 100) / 100
  };
}
```

### 6.2 Win-Back Campaigns

```typescript
// src/lib/campaigns/winback.ts
export async function checkWinBackEligibility(userId: string) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'cancelled')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const daysSinceCancellation = Math.floor(
    (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCancellation > 7 && daysSinceCancellation < 30) {
    return {
      eligible: true,
      discount: 50, // 50% off first month
      message: 'Come back to MatchDay Coach Pro - 50% off your first month!'
    };
  }

  return null;
}
```

---

## 7. Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up database schema
- [ ] Create subscription context
- [ ] Implement feature gating
- [ ] Add usage tracking
- [ ] Create paywall UI

### Phase 2: Payment Integration (Week 3-4)
- [ ] Integrate Google Play Billing
- [ ] Set up Stripe for web
- [ ] Create purchase verification
- [ ] Implement subscription management
- [ ] Add restore purchases

### Phase 3: Optimization (Week 5-6)
- [ ] Add analytics tracking
- [ ] Implement A/B testing
- [ ] Create win-back campaigns
- [ ] Add referral system
- [ ] Optimize conversion funnel

### Phase 4: Launch (Week 7-8)
- [ ] Beta test with small group
- [ ] Monitor conversion metrics
- [ ] Iterate on pricing
- [ ] Full rollout
- [ ] Monitor and optimize

---

## 8. Success Metrics

### Key Performance Indicators
- **Conversion Rate**: 5-10% (free to paid)
- **Trial Conversion**: 50%+ (trial to paid)
- **Churn Rate**: <10% monthly
- **ARPU**: $50+ annually
- **LTV:CAC Ratio**: >3:1

### Tracking Dashboard
```sql
-- Monthly Recurring Revenue (MRR)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as active_subscriptions,
  SUM(CASE 
    WHEN interval = 'month' THEN price_monthly
    WHEN interval = 'year' THEN price_yearly / 12
  END) as mrr
FROM user_subscriptions
WHERE status = 'active'
GROUP BY month;

-- Conversion Funnel
SELECT 
  COUNT(DISTINCT user_id) FILTER (WHERE event = 'app_opened') as users,
  COUNT(DISTINCT user_id) FILTER (WHERE event = 'paywall_viewed') as viewed_paywall,
  COUNT(DISTINCT user_id) FILTER (WHERE event = 'purchase_initiated') as started_purchase,
  COUNT(DISTINCT user_id) FILTER (WHERE event = 'purchase_completed') as completed_purchase
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

**Document Status**: Implementation Guide v1.0
**Last Updated**: 2025-07-27
**Owner**: Product & Engineering
**Review Schedule**: Bi-weekly during implementation
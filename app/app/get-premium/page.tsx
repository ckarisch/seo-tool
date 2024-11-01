'use client'

import React, { useCallback, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'  // Changed import
import { Crown, ExternalLink, Receipt, CreditCard } from "lucide-react"
import Link from "next/link"
import styles from './page.module.scss'
import { Alert, AlertDescription, AlertTitle } from '@/components/layout/alert/Alert'
import Section from "@/components/layout/section"
import Background from "@/components/layout/background"
import PricingSwitch from './PricingSwitch'

interface CheckoutResponse {
  clientSecret?: string;
  hasPremiumAccess?: boolean;
  accessType?: 'subscription' | 'lifetime' | null;
  subscriptionType?: string | null;
  error?: string;
}

// Make sure to use your actual publishable key here
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

export default function GetPremiumPage() {
  const [premiumStatus, setPremiumStatus] = useState<{
    hasPremiumAccess: boolean;
    accessType: 'subscription' | 'lifetime' | null;
    subscriptionType: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMonthlyPlan, setIsMonthlyPlan] = useState(true);
  const [checkoutKey, setCheckoutKey] = useState(0);

  const handlePlanChange = (isMonthly: boolean) => {
    setIsMonthlyPlan(isMonthly);
    setCheckoutKey(prev => prev + 1);
  };

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/payment/premium/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: isMonthlyPlan ? 'subscription' : 'lifetime'
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data: CheckoutResponse = await response.json()

      if (data.error) {
        setError(data.error);
        throw new Error(data.error);
      }

      if (data.hasPremiumAccess) {
        setPremiumStatus({
          hasPremiumAccess: true,
          accessType: data.accessType || null,
          subscriptionType: data.subscriptionType || null
        });
        throw new Error('Already has premium access');
      }

      if (!data.clientSecret) {
        throw new Error('No client secret received')
      }

      return data.clientSecret
    } catch (error) {
      console.error('Error fetching client secret:', error)
      throw error
    }
  }, [isMonthlyPlan])

  if (error) {
    return (
      <main>
        <Background backgroundImage="" backgroundStyle={'mainColor'}>
          <Section>
            <div className={styles.heroContainer}>
              <h1 className={styles.title}>Premium Access</h1>
              <p className={styles.description}>
                Oops! Something went wrong while processing your request.
              </p>
            </div>
          </Section>
        </Background>
        <Section>
          <div className={styles.errorContainer}>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </Section>
      </main>
    );
  }

  if (premiumStatus?.hasPremiumAccess) {
    return (
      <main>
        <Background backgroundImage="" backgroundStyle={'mainColor'}>
          <Section>
            <div className={styles.heroContainer}>
              <h1 className={styles.title}>Premium Access</h1>
              <p className={styles.description}>
                {premiumStatus.accessType === 'lifetime' 
                  ? 'You have lifetime premium access'
                  : 'Manage your premium subscription'}
              </p>
            </div>
          </Section>
        </Background>

        <Section>
          <div className={styles.premiumContainer}>
            <div className={styles.statusCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <Crown className={styles.icon} />
                  <span className={styles.statusActive}>Active</span>
                </div>
                <h3 className={styles.cardTitle}>
                  {premiumStatus.subscriptionType || 'Premium'} Access
                </h3>
                <p className={styles.cardDescription}>
                  {premiumStatus.accessType === 'lifetime' 
                    ? `You have unlimited lifetime access to all premium features.`
                    : `You have an active subscription with access to all premium features.`}
                </p>
              </div>

              <div className={styles.divider} />

              <div className={styles.cardActions}>
                {premiumStatus.accessType === 'subscription' && (
                  <Link href="/app/subscriptions" className={styles.actionButton}>
                    <CreditCard size={18} />
                    Manage Subscription
                    <ExternalLink size={16} />
                  </Link>
                )}
                <Link href="/app/invoices" className={styles.actionButton}>
                  <Receipt size={18} />
                  View Invoices
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </div>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Get Premium Access</h1>
            <p className={styles.description}>
              Choose between monthly subscription or lifetime access
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.checkoutContainer}>
          <PricingSwitch onPlanChange={handlePlanChange} />
          <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <EmbeddedCheckoutProvider 
              key={checkoutKey}
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </Section>
    </main>
  );
}
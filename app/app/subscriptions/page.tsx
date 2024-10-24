'use client'

import { useEffect, useState } from 'react'
import type Stripe from 'stripe'
import styles from './page.module.css'

interface SubscriptionPlan {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  interval_count: number;
}

interface SubscriptionData {
  subscriptions: Array<Stripe.Subscription & {
    items: {
      data: Array<{
        plan: SubscriptionPlan;
      }>;
    };
  }>;
  hasMore: boolean;
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState<number>(1)

    useEffect(() => {
        fetchSubscriptions()
    }, [])

    const fetchSubscriptions = async () => {
        try {
            const response = await fetch(`/api/user/stripe/customer/subscriptions`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch subscriptions')
            }

            const data: SubscriptionData = await response.json()
            setSubscriptions(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleDateString()
    }

    const formatPrice = (amount: number, currency: string): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toLowerCase(),
            minimumFractionDigits: 2
        }).format(amount / 100)
    }

    const formatInterval = (interval: string, intervalCount: number): string => {
        if (intervalCount === 1) {
            return `/${interval}`
        }
        return `every ${intervalCount} ${interval}s`
    }

    const getSubscriptionStatus = (subscription: Stripe.Subscription): string => {
        if (subscription.cancel_at_period_end) {
            return 'Canceling'
        }
        return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
    }

    const loadMore = async () => {
        if (!subscriptions?.subscriptions.length) return

        const lastSubscription = subscriptions.subscriptions[subscriptions.subscriptions.length - 1]
        try {
            const response = await fetch(
                `/api/user/stripe/customer/subscriptions?starting_after=${lastSubscription.id}`
            )
            if (!response.ok) throw new Error('Failed to load more subscriptions')

            const newData: SubscriptionData = await response.json()
            setSubscriptions(prev => prev ? {
                subscriptions: [...prev.subscriptions, ...newData.subscriptions],
                hasMore: newData.hasMore
            } : newData)
            setPage(prev => prev + 1)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more subscriptions')
        }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
            </div>
        )
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>
    }

    if (!subscriptions?.subscriptions.length) {
        return <div className={styles.loading}>No subscriptions found</div>
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Your Subscriptions</h2>
            <div className={styles.subscriptionsList}>
                {subscriptions.subscriptions.map((subscription) => {
                    const plan = subscription.items.data[0].plan
                    
                    return (
                        <div 
                            key={subscription.id}
                            className={styles.subscriptionCard}
                        >
                            <div className={styles.cardHeader}>
                                <h3 className={styles.planName}>
                                    {(subscription.items.data[0].price.product as Stripe.Product).name}
                                </h3>
                                <span className={
                                    subscription.status === 'active' 
                                        ? styles.statusActive 
                                        : styles.statusInactive
                                }>
                                    {subscription.status.toUpperCase()}
                                </span>
                            </div>
                            
                            <div className={styles.priceContainer}>
                                <span className={styles.price}>
                                    {formatPrice(plan.amount, plan.currency)}
                                </span>
                                <span className={styles.interval}>
                                    {formatInterval(plan.interval, plan.interval_count)}
                                </span>
                            </div>

                            <div className={styles.detailsList}>
                                <p className={styles.detail}>
                                    Status: {getSubscriptionStatus(subscription)}
                                </p>
                                <p className={styles.detail}>
                                    Started: {formatDate(subscription.start_date)}
                                </p>
                                {subscription.cancel_at && (
                                    <p className={styles.detail}>
                                        Cancels: {formatDate(subscription.cancel_at)}
                                    </p>
                                )}
                                <p className={styles.detail}>
                                    Current Period: {formatDate(subscription.current_period_start)} -{' '}
                                    {formatDate(subscription.current_period_end)}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
            
            {subscriptions.hasMore && (
                <button
                    onClick={loadMore}
                    className={styles.loadMoreButton}
                >
                    Load More
                </button>
            )}
        </div>
    )
}
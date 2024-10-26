'use client'

import { useEffect, useState } from 'react'
import type Stripe from 'stripe'
import styles from './page.module.scss'
import Section from "@/components/layout/section"
import Background from "@/components/layout/background"
import { ExternalLink } from 'lucide-react'

interface InvoiceData {
    invoices: Stripe.Invoice[]
    hasMore: boolean
}

const isStripeSubscription = (
    subscription: string | Stripe.Subscription | null
): subscription is Stripe.Subscription => {
    return subscription !== null && typeof subscription !== 'string' && 'id' in subscription;
};

const isStripePaymentIntent = (
    paymentIntent: string | Stripe.PaymentIntent | null
): paymentIntent is Stripe.PaymentIntent => {
    return paymentIntent !== null && typeof paymentIntent !== 'string' && 'id' in paymentIntent;
};

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<InvoiceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/user/stripe/customer/invoices')
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch invoices')
            }

            const data: InvoiceData = await response.json()
            setInvoices(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatAmount = (amount: number, currency: string): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toLowerCase(),
            minimumFractionDigits: 2
        }).format(amount / 100)
    }

    const getPaymentStatus = (invoice: Stripe.Invoice): {
        text: string;
        className: string;
    } => {
        switch (invoice.status) {
            case 'paid':
                return { text: 'Paid', className: styles.statusPaid }
            case 'open':
                return { text: 'Unpaid', className: styles.statusUnpaid }
            case 'void':
                return { text: 'Void', className: styles.statusUnpaid }
            default:
                return invoice.status ? {
                    text: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
                    className: styles.statusUnpaid
                } : { text: 'Error', className: styles.statusUnpaid }
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

    if (!invoices?.invoices.length) {
        return <div className={styles.loading}>No invoices found</div>
    }

    return (
        <main>
            <Background backgroundImage="" backgroundStyle={'mainColor'}>
                <Section>
                    <div className={styles.heroContainer}>
                        <h1 className={styles.title}>
                            Your Invoices
                        </h1>
                        <p className={styles.description}>
                            View and download your billing history
                        </p>
                    </div>
                </Section>
            </Background>

            <Section>
                <div className={styles.invoicesList}>
                    {invoices.invoices.map((invoice) => {
                        const status = getPaymentStatus(invoice)

                        return (
                            <div key={invoice.id} className={styles.invoiceCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardMain}>
                                        <div className={styles.cardTitleRow}>
                                            <h3 className={styles.invoiceNumber}>
                                                Invoice #{invoice.number}
                                            </h3>
                                            <span className={status.className}>
                                                {status.text}
                                            </span>
                                        </div>
                                        <div className={styles.priceContainer}>
                                            <span className={styles.price}>
                                                {formatAmount(invoice.total, invoice.currency)}
                                            </span>
                                            <span className={styles.date}>
                                                {formatDate(invoice.created)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                <div className={styles.cardContent}>
                                    <div className={styles.detailsList}>
                                        {invoice.subscription && isStripeSubscription(invoice.subscription) && (
                                            <p className={styles.detail}>
                                                Subscription: {invoice.subscription.id}
                                            </p>
                                        )}
                                        <p className={styles.detail}>
                                            Period: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                                        </p>
                                        {invoice.payment_intent && isStripePaymentIntent(invoice.payment_intent) && (
                                            <p className={styles.detail}>
                                                Payment ID: {invoice.payment_intent.id}
                                            </p>
                                        )}
                                    </div>

                                    {invoice.hosted_invoice_url && (
                                        <a
                                            href={invoice.hosted_invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.viewButton}
                                        >
                                            View Invoice
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Section>
        </main>
    )
}
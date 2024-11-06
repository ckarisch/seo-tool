'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.scss'
import Section from "@/components/layout/section"
import Background from "@/components/layout/background"
import { ExternalLink } from 'lucide-react'

interface TransformedTransaction {
  id: string;
  date: number;
  formatted_date: string;
  amount: number;
  formatted_amount: string;
  currency: string;
  status: string;
  type: 'charge' | 'invoice' | 'checkout';
  description: string;
  metadata: Record<string, string>;
  number?: string;
  invoice_url?: string;
  hosted_invoice_url?: string;
  payment_intent?: string;
  customer?: string;
}

interface InvoiceData {
  invoices: TransformedTransaction[];
  hasMore: boolean;
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<InvoiceData>({
        invoices: [],
        hasMore: false
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/stripe/customer/invoices');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch invoices');
            }

            const data: InvoiceData = await response.json();
            setInvoices(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchInvoices();
    }, []);

    const getPaymentStatus = (status: string): {
        text: string;
        className: string;
    } => {
        switch (status.toLowerCase()) {
            case 'succeeded':
            case 'paid':
            case 'complete':
                return { text: 'Paid', className: styles.statusPaid };
            case 'open':
            case 'unpaid':
                return { text: 'Unpaid', className: styles.statusUnpaid };
            case 'void':
                return { text: 'Void', className: styles.statusUnpaid };
            default:
                return { 
                    text: status.charAt(0).toUpperCase() + status.slice(1), 
                    className: styles.statusUnpaid 
                };
        }
    }

    const getDocumentType = (invoice: TransformedTransaction): {
        documentType: string;
        buttonText: string;
    } => {
        // For lifetime access, always show as "invoice" regardless of type
        if (invoice.description === 'Lifetime Access') {
            return {
                documentType: 'Invoice',
                buttonText: 'View Invoice'
            };
        }

        // For regular transactions, base it on the type and hosted invoice availability
        if (invoice.type === 'invoice' || invoice.hosted_invoice_url) {
            return {
                documentType: 'Invoice',
                buttonText: 'View Invoice'
            };
        }

        return {
            documentType: 'Receipt',
            buttonText: 'View Receipt'
        };
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    if (!invoices.invoices.length) {
        return <div className={styles.loading}>No invoices found</div>;
    }

    return (
        <main>
            <Background backgroundImage="" backgroundStyle={'mainDark'}>
                <Section>
                    <div className={styles.heroContainer}>
                        <h1 className={styles.title}>
                            Your Invoices
                        </h1>
                        <p className={styles.description}>
                            View and download your complete billing history
                        </p>
                    </div>
                </Section>
            </Background>

            <Section>
                <div className={styles.invoicesList}>
                    {invoices.invoices.map((invoice) => {
                        const status = getPaymentStatus(invoice.status);
                        const { documentType, buttonText } = getDocumentType(invoice);
                        
                        return (
                            <div key={invoice.id} className={styles.invoiceCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardMain}>
                                        <div className={styles.cardTitleRow}>
                                            <div>
                                                <span className={styles.invoiceType}>
                                                    {invoice.description}
                                                </span>
                                                <h3 className={styles.invoiceNumber}>
                                                    {documentType} #{invoice.number || invoice.id.split('_')[1]}
                                                </h3>
                                            </div>
                                            <span className={status.className}>
                                                {status.text}
                                            </span>
                                        </div>
                                        <div className={styles.priceContainer}>
                                            <span className={styles.price}>
                                                {invoice.formatted_amount}
                                            </span>
                                            <span className={styles.date}>
                                                {invoice.formatted_date}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.divider} />

                                <div className={styles.cardContent}>
                                    <div className={styles.detailsList}>
                                        <p className={styles.detail}>
                                            Payment Date: {invoice.formatted_date}
                                        </p>
                                        {invoice.payment_intent && (
                                            <p className={styles.detail}>
                                                Payment ID: {invoice.payment_intent}
                                            </p>
                                        )}
                                    </div>

                                    {invoice.invoice_url && (
                                        <a 
                                            href={invoice.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.viewButton}
                                        >
                                            {buttonText}
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Section>
        </main>
    );
}
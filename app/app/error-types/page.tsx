'use client';
const isDevelopment = process.env.NODE_ENV === 'development';

import { useEffect, useState } from 'react';
import styles from './page.module.scss';
import Section from '@/components/layout/section';
import Background from "@/components/layout/background";
import { AlertCircle, Lock, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { CheckCard } from './checkCard';

interface ErrorType {
    id: string;
    code: string;
    name: string;
    implementation: 'NOT_IMPLEMENTED' | 'TEST' | 'DEVELOPMENT' | 'PRODUCTION';
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    userRole: 'ADMIN' | 'PREMIUM' | 'STANDARD';
}

export default function ErrorTypesPage() {
    const [errorTypes, setErrorTypes] = useState<ErrorType[]>([]);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const userRole = session?.user?.role || 'STANDARD';

    useEffect(() => {
        const fetchErrorTypes = async () => {
            try {
                const response = await fetch('/api/error-types/available');
                const data = await response.json();
                setErrorTypes(data.errorTypes);
            } catch (error) {
                console.error('Failed to fetch error types:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchErrorTypes();
    }, []);

    const getSeverityIcon = (severity: ErrorType['severity']) => {
        const baseClass = styles.severityIcon;
        const severityClass = styles[severity.toLowerCase()];
        return (
            <AlertCircle className={`${baseClass} ${severityClass}`} />
        );
    };

    const standardChecks = errorTypes.filter(type => type.userRole === 'STANDARD');
    const premiumChecks = errorTypes.filter(type => type.userRole === 'PREMIUM');

    if (loading) {
        return (
            <main>
                <Section>
                    <div className={styles.loading}>Loading available checks...</div>
                </Section>
            </main>
        );
    }

    return (
        <main>
            <Section>
                <div className={styles.contentContainer}>
                    {/* Standard Checks */}
                    <div className={styles.planSection}>
                        <div className={styles.planHeader}>
                            <h2>Standard Checks</h2>
                            <span className={styles.included}>Included in your plan</span>
                        </div>
                        <div className={styles.checksGrid}>
                            {standardChecks.map((check) => (
                                <CheckCard
                                    key={check.id}
                                    check={check}
                                    isLocked={userRole === 'STANDARD' && check.userRole === 'PREMIUM'}
                                    isDevelopment={isDevelopment}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Premium Checks */}
                    <div className={`${styles.planSection} ${styles.premiumSection}`}>
                        <div className={styles.planHeader}>
                            <div className={styles.premiumLabel}>
                                <Star className={styles.starIcon} />
                                <h2>Premium Checks</h2>
                            </div>
                            {userRole !== 'PREMIUM' && userRole !== 'ADMIN' && (
                                <Link href="/app/get-premium" className={styles.upgradeBadge}>
                                    Upgrade for access
                                </Link>
                            )}
                        </div>
                        <div className={styles.checksGrid}>
                            {premiumChecks.map((check) => (
                                <CheckCard
                                    key={check.id}
                                    check={check}
                                    isLocked={userRole === 'STANDARD' && check.userRole === 'PREMIUM'}
                                    isDevelopment={isDevelopment}
                                />
                            ))}
                        </div>
                    </div>

                    {userRole === 'STANDARD' && (
                        <Link href="/app/get-premium" className={styles.premiumCTA}>
                            <div className={styles.ctaContent}>
                                <Star className={styles.ctaIcon} />
                                <div className={styles.ctaText}>
                                    <h3>Upgrade to Premium</h3>
                                    <p>Get access to advanced SEO checks and unlock powerful features</p>
                                </div>
                                <ArrowRight className={styles.ctaArrow} />
                            </div>
                        </Link>
                    )}
                </div>
            </Section>
        </main>
    );
}
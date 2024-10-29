'use client'

import { useEffect, useState } from 'react';
import {
    BarChart2,
    Link as LinkIcon,
    ExternalLink,
    CheckCircle
} from 'lucide-react';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import StatisticsSection from './StatisticsSection';

interface Domain {
    id: string;
    name?: string;
    domainName: string;
    performanceScore: number | null;
    robotsIndex: boolean;
    robotsFollow: boolean;
    internalLinks: { id: string }[];
    externalLinks: { id: string }[];
}

interface DomainStats {
    totalCrawls: number;
    errorRate: number;
    warningRate: number;
    averageCrawlTime: number;
    monthlyTrend: any[];
    errorTypes: {
        error404: number;
        error503: number;
        doubleSlash: number;
        other: number;
    };
}

export default function AnalyticsPage() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
    const [selectedDomainData, setSelectedDomainData] = useState<Domain | null>(null);
    const [domainStats, setDomainStats] = useState<DomainStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDomains();
    }, []);

    useEffect(() => {
        if (selectedDomainId) {
            console.log('Selected domain ID:', selectedDomainId);
            fetchDomainDetails();
            fetchDomainStats();
        }
    }, [selectedDomainId]);

    const fetchDomains = async () => {
        try {
            const response = await fetch('/api/seo/domains');
            if (!response.ok) throw new Error('Failed to fetch domains');
            const data = await response.json();

            if (data.domains && Array.isArray(data.domains)) {
                setDomains(data.domains);
                // Set initial selected domain
                if (data.domains.length > 0 && !selectedDomainId) {
                    console.log('Setting initial domain ID:', data.domains[0].id);
                    setSelectedDomainId(data.domains[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching domains:', err);
            setError('Failed to load domains');
        } finally {
            setLoading(false);
        }
    };

    const fetchDomainDetails = async () => {
        if (!selectedDomainId) return;

        try {
            const domain = domains.find(d => d.id === selectedDomainId);
            if (!domain) {
                console.error('Domain not found:', selectedDomainId);
                return;
            }

            console.log('Fetching details for domain:', domain.domainName);
            const response = await fetch(`/api/seo/domains/${domain.domainName}`);
            if (!response.ok) throw new Error('Failed to fetch domain details');

            const data = await response.json();
            console.log('Received domain details:', data);
            setSelectedDomainData({
                ...data,
                internalLinks: data.internalLinks || [],
                externalLinks: data.externalLinks || []
            });
        } catch (err) {
            console.error('Error fetching domain details:', err);
            setError('Failed to load domain details');
        }
    };

    const fetchDomainStats = async () => {
        if (!selectedDomainId) return;

        try {
            const domain = domains.find(d => d.id === selectedDomainId);
            console.log('Fetching analytics for domain ID:', selectedDomainId);
            const response = await fetch(`/api/seo/domains/${domain?.domainName}/analytics`);
            if (!response.ok) throw new Error('Failed to fetch domain stats');

            const data = await response.json();
            console.log('Received analytics data:', data);
            setDomainStats({
                ...data,
                monthlyTrend: data.monthlyTrend || [],
                errorTypes: {
                    error404: data.errorTypes?.error404 || 0,
                    error503: data.errorTypes?.error503 || 0,
                    doubleSlash: data.errorTypes?.doubleSlash || 0,
                    other: data.errorTypes?.other || 0
                }
            });
        } catch (err) {
            console.error('Error fetching domain stats:', err);
            setError('Failed to load domain statistics');
        }
    };

    const formatScore = (score: number | null): number => {
        if (score === null) return 0;
        return Math.round(score * 100);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <main>
            <Background backgroundImage="" backgroundStyle={'mainColor'}>
                <Section>
                    <div className={styles.heroContainer}>
                        <h1 className={styles.title}>Analytics Dashboard</h1>
                        <p className={styles.description}>
                            Monitor your domains&apos; performance, track errors, and analyze SEO metrics.
                        </p>
                    </div>
                </Section>
            </Background>

            <Section>
                <div className={styles.analyticsContent}>
                    <div className={styles.domainSelector}>
                        <label htmlFor="domain-select" className={styles.selectLabel}>Select Domain:</label>
                        <select
                            id="domain-select"
                            className={styles.select}
                            value={selectedDomainId || ''}
                            onChange={(e) => {
                                console.log('Domain selection changed to:', e.target.value);
                                setSelectedDomainId(e.target.value);
                            }}
                        >
                            {domains.map((domain) => (
                                <option key={domain.id} value={domain.id}>
                                    {domain.name || domain.domainName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedDomainData && (
                        <>
                            <div className={styles.metricsGrid}>
                                <div className={styles.metricCard}>
                                    <div className={styles.metricHeader}>
                                        <BarChart2 className={styles.metricIcon} />
                                        <h3>Performance Score</h3>
                                    </div>
                                    <div className={styles.scoreValue}>
                                        {formatScore(selectedDomainData.performanceScore)}
                                        <span className={styles.scoreUnit}>/100</span>
                                    </div>
                                </div>

                                <div className={styles.metricCard}>
                                    <div className={styles.metricHeader}>
                                        <CheckCircle className={styles.metricIcon} />
                                        <h3>Robots.txt Status</h3>
                                    </div>
                                    <div className={styles.scoreValue}>
                                        {selectedDomainData.robotsIndex ? 'Index' : 'No Index'}
                                        <span className={styles.scoreUnit}>
                                            {selectedDomainData.robotsFollow ? ' / Follow' : ' / No Follow'}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.metricCard}>
                                    <div className={styles.metricHeader}>
                                        <LinkIcon className={styles.metricIcon} />
                                        <h3>Internal Links</h3>
                                    </div>
                                    <div className={styles.scoreValue}>
                                        {selectedDomainData.internalLinks?.length || 0}
                                    </div>
                                </div>

                                <div className={styles.metricCard}>
                                    <div className={styles.metricHeader}>
                                        <ExternalLink className={styles.metricIcon} />
                                        <h3>External Links</h3>
                                    </div>
                                    <div className={styles.scoreValue}>
                                        {selectedDomainData.externalLinks?.length || 0}
                                    </div>
                                </div>
                            </div>

                            {domainStats && <StatisticsSection domainStats={domainStats} />}
                        </>
                    )}
                </div>
            </Section>
        </main>
    );
}
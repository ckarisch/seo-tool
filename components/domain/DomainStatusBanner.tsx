// components/domain/DomainStatusBanner.tsx
import React from 'react';
import styles from './DomainStatusBanner.module.scss';
import { AlertCircle, Clock } from 'lucide-react';
import { Domain } from '@prisma/client';

interface DomainStatusBannerProps {
    domains: Domain[];
}

const DomainStatusBanner: React.FC<DomainStatusBannerProps> = ({ domains }) => {
    const unverifiedDomains = domains.filter(domain => !domain.domainVerified);
    const pendingDomains = domains.filter(domain => domain.domainVerified && !(domain.lastCrawl || domain.lastQuickAnalysis || domain.lastLighthouseAnalysis));

    if (unverifiedDomains.length === 0 && pendingDomains.length === 0) {
        return null;
    }

    return (
        <div className={styles.bannerContainer}>
            {unverifiedDomains.length > 0 && (
                <div className={styles.banner} role="alert">
                    <div className={styles.bannerContent}>
                        <AlertCircle className={styles.icon} aria-hidden="true" />
                        <div className={styles.bannerText}>
                            <span className={styles.bannerTitle}>Domains Requiring Verification</span>
                            <p>
                                The following domains need to be verified: {' '}
                                <span className={styles.domainList}>
                                    {unverifiedDomains.map(domain => domain.domainName).join(', ')}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {pendingDomains.length > 0 && (
                <div className={`${styles.banner} ${styles.pending}`} role="status">
                    <div className={styles.bannerContent}>
                        <Clock className={styles.icon} aria-hidden="true" />
                        <div className={styles.bannerText}>
                            <span className={styles.bannerTitle}>Initial Analysis Pending</span>
                            <p>
                                First analysis pending for: {' '}
                                <span className={styles.domainList}>
                                    {pendingDomains.map(domain => domain.domainName).join(', ')}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DomainStatusBanner;
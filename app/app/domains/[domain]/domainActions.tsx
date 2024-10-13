import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './domainActions.module.scss';
import Card from '@/components/layout/card';
import MinimizableContainer from '@/components/layout/MinimizableContainer';

interface Domain {
    crawlStatus?: string;
    // Add other properties of Domain as needed
}

interface DomainActionsProps {
    domainJson: Partial<Domain>;
    crawlStatus: string;
    handleCrawl: (event: React.FormEvent<HTMLFormElement>) => void;
    handleResetLinks: (event: React.FormEvent<HTMLFormElement>) => void;
}

const DomainActions: React.FC<DomainActionsProps> = ({ domainJson, crawlStatus, handleCrawl, handleResetLinks }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    return (
        <MinimizableContainer title="Domain Actions">
            <div className={styles.actionItem}>
                <h3 className={styles.actionTitle}>Request Crawl</h3>
                <p className={styles.actionDescription}>
                    Initiate a new crawl of the domain to update information and check for changes.
                </p>
                <form onSubmit={handleCrawl}>
                    <button
                        className={styles.actionButton}
                        type="submit"
                        disabled={domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}
                    >
                        Request Crawl
                    </button>
                </form>
            </div>
            <div className={styles.actionItem}>
                <h3 className={styles.actionTitle}>Reset Links</h3>
                <p className={styles.actionDescription}>
                    Clear all existing links associated with the domain and prepare for a fresh crawl.
                </p>
                <form onSubmit={handleResetLinks}>
                    <button
                        className={styles.actionButton}
                        type="submit"
                        disabled={domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}
                    >
                        Reset Links
                    </button>
                </form>
            </div>
        </MinimizableContainer>
    );
};

export default DomainActions;
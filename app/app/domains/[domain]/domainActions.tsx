import React from 'react';
import styles from './domainActions.module.scss';
import MinimizableContainer from '@/components/layout/MinimizableContainer';
import { Play, RotateCcw } from 'lucide-react';

interface Domain {
    crawlStatus?: string;
}

interface DomainActionsProps {
    domainJson: Partial<Domain>;
    crawlStatus: string;
    handleCrawl: (event: React.FormEvent<HTMLFormElement>) => void;
    handleResetLinks: (event: React.FormEvent<HTMLFormElement>) => void;
}

const DomainActions: React.FC<DomainActionsProps> = ({ 
    domainJson, 
    crawlStatus, 
    handleCrawl, 
    handleResetLinks 
}) => {
    const isCrawling = domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling';

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
                        disabled={isCrawling}
                    >
                        <Play size={16} />
                        Start Crawl
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
                        disabled={isCrawling}
                    >
                        <RotateCcw size={16} />
                        Reset Links
                    </button>
                </form>
            </div>
        </MinimizableContainer>
    );
};

export default DomainActions;
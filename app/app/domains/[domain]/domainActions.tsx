import React from 'react';
import styles from './domainActions.module.scss';
import MinimizableContainer from '@/components/layout/MinimizableContainer';
import { Play, RotateCcw } from 'lucide-react';
import { Domain } from '@prisma/client';
import { Loading } from '@/icons/loading';

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

    const icons = () => {
        if (isCrawling) {
            return <div title='crawling'>
                <Loading />
            </div>
        }
    }
    return (
        <MinimizableContainer
            className={styles.container}
            title={
                <div className={styles.titleContainer}>
                    <span>Domain Actions</span>
                    <span className={styles.adminBadge}>Admin</span>
                </div>
            }
            initiallyMinimized={true}
        >
            <div className={[styles.icon].join(' ')}>
                {icons()}
            </div>
            <div className={styles.actionItem}>
                <h3 className={styles.actionTitle}>Request Crawl</h3>
                <p className={styles.actionDescription}>
                    Initiate a new crawl of the domain to update information and check for changes.
                </p>
                <div className={styles.actionButtons}>
                    <form onSubmit={handleCrawl} style={{ width: '100%' }}>
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
            </div>

            <div className={styles.actionItem}>
                <h3 className={styles.actionTitle}>Reset Links</h3>
                <p className={styles.actionDescription}>
                    Clear all existing links associated with the domain and prepare for a fresh crawl.
                </p>
                <div className={styles.actionButtons}>
                    <form onSubmit={handleResetLinks} style={{ width: '100%' }}>
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
            </div>
        </MinimizableContainer>
    );
};

export default DomainActions;
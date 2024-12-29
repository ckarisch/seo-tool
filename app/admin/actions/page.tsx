// page.tsx
"use client";

import styles from './adminActions.module.scss';
import Section from '@/components/layout/section';
import { useState } from 'react';
import { useProtectedSession } from '@/hooks/useProtectedSession';
import { UserRole } from '@prisma/client';

export default function AdminActions() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const { data: session } = useProtectedSession();

    const handleResetLinks = async () => {
        if (!session?.user || !confirm('Are you sure you want to remove all links? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/reset-links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset links');
            }

            setMessage('Links have been successfully removed');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
        return <div className={styles.notAllowed}>Access denied</div>;
    }

    return (
        <Section>
            <div className={styles.actionsPage}>
                <h1 className={styles.title}>Admin Actions</h1>
                
                <div className={styles.actionsGrid}>
                    <div className={styles.actionCard}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Database Management</h2>
                        </div>
                        
                        <p className={styles.cardDescription}>
                            Remove all links from the database. This action is only available in test mode 
                            and when not connected to a production database.
                        </p>
                        
                        <div className={styles.cardFooter}>
                            <button 
                                onClick={handleResetLinks}
                                disabled={isLoading}
                                className={styles.dangerButton}
                                aria-busy={isLoading}
                            >
                                {isLoading && <span className={styles.loadingSpinner} />}
                                {isLoading ? 'Processing...' : 'Remove All Links'}
                            </button>

                            {message && (
                                <div className={`${styles.message} ${
                                    message.includes('error') ? styles.error : styles.success
                                }`} role="alert">
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
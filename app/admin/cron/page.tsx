// app/admin/cron/page.tsx
"use client";

import styles from './cron.module.scss';
import Section from '@/components/layout/section';
import { useEffect, useState } from 'react';
import { useProtectedSession } from '@/hooks/useProtectedSession';
import { UserRole } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';

interface CronJob {
    id: string;
    name: string;
    type: string;
    lastStart: Date;
    lastEnd: Date;
    interval: number;
    status: string;
    acitve: boolean; // Note: This is a typo in your schema but we'll use it as is
    standardInterval: number | null;
    premiumInterval: number | null;
    adminInterval: number | null;
}

export default function AdminCron() {
    const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { data: session } = useProtectedSession();

    const fetchCronJobs = async () => {
        try {
            const response = await fetch('/api/admin/cron');
            if (!response.ok) throw new Error('Failed to fetch cron jobs');
            const data = await response.json();
            setCronJobs(data.cronJobs.map((job: any) => ({
                ...job,
                lastStart: new Date(job.lastStart),
                lastEnd: new Date(job.lastEnd)
            })));
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load cron jobs' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.role === UserRole.ADMIN) {
            fetchCronJobs();
        }
    }, [session]);

    const handleResetStatus = async (id: string) => {
        try {
            const response = await fetch('/api/admin/cron/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!response.ok) throw new Error('Failed to reset cron job');

            setMessage({ type: 'success', text: 'Cron job status reset successfully' });
            fetchCronJobs();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to reset cron job status' });
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const response = await fetch('/api/admin/cron/toggle-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, active: !currentActive })
            });

            if (!response.ok) throw new Error('Failed to toggle cron job status');

            setMessage({ type: 'success', text: `Cron job ${currentActive ? 'deactivated' : 'activated'} successfully` });
            fetchCronJobs();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to toggle cron job status' });
        }
    };

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
        return <Section><div className={styles.notAllowed}>Access denied</div></Section>;
    }

    return (
        <Section>
            <div className={styles.cronPage}>
                <h1 className={styles.title}>Cron Jobs Management</h1>

                {message && (
                    <div className={`${styles.message} ${styles[message.type]}`} role="alert">
                        {message.text}
                    </div>
                )}

                <div className={styles.jobsGrid}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading cron jobs...</div>
                    ) : cronJobs.length === 0 ? (
                        <div className={styles.noJobs}>No cron jobs found</div>
                    ) : (
                        <div className={styles.table}>
                            <div className={styles.tableHeader}>
                                <div>Name</div>
                                <div>Type</div>
                                <div>Status</div>
                                <div>Active</div>
                                <div>Last Start</div>
                                <div>Last End</div>
                                <div>Actions</div>
                            </div>
                            {cronJobs.map((job) => (
                                <div key={job.id} className={styles.tableRow}>
                                    <div>{job.name}</div>
                                    <div>{job.type}</div>
                                    <div>
                                        <span className={`${styles.status} ${styles[job.status.toLowerCase()]}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => handleToggleActive(job.id, job.acitve)}
                                            className={`${styles.toggleButton} ${job.acitve ? styles.active : ''}`}
                                        >
                                            {job.acitve ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                    <div>{formatDistanceToNow(job.lastStart, { addSuffix: true })}</div>
                                    <div>{formatDistanceToNow(job.lastEnd, { addSuffix: true })}</div>
                                    <div>
                                        {job.status !== 'idle' && (
                                            <button
                                                onClick={() => handleResetStatus(job.id)}
                                                className={styles.resetButton}
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
}
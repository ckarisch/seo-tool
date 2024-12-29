// app/admin/users/[id]/page.tsx
"use client";

import styles from './userDetails.module.scss';
import Section from '@/components/layout/section';
import { useEffect, useState } from 'react';
import { useProtectedSession } from '@/hooks/useProtectedSession';
import { Domain, User, UserRole } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Globe, Calendar, Key } from 'lucide-react';

interface ExtendedUser extends User {
    domains: Domain[];
    _count: {
        domains: number;
        activities: number;
    };
}

export default function UserDetails() {
    const [user, setUser] = useState<ExtendedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { data: session } = useProtectedSession();
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const fetchUserDetails = async () => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch user details');
            const data = await response.json();
            setUser(data.user);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load user details' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.role === UserRole.ADMIN && userId) {
            fetchUserDetails();
        }
    }, [session, userId]);

    const handleRoleChange = async (newRole: UserRole) => {
        try {
            const response = await fetch('/api/admin/users/update-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });

            if (!response.ok) throw new Error('Failed to update user role');

            setMessage({ type: 'success', text: 'User role updated successfully' });
            fetchUserDetails();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update user role' });
        }
    };

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
        return <Section><div className={styles.notAllowed}>Access denied</div></Section>;
    }

    if (isLoading) {
        return <Section><div className={styles.loading}>Loading user details...</div></Section>;
    }

    if (!user) {
        return <Section><div className={styles.notFound}>User not found</div></Section>;
    }

    return (
        <Section>
            <div className={styles.userDetails}>
                <div className={styles.header}>
                    <button 
                        onClick={() => router.back()} 
                        className={styles.backButton}
                    >
                        <ArrowLeft size={20} />
                        Back to Users
                    </button>
                    <h1 className={styles.title}>User Details</h1>
                </div>

                {message && (
                    <div className={`${styles.message} ${styles[message.type]}`} role="alert">
                        {message.text}
                    </div>
                )}

                <div className={styles.content}>
                    <div className={styles.userCard}>
                        <div className={styles.userInfo}>
                            <div className={styles.infoRow}>
                                <Mail size={20} />
                                <span>{user.email}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <Key size={20} />
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                                    className={styles.roleSelect}
                                >
                                    <option value={UserRole.STANDARD}>Standard</option>
                                    <option value={UserRole.PREMIUM}>Premium</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                </select>
                            </div>
                            <div className={styles.infoRow}>
                                <Globe size={20} />
                                <span>{user._count.domains} domains</span>
                            </div>
                            <div className={styles.infoRow}>
                                <Calendar size={20} />
                                <span>Joined {formatDistanceToNow(new Date(user.createdAt!), { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.domainsSection}>
                        <h2 className={styles.sectionTitle}>Domains</h2>
                        {user.domains.length === 0 ? (
                            <div className={styles.noDomains}>No domains found</div>
                        ) : (
                            <div className={styles.domainsList}>
                                {user.domains.map((domain) => (
                                    <div key={domain.id} className={styles.domainCard}>
                                        <div className={styles.domainHeader}>
                                            <h3 className={styles.domainName}>{domain.name}</h3>
                                            <span className={styles.domainUrl}>{domain.domainName}</span>
                                        </div>
                                        <div className={styles.domainStats}>
                                            <div className={styles.stat}>
                                                <span className={styles.statLabel}>Status</span>
                                                <span className={`${styles.statValue} ${domain.domainVerified ? styles.verified : styles.unverified}`}>
                                                    {domain.domainVerified ? 'Verified' : 'Unverified'}
                                                </span>
                                            </div>
                                            <div className={styles.stat}>
                                                <span className={styles.statLabel}>Score</span>
                                                <span className={styles.statValue}>{domain.score ? `${Math.round(domain.score * 100)}%` : 'N/A'}</span>
                                            </div>
                                            <div className={styles.stat}>
                                                <span className={styles.statLabel}>Last Crawl</span>
                                                <span className={styles.statValue}>
                                                    {domain.lastCrawl ? formatDistanceToNow(new Date(domain.lastCrawl), { addSuffix: true }) : 'Never'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Section>
    );
}
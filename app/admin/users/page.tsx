// app/admin/users/page.tsx
"use client";

import styles from './users.module.scss';
import Section from '@/components/layout/section';
import { useEffect, useState } from 'react';
import { useProtectedSession } from '@/hooks/useProtectedSession';
import { User, UserRole } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';

interface ExtendedUser extends User {
    _count?: {
        domains: number;
    }
}

export default function AdminUsers() {
    const [users, setUsers] = useState<ExtendedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { data: session } = useProtectedSession();

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load users' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.role === UserRole.ADMIN) {
            fetchUsers();
        }
    }, [session]);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            const response = await fetch('/api/admin/users/update-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });

            if (!response.ok) throw new Error('Failed to update user role');

            setMessage({ type: 'success', text: 'User role updated successfully' });
            fetchUsers();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update user role' });
        }
    };

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
        return <Section><div className={styles.notAllowed}>Access denied</div></Section>;
    }

    return (
        <Section>
            <div className={styles.usersPage}>
                <h1 className={styles.title}>User Management</h1>

                {message && (
                    <div className={`${styles.message} ${styles[message.type]}`} role="alert">
                        {message.text}
                    </div>
                )}

                <div className={styles.usersGrid}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className={styles.noUsers}>No users found</div>
                    ) : (
                        <div className={styles.table}>
                            <div className={styles.tableHeader}>
                                <div>Email</div>
                                <div>Name</div>
                                <div>Role</div>
                                <div>Domains</div>
                                <div>Created</div>
                                <div>Actions</div>
                            </div>
                            {users.map((user) => (
                                <div key={user.id} className={styles.tableRow}>
                                    <div title={user.email || ''}>
                                        {user.email || 'No email'}
                                    </div>
                                    <div>{user.name || 'No name'}</div>
                                    <div>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                            className={styles.roleSelect}
                                        >
                                            <option value={UserRole.STANDARD}>Standard</option>
                                            <option value={UserRole.PREMIUM}>Premium</option>
                                            <option value={UserRole.ADMIN}>Admin</option>
                                        </select>
                                    </div>
                                    <div>{user._count?.domains || 0}</div>
                                    <div>
                                        {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'Unknown'}
                                    </div>
                                    <div className={styles.actions}>
                                        <button
                                            className={styles.viewButton}
                                            onClick={() => window.location.href = `/admin/users/${user.id}`}
                                        >
                                            View
                                        </button>
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
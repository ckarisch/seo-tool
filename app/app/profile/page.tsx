
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    User, Mail, Plus, Trash2, Bell, AlertCircle,
    Loader, CheckCircle, Info, Crown
} from 'lucide-react'
import styles from './page.module.scss'
import Section from "@/components/layout/section"
import Background from "@/components/layout/background"
import { Alert, AlertDescription } from '@/components/layout/alert/Alert'
import { ConfirmDialog } from '@/components/layout/dialog/ConfirmDialog'

interface NotificationContact {
    id: string
    name: string
    email: string
    type: string
}

interface UserProfile {
    id: string
    name: string | null
    email: string
    role: string
    createdAt: string
    emailVerified: string | null
    image: string | null
    stripeCustomers: string[]
    notificationContacts: NotificationContact[]
}

export default function ProfilePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/auth/signin')
        },
    })
    const router = useRouter()

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isAddingContact, setIsAddingContact] = useState(false)
    const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
    const [showInfo, setShowInfo] = useState(false);

    const [newContact, setNewContact] = useState({
        name: '',
        email: '',
        type: 'email'
    })

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProfile()
        }
    }, [status])

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/user/profile')
            if (!response.ok) throw new Error('Failed to fetch profile')
            const data = await response.json()
            setProfile(data)
        } catch (err) {
            setError('Could not load profile data')
            console.error('Profile fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch('/api/user/notification-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContact)
            })

            if (!response.ok) throw new Error('Failed to add contact')

            const data = await response.json()
            setProfile(prev => prev ? {
                ...prev,
                notificationContacts: [...prev.notificationContacts, data]
            } : null)

            setNewContact({ name: '', email: '', type: 'email' })
            setIsAddingContact(false)
            setSuccess('Contact added successfully')
        } catch (err) {
            setError('Failed to add contact')
            console.error('Add contact error:', err)
        }
    }

    const handleDeleteContact = async (contactId: string) => {
        try {
            const response = await fetch(`/api/user/notification-contacts/${contactId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to delete contact')

            setProfile(prev => prev ? {
                ...prev,
                notificationContacts: prev.notificationContacts.filter(c => c.id !== contactId)
            } : null)

            setSuccess('Contact deleted successfully')
        } catch (err) {
            setError('Failed to delete contact')
            console.error('Delete contact error:', err)
        }
    }

    const handleDeleteClick = (contactId: string) => {
        setDeleteContactId(contactId)
    }

    const handleConfirmDelete = async () => {
        if (deleteContactId) {
            await handleDeleteContact(deleteContactId)
            setDeleteContactId(null)
        }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader className={styles.spinner} />
                <span>Loading profile...</span>
            </div>
        )
    }

    return (
        <main>
            <Background backgroundImage="" backgroundStyle={'mainColor'}>
                <Section>
                    <div className={styles.heroContainer}>
                        <h1 className={styles.title}>Profile Settings</h1>
                        <p className={styles.description}>
                            Manage your account settings and notification preferences
                        </p>
                    </div>
                </Section>
            </Background>

            <Section>
                <div className={styles.profileContent}>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert variant="success">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <div className={styles.profileGrid}>
                        <div className={styles.infoCard}>
                            <div className={styles.cardHeader}>
                                <User className={styles.cardIcon} />
                                <h2>Account Information</h2>
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Name</span>
                                    <span className={styles.value}>{profile?.name || 'Not set'}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Email</span>
                                    <span className={styles.value}>{profile?.email}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Role</span>
                                    <div className={styles.valueWithIcon}>
                                        <span className={styles.value}>{profile?.role}</span>
                                        {profile?.role === 'premium' && (
                                            <Crown className={styles.roleIcon} size={16} />
                                        )}
                                    </div>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Member Since</span>
                                    <span className={styles.value}>
                                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Email Verified</span>
                                    <span className={styles.value}>
                                        {profile?.emailVerified ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.notificationsCard}>
                            <div className={styles.cardHeader}>
                                <Bell className={styles.cardIcon} />
                                <h2>Notification Contacts</h2>
                                <button
                                    className={styles.infoButton}
                                    onClick={() => setShowInfo(!showInfo)}
                                    aria-label="Show information about notification contacts"
                                >
                                    <Info size={20} />
                                </button>
                                <button
                                    className={styles.addButton}
                                    onClick={() => setIsAddingContact(!isAddingContact)}
                                >
                                    <Plus size={20} />
                                    Add Contact
                                </button>
                            </div>

                            {showInfo && (
                                <div className={`${styles.infoBox} ${styles.show}`}>
                                    <Info size={20} />
                                    <div>
                                        <h4>About Notification Contacts</h4>
                                        <p>
                                            Notification contacts receive alerts about your domains&apos; status,
                                            including performance issues, errors, and security concerns.
                                            Add multiple contacts to ensure your team stays informed.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isAddingContact && (
                                <form onSubmit={handleAddContact} className={styles.addContactForm}>
                                    <div className={styles.infoBox}>
                                        <Info size={20} />
                                        <p>
                                            Contacts will receive email notifications. Make sure to add
                                            valid email addresses that are regularly monitored.
                                        </p>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Name</label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={newContact.name}
                                            onChange={(e) => setNewContact(prev => ({
                                                ...prev,
                                                name: e.target.value
                                            }))}
                                            placeholder="Contact name"
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="email">Email</label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={newContact.email}
                                            onChange={(e) => setNewContact(prev => ({
                                                ...prev,
                                                email: e.target.value
                                            }))}
                                            placeholder="contact@example.com"
                                            required
                                        />
                                    </div>

                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.submitButton}>
                                            Add Contact
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.cancelButton}
                                            onClick={() => setIsAddingContact(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className={styles.contactsList}>
                                {profile?.notificationContacts.map(contact => (
                                    <div key={contact.id} className={styles.contactCard}>
                                        <div className={styles.contactInfo}>
                                            <span className={styles.contactName}>{contact.name}</span>
                                            <span className={styles.contactEmail}>{contact.email}</span>
                                        </div>
                                        <button
                                            className={styles.deleteButton}
                                            onClick={() => handleDeleteClick(contact.id)}
                                            aria-label={`Delete ${contact.name}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}

                                {profile?.notificationContacts.length === 0 && (
                                    <p className={styles.emptyState}>
                                        No notification contacts added yet
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <ConfirmDialog
                isOpen={deleteContactId !== null}
                title="Delete Contact"
                description="Are you sure you want to delete this notification contact? They will no longer receive any alerts or notifications."
                confirmLabel="Delete Contact"
                cancelLabel="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteContactId(null)}
                variant="danger"
            />
        </main>
    )
}
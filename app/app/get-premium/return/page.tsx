// app/return/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import ErrorComponent from '../error'
import Loading from '../loading'

// Type for the API response
interface SessionResponse {
    status: string
    customer_email: string
}

export default function ReturnPage() {
    const [status, setStatus] = useState<string | null>(null)
    const [customerEmail, setCustomerEmail] = useState<string>('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSession = async () => {
            try {
                // Get session_id from URL
                const queryString = window.location.search
                const urlParams = new URLSearchParams(queryString)
                const sessionId = urlParams.get('session_id')

                if (!sessionId) {
                    throw new Error('No session ID found in URL')
                }

                // Fetch session data
                const response = await fetch(`/api/payment/premium/checkout/${sessionId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch session')
                }

                const data: SessionResponse = await response.json()

                setStatus(data.status)
                setCustomerEmail(data.customer_email)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
                console.error('Error fetching session:', err)
            }
        }

        fetchSession()
    }, [])

    // Handle error state
    if (error) {
        return (<div>{error}<ErrorComponent /> </div>)
    }

    // Redirect if status is 'open'
    if (status === 'open') {
        redirect('/')
    }

    // Show success message if status is 'complete'
    if (status === 'complete') {
        return (
            <div className={styles.container}>
                <section className={styles.success}>
                    <p className={styles.message}>
                        We appreciate your business! A confirmation email will be sent to{' '}
                        <strong>{customerEmail}</strong>.
                        If you have any questions, please email{' '}
                        <a
                            href="mailto:orders@example.com"
                            className={styles.link}
                        >
                            orders@example.com
                        </a>.
                    </p>
                </section>
            </div>
        )
    }

    // Show loading state while fetching
    return (<Loading />)
}
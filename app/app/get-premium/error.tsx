// app/checkout/error.tsx
'use client'

import styles from './page.module.scss'

interface ErrorProps {
  error?: Error & { digest?: string }
  reset?: () => void
}

export default function ErrorComponent({ error, reset }: ErrorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.error}>
        <h2 className={styles.errorTitle}>
          Something went wrong!
        </h2>
        {error && <p className={styles.errorMessage}>{error.message}</p>}
        <button
          onClick={reset}
          className={styles.errorButton}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
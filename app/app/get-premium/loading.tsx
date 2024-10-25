// app/checkout/loading.tsx
import styles from './page.module.css'

export default function Loading() {
  return (
    <div className={styles.loader}>
      <div className={styles.spinner} />
    </div>
  )
}
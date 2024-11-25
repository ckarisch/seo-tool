// app/error-types/checkCard.tsx
import { AlertCircle, Lock } from 'lucide-react';
import styles from './page.module.scss';

interface CheckCardProps {
  check: {
    id: string;
    name: string;
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    implementation: 'NOT_IMPLEMENTED' | 'TEST' | 'DEVELOPMENT' | 'PRODUCTION';
    userRole: 'ADMIN' | 'PREMIUM' | 'STANDARD';
  };
  isLocked?: boolean;
  isDevelopment?: boolean;
}

export function CheckCard({ check, isLocked, isDevelopment = false }: CheckCardProps) {
  const getSeverityIcon = (severity: CheckCardProps['check']['severity']) => {
    const baseClass = styles.severityIcon;
    const severityClass = styles[severity.toLowerCase()];
    return (
      <AlertCircle className={`${baseClass} ${severityClass}`} />
    );
  };

  return (
    <div className={`${styles.checkCard} ${isLocked ? styles.locked : ''}`}>
      {getSeverityIcon(check.severity)}
      <div className={styles.checkInfo}>
        <h3>{check.name}</h3>
        <div className={styles.metaInfo}>
          <span className={styles.category}>{check.category}</span>
          {isDevelopment && (
            <span className={`${styles.implementation} ${styles[check.implementation.toLowerCase()]}`}>
              {check.implementation}
            </span>
          )}
        </div>
      </div>
      {isLocked && <Lock className={styles.lockIcon} />}
    </div>
  );
}
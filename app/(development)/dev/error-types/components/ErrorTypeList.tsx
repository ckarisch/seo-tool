import { ErrorType, ImplementationStatus, Severity } from '@prisma/client';
import styles from './ErrorTypeList.module.scss';

type StatusCounts = {
  [K in ImplementationStatus]: number;
};

type CategoryStatusCounts = {
  [category: string]: StatusCounts;
};

interface ErrorTypeListProps {
  groupedErrorTypes: Record<string, ErrorType[]>;
  categoryStatusCounts: CategoryStatusCounts;
}

const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case 'CRITICAL':
      return styles.critical;
    case 'HIGH':
      return styles.high;
    case 'MEDIUM':
      return styles.medium;
    case 'LOW':
      return styles.low;
    case 'INFO':
      return styles.info;
  }
};

const getImplementationStatus = (status: ImplementationStatus): string => {
  switch (status) {
    case 'PRODUCTION':
      return styles.production;
    case 'DEVELOPMENT':
      return styles.development;
    case 'TEST':
      return styles.test;
    case 'NOT_IMPLEMENTED':
      return styles.notImplemented;
  }
};

export default function ErrorTypeList({ groupedErrorTypes, categoryStatusCounts }: ErrorTypeListProps) {
  return (
    <div className={styles.container}>
      {Object.entries(groupedErrorTypes).map(([category, errors]) => (
        <section key={category} className={styles.category} aria-labelledby={`category-${category}`}>
          <div className={styles.categoryHeader}>
            <h2 id={`category-${category}`} className={styles.categoryTitle}>
              {category}
            </h2>
            <div className={styles.categoryStats}>
              <span 
                className={`${styles.statBadge} ${styles.production}`}
                title="Production"
              >
                {categoryStatusCounts[category].PRODUCTION}
              </span>
              <span 
                className={`${styles.statBadge} ${styles.development}`}
                title="Development"
              >
                {categoryStatusCounts[category].DEVELOPMENT}
              </span>
              <span 
                className={`${styles.statBadge} ${styles.test}`}
                title="Test"
              >
                {categoryStatusCounts[category].TEST}
              </span>
              <span 
                className={`${styles.statBadge} ${styles.notImplemented}`}
                title="Not Implemented"
              >
                {categoryStatusCounts[category].NOT_IMPLEMENTED}
              </span>
            </div>
          </div>
          <div className={styles.grid}>
            {errors.map((error) => (
              <article key={error.id} className={styles.errorCard}>
                <div className={styles.errorHeader}>
                  <h3 className={styles.errorName}>{error.name}</h3>
                  <span className={`${styles.severity} ${getSeverityColor(error.severity)}`}>
                    {error.severity}
                  </span>
                </div>
                <div className={styles.errorCode}>
                  Code: <code>{error.code}</code>
                </div>
                <div className={styles.implementation}>
                  <span className={`${styles.status} ${getImplementationStatus(error.implementation)}`}>
                    {error.implementation.replace('_', ' ')}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
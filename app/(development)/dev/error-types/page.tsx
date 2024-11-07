import { prisma } from '@/lib/prisma';
import { isPreviewEnv } from '@/util/environment';
import { ErrorType, ImplementationStatus } from '@prisma/client';
import ErrorTypeList from './components/ErrorTypeList';
import styles from './page.module.scss';
import Section from '@/components/layout/section';

type StatusCounts = {
  [K in ImplementationStatus]: number;
};

type CategoryStatusCounts = {
  [category: string]: StatusCounts;
};

function getInitialStatusCounts(): StatusCounts {
  return {
    NOT_IMPLEMENTED: 0,
    TEST: 0,
    DEVELOPMENT: 0,
    PRODUCTION: 0
  };
}

function calculateStatusCounts(errorTypes: ErrorType[]): {
  totalCounts: StatusCounts;
  categoryStatusCounts: CategoryStatusCounts;
} {
  const totalCounts = getInitialStatusCounts();
  const categoryStatusCounts: CategoryStatusCounts = {};

  errorTypes.forEach(error => {
    totalCounts[error.implementation]++;
    
    if (!categoryStatusCounts[error.category]) {
      categoryStatusCounts[error.category] = getInitialStatusCounts();
    }
    categoryStatusCounts[error.category][error.implementation]++;
  });

  return { totalCounts, categoryStatusCounts };
}

export default async function ErrorTypesPage() {
  if (!isPreviewEnv()) {
    return new Response('Not Found', { status: 404 });
  }

  const errorTypes = await prisma.errorType.findMany({
    orderBy: [
      { category: 'asc' },
      { severity: 'asc' }
    ]
  });

  const { totalCounts, categoryStatusCounts } = calculateStatusCounts(errorTypes);
  
  const groupedErrorTypes = errorTypes.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, typeof errorTypes>);

  const total = Object.values(totalCounts).reduce((acc, curr) => acc + curr, 0);

  return (
    <main className={styles.main}>
      <Section>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Error Types Overview</h1>
            <p className={styles.environment}>Development Environment</p>
          </div>
          <div className={styles.statsOverview}>
            <div className={styles.totalErrors}>
              Total Error Types: <strong>{total}</strong>
            </div>
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.production}`}>
                <span className={styles.statNumber}>{totalCounts.PRODUCTION}</span>
                <span className={styles.statLabel}>Production</span>
              </div>
              <div className={`${styles.statCard} ${styles.development}`}>
                <span className={styles.statNumber}>{totalCounts.DEVELOPMENT}</span>
                <span className={styles.statLabel}>Development</span>
              </div>
              <div className={`${styles.statCard} ${styles.test}`}>
                <span className={styles.statNumber}>{totalCounts.TEST}</span>
                <span className={styles.statLabel}>Test</span>
              </div>
              <div className={`${styles.statCard} ${styles.notImplemented}`}>
                <span className={styles.statNumber}>{totalCounts.NOT_IMPLEMENTED}</span>
                <span className={styles.statLabel}>Not Implemented</span>
              </div>
            </div>
          </div>
        </div>

        <ErrorTypeList 
          groupedErrorTypes={groupedErrorTypes} 
          categoryStatusCounts={categoryStatusCounts}
        />
      </Section>
    </main>
  );
}
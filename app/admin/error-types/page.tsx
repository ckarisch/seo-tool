'use client';

import { useState, useEffect } from 'react';
import styles from './errorTypes.module.scss';
import Section from '@/components/layout/section';
import { AlertCircle } from 'lucide-react';

interface ErrorType {
  id: string;
  code: string;
  name: string;
  implementation: ImplementationStatus;
  category: string;
  severity: Severity;
  userRole: UserRole;
}

type ImplementationStatus = 'NOT_IMPLEMENTED' | 'TEST' | 'DEVELOPMENT' | 'PRODUCTION';
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type UserRole = 'ADMIN' | 'PREMIUM' | 'STANDARD';

type GroupedErrorTypes = {
  [key: string]: ErrorType[];
};

interface UpdatePayload {
  code: string;
  implementation?: ImplementationStatus;
  userRole?: UserRole;
}

export default function ErrorTypesPage() {
  const [errorTypes, setErrorTypes] = useState<ErrorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    fetchErrorTypes();
  }, []);

  const fetchErrorTypes = async () => {
    try {
      const response = await fetch('/api/admin/error-types');
      const data = await response.json();
      setErrorTypes(data.errorTypes);
    } catch (error) {
      console.error('Failed to fetch error types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatePayload: UpdatePayload) => {
    try {
      const response = await fetch('/api/admin/error-types/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update error type');
      }

      setUpdateStatus({
        message: `Successfully updated ${updatePayload.code}`,
        type: 'success',
      });

      fetchErrorTypes();

      setTimeout(() => {
        setUpdateStatus(null);
      }, 3000);
    } catch (error) {
      setUpdateStatus({
        message: `Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  };

  const groupByCategory = (errors: ErrorType[]): GroupedErrorTypes => {
    return errors.reduce((acc, error) => {
      if (!acc[error.category]) {
        acc[error.category] = [];
      }
      acc[error.category].push(error);
      return acc;
    }, {} as GroupedErrorTypes);
  };

  const getSeverityClass = (severity: Severity): string => {
    const severityClasses = {
      CRITICAL: styles.criticalSeverity,
      HIGH: styles.highSeverity,
      MEDIUM: styles.mediumSeverity,
      LOW: styles.lowSeverity,
      INFO: styles.infoSeverity,
    };
    return severityClasses[severity] || '';
  };

  const getImplementationClass = (status: ImplementationStatus): string => {
    const implementationClasses = {
      NOT_IMPLEMENTED: styles.notImplemented,
      TEST: styles.test,
      DEVELOPMENT: styles.development,
      PRODUCTION: styles.production,
    };
    return implementationClasses[status] || '';
  };

  const getUserRoleClass = (role: UserRole): string => {
    const roleClasses = {
      ADMIN: styles.adminRole,
      PREMIUM: styles.premiumRole,
      STANDARD: styles.standardRole,
    };
    return roleClasses[role] || '';
  };

  if (loading) {
    return (
      <Section>
        <div className={styles.loading}>Loading error types...</div>
      </Section>
    );
  }

  const groupedErrors = groupByCategory(errorTypes);

  return (
    <Section>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Error Types Management</h1>
          {updateStatus && (
            <div className={`${styles.statusMessage} ${styles[updateStatus.type]}`}>
              <AlertCircle className={styles.icon} />
              <span>{updateStatus.message}</span>
            </div>
          )}
        </div>

        {Object.entries(groupedErrors).map(([category, errors]) => (
          <div key={category} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <div className={styles.errorGrid}>
              {errors.map((error) => (
                <div key={error.id} className={styles.errorCard}>
                  <div className={styles.errorHeader}>
                    <span className={`${styles.severity} ${getSeverityClass(error.severity)}`}>
                      {error.severity}
                    </span>
                    <h3 className={styles.errorCode}>{error.code}</h3>
                  </div>
                  <p className={styles.errorName}>{error.name}</p>
                  <div className={styles.controls}>
                    <div className={styles.controlGroup}>
                      <label htmlFor={`implementation-${error.id}`}>Implementation:</label>
                      <select
                        id={`implementation-${error.id}`}
                        value={error.implementation}
                        onChange={(e) => handleUpdate({
                          code: error.code,
                          implementation: e.target.value as ImplementationStatus
                        })}
                        className={`${styles.select} ${getImplementationClass(error.implementation)}`}
                      >
                        <option value="NOT_IMPLEMENTED">Not Implemented</option>
                        <option value="TEST">Test</option>
                        <option value="DEVELOPMENT">Development</option>
                        <option value="PRODUCTION">Production</option>
                      </select>
                    </div>
                    <div className={styles.controlGroup}>
                      <label htmlFor={`role-${error.id}`}>Minimum Role:</label>
                      <select
                        id={`role-${error.id}`}
                        value={error.userRole}
                        onChange={(e) => handleUpdate({
                          code: error.code,
                          userRole: e.target.value as UserRole
                        })}
                        className={`${styles.select} ${getUserRoleClass(error.userRole)}`}
                      >
                        <option value="STANDARD">Standard</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
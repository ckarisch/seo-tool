// app/components/WelcomeEmail/WelcomeEmail.tsx
import React from 'react';
import { CheckCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import styles from './WelcomeEmail.module.scss';

interface Metrics {
  quickCheckScore: number;
  performanceScore: number;
  seoScore: number;
  accessibility: number;
  totalIssues: number;
}

interface WelcomeEmailProps {
  domain: string;
  metrics: Metrics;
}

const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ domain, metrics }) => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <CheckCircle className={styles.successIcon} />
        </div>
        <h1 className={styles.title}>Domain Successfully Added</h1>
        <p className={styles.domain}>{domain}</p>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.congratsMessage}>
          <p>
            Congratulations! Your domain has been successfully added to our monitoring system and the initial analysis is complete.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles.quickCheck}`}>
            <div className={styles.metricHeader}>
              <BarChart2 className={styles.metricIcon} />
              <h3>Quick Check Score</h3>
            </div>
            <p className={styles.metricValue}>{metrics.quickCheckScore}%</p>
          </div>
          
          <div className={`${styles.metricCard} ${styles.performance}`}>
            <div className={styles.metricHeader}>
              <BarChart2 className={styles.metricIcon} />
              <h3>Performance</h3>
            </div>
            <p className={styles.metricValue}>{metrics.performanceScore}%</p>
          </div>

          <div className={`${styles.metricCard} ${styles.seo}`}>
            <div className={styles.metricHeader}>
              <BarChart2 className={styles.metricIcon} />
              <h3>SEO Score</h3>
            </div>
            <p className={styles.metricValue}>{metrics.seoScore}%</p>
          </div>

          <div className={`${styles.metricCard} ${styles.accessibility}`}>
            <div className={styles.metricHeader}>
              <BarChart2 className={styles.metricIcon} />
              <h3>Accessibility</h3>
            </div>
            <p className={styles.metricValue}>{metrics.accessibility}%</p>
          </div>
        </div>

        {/* Issues Summary */}
        <div className={styles.issuesCard}>
          <div className={styles.issuesHeader}>
            <AlertTriangle className={styles.alertIcon} />
            <h3>Identified Issues</h3>
          </div>
          <p className={styles.issuesValue}>{metrics.totalIssues}</p>
        </div>

        {/* Next Steps */}
        <div className={styles.nextSteps}>
          <h3>What&apos;s Next?</h3>
          <ul>
            <li>
              <CheckCircle />
              <span>We&apos;ll continuously monitor your domain for any changes or issues</span>
            </li>
            <li>
              <CheckCircle />
              <span>You&apos;ll receive notifications about significant changes in SEO metrics</span>
            </li>
            <li>
              <CheckCircle />
              <span>Regular reports will help you track your website&apos;s performance over time</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p>© {new Date().getFullYear()} Rankidang. All rights reserved.</p>
      </div>
    </div>
  );
};

export default WelcomeEmail;
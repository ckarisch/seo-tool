// app/dashboard/page.tsx
'use client'

import { useState } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Crown, 
  Settings, 
  CreditCard, 
  Receipt,
  ChevronRight,
  BarChart2
} from 'lucide-react';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  isPrimary?: boolean;
}

export default function DashboardPage() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const mainCards: DashboardCard[] = [
    {
      title: 'Domains',
      description: 'Manage your websites and track their SEO performance. Add new domains to your portfolio.',
      icon: <Globe className={styles.cardIcon} />,
      link: '/app/domains',
      isPrimary: true
    },
    {
      title: 'Analytics',
      description: 'View detailed insights, rankings, and performance metrics for your domains.',
      icon: <BarChart2 className={styles.cardIcon} />,
      link: '/app/analytics'
    }
  ];

  const accountCards: DashboardCard[] = [
    {
      title: 'Premium Access',
      description: 'Upgrade your account to unlock all features and advanced analytics.',
      icon: <Crown className={styles.cardIcon} />,
      link: '/app/get-premium'
    },
    {
      title: 'Subscriptions',
      description: 'Manage your subscription plans and billing preferences.',
      icon: <CreditCard className={styles.cardIcon} />,
      link: '/app/subscriptions'
    },
    {
      title: 'Invoices',
      description: 'Access your billing history and download invoices.',
      icon: <Receipt className={styles.cardIcon} />,
      link: '/app/invoices'
    },
    {
      title: 'Settings',
      description: 'Configure your account settings and preferences.',
      icon: <Settings className={styles.cardIcon} />,
      link: '/app/profile'
    }
  ];

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>
              Dashboard
            </h1>
            <p className={styles.description}>
              Welcome back! Manage your domains, track performance, and configure your account settings.
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.dashboardContent}>
          <div className={styles.cardSection}>
            <h2 className={styles.sectionTitle}>SEO Tools</h2>
            <div className={styles.cardsGrid}>
              {mainCards.map((card) => (
                <Link 
                  key={card.title}
                  href={card.link}
                  className={`${styles.card} ${card.isPrimary ? styles.primaryCard : ''}`}
                  onMouseEnter={() => setActiveCardId(card.title)}
                  onMouseLeave={() => setActiveCardId(null)}
                >
                  <div className={styles.cardHeader}>
                    <div className={`${styles.iconWrapper} ${activeCardId === card.title ? styles.iconWrapperActive : ''}`}>
                      {card.icon}
                    </div>
                    <ChevronRight className={styles.arrowIcon} />
                  </div>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.cardSection}>
            <h2 className={styles.sectionTitle}>Account & Billing</h2>
            <div className={styles.cardsGrid}>
              {accountCards.map((card) => (
                <Link 
                  key={card.title}
                  href={card.link}
                  className={styles.card}
                  onMouseEnter={() => setActiveCardId(card.title)}
                  onMouseLeave={() => setActiveCardId(null)}
                >
                  <div className={styles.cardHeader}>
                    <div className={`${styles.iconWrapper} ${activeCardId === card.title ? styles.iconWrapperActive : ''}`}>
                      {card.icon}
                    </div>
                    <ChevronRight className={styles.arrowIcon} />
                  </div>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
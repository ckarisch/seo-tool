// app/domains/[domain]/DomainNavigation.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './DomainNavigation.module.scss';
import { useSession } from 'next-auth/react';
import { getUserRole, canAccessFeature } from '@/lib/session';
import type { UserRole } from '@/types/next-auth';

interface DomainNavigationProps {
  domain: string;
}

interface NavigationItem {
  name: string;
  path: string;
  feature: string;
  roles?: UserRole[];
}

export default function DomainNavigation({ domain }: DomainNavigationProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const basePath = `/app/domains/${domain}`;
  
  const navigationItems: NavigationItem[] = [
    { 
      name: 'Overview', 
      path: basePath,
      feature: 'domain-overview'
    },
    { 
      name: 'Performance', 
      path: `${basePath}/performance`,
      feature: 'performance',
      roles: ['admin']
    },
    { 
      name: 'Quick Analysis', 
      path: `${basePath}/quick-analysis`,
      feature: 'quick-analysis',
      roles: ['admin']
    },
    { 
      name: 'Errors', 
      path: `${basePath}/errors`,
      feature: 'errors'
    },
    { 
      name: 'Crawls', 
      path: `${basePath}/crawls`,
      feature: 'crawls',
      roles: ['admin']
    },
    { 
      name: 'Settings', 
      path: `${basePath}/settings`,
      feature: 'settings'
    }
  ];

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => 
    canAccessFeature(session, item.feature)
  );

  // Function to determine if a link is active
  const isActiveLink = (path: string): boolean => {
    if (path === basePath) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className={styles.domainnav} role="navigation" aria-label="Domain navigation">
      <ul className={styles.navList}>
        {visibleItems.map((item) => (
          <li key={item.name} className={styles.navItem}>
            <Link 
              href={item.path}
              className={`${styles.navLink} ${isActiveLink(item.path) ? styles.active : ''}`}
              aria-current={isActiveLink(item.path) ? 'page' : undefined}
            >
              <span className={styles.linkText}>{item.name}</span>
              {item.roles?.includes('admin') && (
                <span className={styles.adminBadge} aria-label="Admin only">
                  Admin
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
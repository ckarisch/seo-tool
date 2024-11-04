// DomainNavigation.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './DomainNavigation.module.scss';

interface DomainNavigationProps {
  domain: string;
}

export default function DomainNavigation({ domain }: DomainNavigationProps) {
  const pathname = usePathname();
  const basePath = `/app/domains/${domain}`;
  
  const navigationItems = [
    { name: 'Overview', path: basePath },
    { name: 'Crawls', path: `${basePath}/crawls` },
    { name: 'Settings', path: `${basePath}/settings` }
  ];

  return (
    <nav className={styles.domainnav}>
      <ul className={styles.navList}>
        {navigationItems.map((item) => (
          <li key={item.name} className={styles.navItem}>
            <Link 
              href={item.path}
              className={styles.navLink}
              aria-current={pathname === item.path ? 'page' : undefined}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
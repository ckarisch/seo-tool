"use client";
import Link from "next/link";
import Image from "next/image";
import Signin from "@/components/user/signin";
import { useState } from "react";
import styles from './Header.shared.module.scss';

export default function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div id={styles.header} className={styles.header}>
      <nav>
        <ul className={styles.headerList}>
          <li className={styles.headerLi}>
            <Link href={'/'} className={[styles.headerLink, styles.logoLink].join(' ')}>
              <Image className={styles.logo} src={'/logo.svg'} alt="logo" width={150} height={30.5} />
            </Link>
          </li>
          <button
            className={[styles.menuButton, isMenuOpen ? styles.menuOpen : ''].join(' ')}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={[styles.navContainer, isMenuOpen ? styles.mobileMenuOpen : ''].join(' ')}>
            <li className={styles.headerLi}>
              <Link href={'/app/domains'} className={styles.headerLink}>
                Domains
              </Link>
            </li>
            <li className={styles.headerLi}>
              <Link href={'/app/get-premium'} className={styles.headerLink}>
                Get Premium
              </Link>
            </li>
            <li className={styles.headerLi}>
              <Link href={'/app/subscriptions'} className={styles.headerLink}>
                Subscriptions
              </Link>
            </li>
            <li className={styles.headerLi}>
              <Link href={'/app/invoices'} className={styles.headerLink}>
                Invoices
              </Link>
            </li>
            <li className={styles.headerLi}>
              <Signin />
            </li>
          </div>
        </ul>
      </nav>
    </div>
  );
}
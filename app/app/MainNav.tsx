"use client";
import Link from "next/link";
import Image from "next/image";
import Signin from "@/components/user/signin";
import { useState } from "react";
import styles from "./layout.module.scss";

export default function MainNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav id={styles.globalnav}>
      <ul className={styles.globalheaderList}>
        <li className={styles.globalheaderLi}>
          <Link href={'/'} className={[styles.globalheaderLink, styles.logoLink].join(' ')}>
            <Image className={styles.logo} src={'/logo.svg'} alt="logo" width={150} height={30.5}></Image>
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
          <li className={styles.globalheaderLi}>
            <Link href={'/app/domains'} className={styles.globalheaderLink}>
              Domains
            </Link>
          </li>
          <li className={styles.globalheaderLi}>
            <Link href={'/app/get-premium'} className={styles.globalheaderLink}>
              Get Premium
            </Link>
          </li>
          <li className={styles.globalheaderLi}>
            <Link href={'/app/subscriptions'} className={styles.globalheaderLink}>
              Subscriptions
            </Link>
          </li>
          <li className={styles.globalheaderLi}>
            <Link href={'/app/invoices'} className={styles.globalheaderLink}>
              Invoices
            </Link>
          </li>
          <li className={styles.globalheaderLi}>
            <Signin />
          </li>
        </div>
      </ul>
    </nav>
  );
}
"use client";
// components/AnimatedSecurePhone.tsx
import React, { useState, useEffect } from 'react';
import styles from './AnimatedSecure.module.scss';

interface AnimatedSecurePhoneProps {
  phoneNumber: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'underline' | 'highlight' | 'slide' | 'glow' | 'brackets';
  showCountryCode?: boolean;
}

const AnimatedSecurePhone: React.FC<AnimatedSecurePhoneProps> = ({
  phoneNumber,
  className = '',
  children,
  variant = 'underline',
  showCountryCode = true,
}) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Security functions
  const encode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    return window.btoa(str);
  };

  const decode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    return window.atob(str);
  };

  const scrambleNumber = (str: string): string => {
    return str.split('').reverse().join('');
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length and if showing country code
    if (showCountryCode) {
      if (cleaned.length === 11) { // With country code (e.g., 1XXXXXXXXXX)
        return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
      }
    }
    
    // Default format: (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const decodedPhone = decode(encodedPhone);
    const originalPhone = scrambleNumber(decodedPhone);
    window.location.href = `tel:${originalPhone}`;
  };

  const encodedPhone = encode(scrambleNumber(phoneNumber));

  const displayPhone = isClient ? 
    formatPhoneNumber(scrambleNumber(decode(encodedPhone))) : 
    '...';

  return (
    <a
      href="#"
      onClick={handleClick}
      className={`${styles.link} ${styles[variant]} ${className}`}
      data-encoded-phone={encodedPhone}
      rel="nofollow"
    >
      {variant === 'brackets' ? (
        <span className={styles.bracketContent}>
          <span className={styles.bracketText}>
            {children || displayPhone}
          </span>
        </span>
      ) : (
        children || displayPhone
      )}
    </a>
  );
};

export default AnimatedSecurePhone;
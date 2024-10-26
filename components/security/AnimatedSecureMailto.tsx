"use client";

import React, { useState, useEffect } from 'react';
import styles from './AnimatedSecureMailto.module.scss';

interface AnimatedSecureMailtoProps {
  email: string;
  subject?: string;
  body?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'underline' | 'highlight' | 'slide' | 'glow' | 'brackets';
}

export const AnimatedSecureMailto: React.FC<AnimatedSecureMailtoProps> = ({
  email,
  subject = '',
  body = '',
  className = '',
  children,
  variant = 'underline'
}) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const encode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    return window.btoa(str);
  };

  const decode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    return window.atob(str);
  };

  const reverseEmail = (str: string): string => {
    return str.split('').reverse().join('');
  };

  const createMailtoLink = (decodedEmail: string): string => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (body) params.append('body', body);
    
    const queryString = params.toString();
    return `mailto:${decodedEmail}${queryString ? '?' + queryString : ''}`;
  };

  const encodedEmail = encode(reverseEmail(email));

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const decodedEmail = decode(encodedEmail);
    const originalEmail = reverseEmail(decodedEmail);
    window.location.href = createMailtoLink(originalEmail);
  };

  const displayEmail = isClient ? 
    reverseEmail(decode(encodedEmail)) : 
    '...';

  return (
    <a
      href="#"
      onClick={handleClick}
      className={`${styles.link} ${styles[variant]} ${className}`}
      data-encoded-email={encodedEmail}
      rel="nofollow"
    >
      {variant === 'brackets' ? (
        <span className={styles.bracketContent}>
          <span className={styles.bracketText}>
            {children || displayEmail}
          </span>
        </span>
      ) : (
        children || displayEmail
      )}
    </a>
  );
};
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import styles from './AnimatedSecureMailto.module.scss';

interface AnimatedSecureMailtoProps {
  email: string;
  subject?: string;
  body?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'underline' | 'highlight' | 'slide' | 'glow' | 'brackets';
  showIcon?: boolean;
  requireClick?: boolean;
  ariaLabel?: string;
  description?: string;
}

export const AnimatedSecureMailto: React.FC<AnimatedSecureMailtoProps> = ({
  email,
  subject = '',
  body = '',
  className = '',
  children,
  variant = 'underline',
  showIcon = true,
  requireClick = true,
  ariaLabel,
  description
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!requireClick);
  const [reveals, setReveals] = useState(0);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    setIsClient(true);
    
    // Reset reveals count after 1 hour
    const resetTime = localStorage.getItem('emailRevealsResetTime');
    if (resetTime && Date.now() - parseInt(resetTime) > 3600000) {
      localStorage.removeItem('emailReveals');
      localStorage.removeItem('emailRevealsResetTime');
    }
  }, []);

  // Handle keyboard interactions
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isRevealed && requireClick) {
          handleReveal();
        } else if (isRevealed) {
          handleMailto();
        }
      }
    };

    const button = buttonRef.current;
    if (button) {
      button.addEventListener('keydown', handleKeyPress);
      return () => button.removeEventListener('keydown', handleKeyPress);
    }
  }, [isRevealed, requireClick]);

  const encode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    try {
      return window.btoa(
        str.split('').map((char) => 
          char.charCodeAt(0).toString(16).padStart(2, '0')
        ).join('')
      );
    } catch (error) {
      setIsError(true);
      setErrorMessage('Encoding failed. Please try again.');
      return '';
    }
  };

  const decode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    try {
      const decoded = window.atob(str);
      const chars = decoded.match(/.{1,2}/g) || [];
      return chars
        .map(char => String.fromCharCode(parseInt(char, 16)))
        .join('');
    } catch {
      setIsError(true);
      setErrorMessage('Decoding failed. Please try again.');
      return '';
    }
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

  const handleReveal = () => {
    // Check for rate limiting
    let currentReveals = 0;
    try {
      currentReveals = parseInt(localStorage.getItem('emailReveals') || '0');
    } catch (error) {
      currentReveals = 0;
    }

    if (currentReveals >= 10) {
      setIsError(true);
      setErrorMessage('Too many attempts. Please try again later.');
      announce('Rate limit reached. Please try again later.');
      return;
    }

    // Update reveals count
    localStorage.setItem('emailReveals', (currentReveals + 1).toString());
    if (!localStorage.getItem('emailRevealsResetTime')) {
      localStorage.setItem('emailRevealsResetTime', Date.now().toString());
    }

    setIsRevealed(true);
    setReveals(prev => prev + 1);
    
    // Announce to screen readers
    const revealedEmail = reverseEmail(decode(encodedEmail));
    announce(`Email address revealed: ${revealedEmail}`);
  };

  const handleMailto = () => {
    if (isError) return;

    try {
      const decodedEmail = decode(encodedEmail);
      const originalEmail = reverseEmail(decodedEmail);
      window.location.href = createMailtoLink(originalEmail);
    } catch (error) {
      setIsError(true);
      setErrorMessage('Failed to open email client. Please try again.');
      announce('Failed to open email client. Please try again.');
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!isRevealed && requireClick) {
      handleReveal();
      return;
    }

    handleMailto();
  };

  // Announce messages to screen readers
  const announce = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.position = 'absolute';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.padding = '0';
    announcement.style.margin = '-1px';
    announcement.style.overflow = 'hidden';
    announcement.style.clip = 'rect(0, 0, 0, 0)';
    announcement.style.whiteSpace = 'nowrap';
    announcement.style.border = '0';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const encodedEmail = encode(reverseEmail(email));
  const displayEmail = isClient && isRevealed ? 
    reverseEmail(decode(encodedEmail)) : 
    'Click to reveal email address';

  const computedAriaLabel = ariaLabel || 
    (isRevealed ? `Send email to ${reverseEmail(decode(encodedEmail))}` : 'Click to reveal email address');

  // High contrast mode detection
  const preferHighContrast = typeof window !== 'undefined' ? 
    window.matchMedia('(forced-colors: active)').matches : false;

  const linkContent = (
    <>
      {showIcon && (
        <Mail 
          size={16} 
          aria-hidden="true"
          role="presentation" 
        />
      )}
      <span className={styles.text}>
        {children || displayEmail}
      </span>
      {isError && (
        <span className={styles.errorMessage} role="alert">
          {errorMessage}
        </span>
      )}
    </>
  );

  // Don't render during SSR
  if (!isClient) return null;

  return (
    <div className={styles.container}>
      {description && (
        <span className={styles.srOnly} id="emailDescription">
          {description}
        </span>
      )}
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`${styles.button} ${styles[variant]} ${className} ${isError ? styles.error : ''}`}
        aria-label={computedAriaLabel}
        aria-describedby={description ? "emailDescription" : undefined}
        aria-pressed={isRevealed}
        role="button"
        data-high-contrast={preferHighContrast}
        disabled={isError}
        type="button"
      >
        {variant === 'brackets' ? (
          <span className={styles.bracketContent}>
            <span className={styles.bracketText}>
              {linkContent}
            </span>
          </span>
        ) : (
          linkContent
        )}
      </button>
    </div>
  );
};

export default AnimatedSecureMailto;
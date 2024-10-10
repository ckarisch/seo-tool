"use client";
// SecurePhoneReveal.tsx
import React, { useState, useCallback } from 'react';
import styles from './SecurePhoneReveal.module.scss';

interface SecurePhoneRevealProps {
  phoneNumber: string;
  className?: string;
  revealText?: string;
  hideText?: string;
  formatNumber?: boolean;
  copiedText?: string;
}

const SecurePhoneReveal: React.FC<SecurePhoneRevealProps> = ({
  phoneNumber,
  className = '',
  revealText = 'Show Phone Number',
  hideText = 'Hide Phone Number',
  formatNumber = true,
  copiedText = 'Copied!'
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  const formatPhoneNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return number;
  };

  const toggleReveal = () => {
    if (!isRevealed) {
      setIsAnimating(true);
    }
    setIsRevealed(!isRevealed);
  };

  const handleAnimationEnd = () => {
    setIsAnimating(false);
  };

  const handleCopy = useCallback(async () => {
    try {
      setCopyState('copying');
      await navigator.clipboard.writeText(phoneNumber);
      setCopyState('copied');

      // Reset copy state after animation
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (err) {
      setCopyState('idle');
      console.error('Failed to copy:', err);
    }
  }, [phoneNumber]);

  const displayNumber = formatNumber ? formatPhoneNumber(phoneNumber) : phoneNumber;

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        onClick={toggleReveal}
        className={styles.toggleButton}
      >
        <span>{isRevealed ? hideText : revealText}</span>
        <svg
          className={`${styles.arrow} ${isRevealed ? styles.rotated : ''}`}
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div className={styles.revealContainer}>
        <div
          className={`${styles.content} ${isRevealed ? styles.revealed : ''} 
                     ${isAnimating ? styles.animating : ''}`}
          onTransitionEnd={handleAnimationEnd}
        >
          <div className={styles.phoneContainer}>
            <a
              href={`tel:${phoneNumber}`}
              className={styles.phoneNumber}
            >
              {displayNumber}
            </a>
            <div className={styles.copyWrapper}>
              <button
                onClick={handleCopy}
                className={`${styles.copyButton} ${styles[copyState]}`}
                title="Copy to clipboard"
                disabled={copyState === 'copying'}
              >
                <div className={styles.iconWrapper}>
                  {/* Copy icon */}
                  <svg
                    className={`${styles.copyIcon} ${styles.copySymbol} ${copyState !== 'idle' ? styles.hidden : ''}`}
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  {/* Checkmark icon */}
                  <svg
                    className={`${styles.copyIcon} ${styles.checkSymbol} ${copyState === 'idle' ? styles.hidden : ''}`}
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </button>
              <span
                className={`${styles.tooltip} ${copyState === 'copied' ? styles.visible : ''}`}
              >
                {copiedText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurePhoneReveal;
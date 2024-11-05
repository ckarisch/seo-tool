"use client";

import React, { useState } from 'react';
import { defaultDomainState, Domain } from "@/interfaces/domain";
import styles from "./domainStatusContent.module.scss";
import { InformationCircleOutline } from "@/icons/information-circle-outline";
import { Copy, Loader } from "lucide-react";
import { fetchData, LoadingState } from "@/util/client/fetchData";

interface DomainStatusContentProps {
  domain: Partial<Domain>;
  onVerifyClick: (domain: string, verificationKey: string, onVerify: () => Promise<void>) => void;
  onVerificationComplete: (success: boolean, message: string) => void;
  dummyText?: boolean;
}

type VerificationState = 'idle' | 'checking' | 'success' | 'error';

interface VerificationStatus {
  state: VerificationState;
  message?: string;
}

export default function DomainStatusContent({ 
  domain,
  onVerifyClick,
  onVerificationComplete,
  dummyText = false
}: DomainStatusContentProps) {
  const [verificationResponse, setVerificationResponse] = useState(defaultDomainState);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    state: 'idle'
  });
  const [showCopied, setShowCopied] = useState(false);
  const fetchTag = 'seo/domain/' + domain.domainName + '/verification.domain';

  const handleCopyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!domain.domainVerificationKey) return;
    
    try {
      await navigator.clipboard.writeText(domain.domainVerificationKey);
      setShowCopied(true);
      setTimeout(() => {
        setShowCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleVerificationRequest = async (): Promise<void> => {
    setVerificationStatus({ state: 'checking' });
    
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_DOMAIN}/api/seo/domains/${domain.domainName}/verify`;
      const response = await fetch(endpoint);
      const jsonData = await response.json();
      
      if (!response.ok) {
        let errorMessage = 'Verification failed. ';
        if (jsonData.error) {
          if (jsonData.error === 'No verification key present') {
            errorMessage += 'Missing verification key.';
          } else if (jsonData.error.includes('DNS')) {
            errorMessage += 'DNS record not found. Please check your DNS settings and try again.';
          } else {
            errorMessage += jsonData.error;
          }
        } else {
          errorMessage += 'Please check your DNS settings and try again.';
        }
        
        setVerificationStatus({ 
          state: 'error',
          message: errorMessage
        });
        onVerificationComplete(false, errorMessage);
        return;
      }

      // Successful verification
      await fetchData(`api/seo/domains/${domain.domainName}`, fetchTag, setVerificationResponse, null);
      setVerificationStatus({ 
        state: 'success',
        message: 'Domain verified successfully!'
      });
      onVerificationComplete(true, 'Domain verified successfully!');
    } catch (error) {
      const errorMessage = 'An error occurred during verification. Please try again.';
      setVerificationStatus({ 
        state: 'error',
        message: errorMessage
      });
      onVerificationComplete(false, errorMessage);
    }
  };

  const handleVerifyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (domain.domainName && domain.domainVerificationKey) {
      onVerifyClick(domain.domainName, domain.domainVerificationKey, handleVerificationRequest);
    }
  };

  const getVerificationStatusUI = () => {
    switch (verificationStatus.state) {
      case 'checking':
        return (
          <div className={styles.verificationStatus}>
            <Loader className={styles.spinner} size={16} />
            <span>Verifying domain...</span>
          </div>
        );
      case 'error':
        return (
          <div className={`${styles.verificationStatus} ${styles.error}`}>
            <span>{verificationStatus.message}</span>
          </div>
        );
      case 'success':
        return (
          <div className={`${styles.verificationStatus} ${styles.success}`}>
            <span>{verificationStatus.message}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.domainStatusContent}>
      <div className={[styles.contentEntry, dummyText ? styles.dummyText : ''].join(' ')}>
        {!domain.domainVerified && !dummyText && (
          <div className={styles.verificationSection}>
            <span className={styles.verificationLabel}>Verification code:</span>
            <div className={styles.codeContainer}>
              <div 
                className={styles.verificationCode}
                onClick={handleCopyClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCopyClick(e as any);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {domain.domainVerificationKey}
                <Copy size={16} className={styles.copyIcon} />
              </div>
              <div className={[styles.tooltip, showCopied ? styles.show : ''].join(' ')}>
                Copied!
              </div>
            </div>
            {getVerificationStatusUI()}
            <button
              className={styles.verifyButton}
              onClick={handleVerifyClick}
              disabled={verificationStatus.state === 'checking'}
            >
              {verificationStatus.state === 'checking' ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Verifying...
                </>
              ) : (
                'Verify domain'
              )}
            </button>
          </div>
        )}
        
        {(domain.domainVerified || dummyText) && (
          <div className={styles.score}>
            <div className={[
              styles.scoreValue,
              dummyText ? styles.dummyText :
              domain.score && domain.score > 0.80 ? styles.veryGood : 
              domain.score && domain.score > 0.50 ? styles.good : 
              styles.bad
            ].join(' ')}>
              {!dummyText && domain.score !== undefined && Math.round(domain.score * 100)}
            </div>
            <span className={styles.scoreLabel}>Score</span>
          </div>
        )}
      </div>

      {domain.disableNotifications && (
        <div className={[styles.notifications, dummyText ? styles.dummyText : ''].join(' ')} 
             title="Notifications disabled">
          <InformationCircleOutline />
        </div>
      )}
    </div>
  );
}
"use client";

import { defaultDomainState, Domain } from "@/interfaces/domain";
import styles from "./domainStatusContent.module.scss";
import { InformationCircleOutline } from "@/icons/information-circle-outline";
import { Copy } from "lucide-react";
import { useState } from "react";
import { fetchData, LoadingState } from "@/util/client/fetchData";

export default function DomainStatusContent({ domain }: { domain: Partial<Domain> }) {
  const fetchTag = 'seo/domain/' + domain.domainName + '/verification.domain';
  const [verificationResponse, setverificationResponse] = useState(defaultDomainState);
  const [verificationStatus, setverificationStatus] = useState<LoadingState>('idle');
  const [showCopied, setShowCopied] = useState(false);

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

  const handleVerificationRequest = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setverificationStatus('loading');
    
    if (!confirm('Do you really want to verify this domain?')) {
      setverificationStatus('idle');
      return false;
    }
    
    const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + domain.domainName + '/verify';
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const response = await fetch(endpoint, options);
    const jsonData = await response.json();
    setverificationStatus('idle');

    await fetchData('api/seo/domains/' + domain.domainName, fetchTag, setverificationResponse, null);
    return jsonData;
  };

  return (
    <div className={styles.domainStatusContent}>
      <div className={styles.contentEntry}>
        {!domain.domainVerified && (
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
            <button
              onClick={handleVerificationRequest}
              disabled={verificationStatus === 'loading'}
            >
              {verificationStatus === 'loading' ? 'Verifying...' : 'Verify domain'}
            </button>
          </div>
        )}
        
        {domain.domainVerified && domain.score !== undefined && domain.score !== null && (
          <div className={styles.score}>
            <div className={[
              styles.scoreValue,
              domain.score > 0.80 ? styles.veryGood : 
              domain.score > 0.50 ? styles.good : 
              styles.bad
            ].join(' ')}>
              {Math.round(domain.score * 100)}
            </div>
            <span className={styles.scoreLabel}>Score</span>
          </div>
        )}
      </div>

      {domain.disableNotifications && (
        <div className={styles.notifications} title="Notifications disabled">
          <InformationCircleOutline />
        </div>
      )}
    </div>
  );
}
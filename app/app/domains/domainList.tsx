"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import DomainSummary from "./domainSummary";
import styles from "./domainList.module.scss";
import { useDomainsStore } from "@/store/domains";
import { Domain } from "@prisma/client";

interface DomainListProps {
  onVerifyClick: (domain: string, verificationKey: string, onVerify: () => Promise<void>) => void;
  onVerificationComplete: (success: boolean, message: string) => void;
  onDeleteClick: (domain: Partial<Domain>) => void;
}

const dummyDomains: Partial<Domain>[] = [0, 1, 2, 3, 4, 5].map(i => ({
  name: 'Loading...',
  domainName: 'example.com',
  domainVerified: true,
  image: '',
  warning: false,
  error: false,
  score: 0
}));

export default function DomainList({ 
  onVerifyClick, 
  onVerificationComplete,
  onDeleteClick 
}: DomainListProps) {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      // Handle unauthenticated state
    },
  });

  const { domains, isLoading, fetchDomains } = useDomainsStore();

  useEffect(() => {
    if (status !== "loading") {
      fetchDomains();
    }
  }, [status, fetchDomains]);

  if (status === "loading" || isLoading) {
    return (
      <div className={styles.domainsGrid}>
        {dummyDomains.map((_, index) => (
          <DomainSummary
            key={index}
            domain={dummyDomains[index]}
            dummyText={true}
            onVerifyClick={onVerifyClick}
            onVerificationComplete={onVerificationComplete}
            onDeleteClick={onDeleteClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.domainsGrid}>
      {domains.map((domain: Domain, index: number) => (
        <DomainSummary
          key={domain.id || index}
          domain={domain}
          dummyText={false}
          onVerifyClick={onVerifyClick}
          onVerificationComplete={onVerificationComplete}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </div>
  );
}
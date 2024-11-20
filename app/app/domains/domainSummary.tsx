"use client";

import styles from "./domainSummary.module.scss";
import { WarningOutline } from "@/icons/warning-outline";
import { Warning } from "@/icons/warning";
import Link from "next/link";
import DomainStatusContent from "./domainStatusContent";
import Image from "next/image";
import { Domain } from "@prisma/client";
import { Trash2 } from 'lucide-react';

interface DomainSummaryProps {
  domain: Partial<Domain>;
  dummyText: boolean;
  onVerifyClick: (domain: string, verificationKey: string, onVerify: () => Promise<void>) => void;
  onVerificationComplete: (success: boolean, message: string) => void;
  onDeleteClick: (domain: Partial<Domain>) => void;
}

export default function DomainSummary({
  domain,
  dummyText,
  onVerifyClick,
  onVerificationComplete,
  onDeleteClick
}: DomainSummaryProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteClick(domain);
  };

  return (
    <Link href={dummyText ? '' : '/app/domains/' + domain.domainName}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.image}>
            {domain.image ?
              <Image
                src={domain.image}
                alt={`${domain.name} preview`}
                width={100}
                height={60}
                style={{ objectFit: 'cover', objectPosition: 'top' }}
              /> :
              <div className={styles.placeholder}>preview</div>
            }
          </div>
          <div className={styles.info}>
            <div className={[styles.name, dummyText ? styles.dummyText : ''].join(' ')}>
              {domain.name}
            </div>
            <div className={[styles.domain, dummyText ? styles.dummyText : ''].join(' ')}>
              {domain.domainName}
            </div>
          </div>
          <div className={styles.actions}>
            <div className={styles.notifications}>
              {domain.warning && (
                <div className={[styles.notification, styles.warning].join(' ')} title="Warning">
                  <WarningOutline />
                </div>
              )}
              {domain.error && (
                <div className={[styles.notification, styles.err].join(' ')} title="Error">
                  <Warning />
                </div>
              )}
              {!domain.domainVerified && (
                <div className={[styles.notification, styles.err].join(' ')} title="Not verified">
                  <Warning />
                </div>
              )}
            </div>
            {!dummyText && (
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                aria-label={`Delete domain ${domain.name}`}
                title="Delete domain"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.content}>
          <DomainStatusContent
            domain={domain}
            onVerifyClick={onVerifyClick}
            onVerificationComplete={onVerificationComplete}
            dummyText={dummyText}
          />
        </div>
      </div>
    </Link>
  );
}
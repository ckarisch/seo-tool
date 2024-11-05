// domains/page.tsx
"use client";

import { useState, useRef } from 'react';
import styles from './domains.module.scss';
import DomainList from './domainList';
import AddDomainForm from './addDomainForm';
import { Plus, X } from 'lucide-react';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import { ConfirmDialog } from '@/components/layout/dialog/ConfirmDialog';
import { Alert, AlertDescription } from '@/components/layout/alert/Alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface VerificationDialogState {
  isOpen: boolean;
  domain: string;
  verificationKey: string;
  onVerify: () => Promise<void>;
}

export default function DomainsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [verificationDialog, setVerificationDialog] = useState<VerificationDialogState>({
    isOpen: false,
    domain: '',
    verificationKey: '',
    onVerify: async () => {}
  });

  // Method to be passed to DomainStatusContent
  const openVerificationDialog = (domain: string, verificationKey: string, onVerify: () => Promise<void>) => {
    setVerificationDialog({
      isOpen: true,
      domain,
      verificationKey,
      onVerify
    });
  };

  const handleAddDomainClick = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleVerificationComplete = async (success: boolean, message: string) => {
    setAlert({
      type: success ? 'success' : 'error',
      message
    });

    // Clear alert after 5 seconds
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  };

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>
              Manage your domains
            </h1>
            <p className={styles.description}>
              Track and optimize your websites&apos; SEO performance. Add domains to your portfolio and get detailed insights and recommendations.
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.domainsContent}>
          {alert && (
            <Alert variant={alert.type === 'success' ? 'success' : 'destructive'}>
              {alert.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          <div className={styles.domainsHeader}>
            <h2 className={styles.domainsTitle}>Your Domains</h2>
            <button
              onClick={handleAddDomainClick}
              className={styles.addButton}
            >
              {showAddForm ? <X size={20} /> : <Plus size={20} />}
              {showAddForm ? 'Cancel' : 'Add Domain'}
            </button>
          </div>
          
          <DomainList onVerifyClick={openVerificationDialog} onVerificationComplete={handleVerificationComplete} />
        </div>
      </Section>

      {showAddForm && (
        <Background backgroundImage="" backgroundStyle={'mainColor'}>
          <Section>
            <div ref={formRef} className={styles.formSection}>
              <AddDomainForm onClose={() => setShowAddForm(false)} />
            </div>
          </Section>
        </Background>
      )}

      <ConfirmDialog
        isOpen={verificationDialog.isOpen}
        title="Verify Domain Ownership"
        description={
          `Please add the following TXT record to your domain's DNS settings:
          
          Record type: TXT
          Host: @ or empty
          Value: ${verificationDialog.verificationKey}
          
          After adding the DNS record, click 'Verify' to confirm ownership. Note that DNS changes may take up to 48 hours to propagate.`
        }
        confirmLabel="Verify"
        cancelLabel="Cancel"
        onConfirm={async () => {
          await verificationDialog.onVerify();
          setVerificationDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setVerificationDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </main>
  );
}
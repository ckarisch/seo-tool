"use client";

import { useState, useRef } from 'react';
import styles from './domains.module.scss';
import DomainList from './domainList';
import AddDomainForm from './addDomainForm';
import { Plus, X } from 'lucide-react';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";

export default function DomainsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const handleAddDomainClick = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
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
          
          <DomainList />
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
    </main>
  );
}
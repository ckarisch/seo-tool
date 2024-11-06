// app/onboarding/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { Loader, Building2, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import URLInput from '@/components/layout/input/URLinput';

interface OnboardingStep {
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Website Name',
    description: 'Add your first website'
  },
  {
    title: 'Add Your Domain',
    description: 'Start monitoring your website'
  },
  {
    title: 'Plan Selection',
    description: 'Choose your subscription'
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession({
    required: true
  })
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [isWebsiteValid, setIsWebsiteValid] = useState(false);

  useEffect(() => {
    const checkDomains = async () => {
      try {
        const response = await fetch('/api/seo/domains');
        const data = await response.json();

        if (response.ok && Array.isArray(data.domains) && data.domains.length > 0) {
          // User already has domains, redirect based on context
          if (selectedPlan) {
            router.push(`/app/get-premium?plan=${selectedPlan}`);
          } else {
            router.push('/app/domains');
          }
          return;
        }

        // No domains found, continue with onboarding
        setIsLoading(false);
      } catch (err) {
        console.error('Error checking domains:', err);
        setError('Failed to check existing domains');
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      checkDomains();
    }
  }, [status, router, selectedPlan]);

  const handleAddDomain = async () => {
    if (!isWebsiteValid) {
      setError('Please enter a valid domain');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/seo/domains/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyName,
          domainName: website,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain');
      }

      // After successfully adding the domain, redirect based on context
      if (selectedPlan) {
        router.push(`/app/get-premium?plan=${selectedPlan}`);
      } else {
        router.push('/app/domains');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking domains
  if (status === "loading" || isLoading) {
    return (
      <div className={styles.loading}>
        <Loader className={styles.spinner} size={24} />
        <span>Loading...</span>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputGroup}>
              <label htmlFor="companyName">Company name</label>
              <div className={styles.inputWrapper}>
                <Building2 className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  required
                />
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className={styles.button}
              disabled={!companyName}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        );

      case 1:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputGroup}>
              <label htmlFor="website">Website domain</label>
              <div className={styles.inputWrapper}>
                <Globe className={styles.inputIcon} size={18} />
                <URLInput
                  className={styles.input}
                  placeholder="www.example.com"
                  onChange={(e) => setWebsite(e.target.value)}
                  onValidation={setIsWebsiteValid}
                  value={website}
                />
              </div>
            </div>
            <button
              onClick={handleAddDomain}
              className={styles.button}
              disabled={isSubmitting || !isWebsiteValid}
            >
              {isSubmitting ? (
                <>
                  <Loader className={styles.spinner} size={16} />
                  Adding domain...
                </>
              ) : (
                <>
                  {selectedPlan ? 'Finish' : 'Continue'} <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <button
              onClick={() => router.push('/pricing')}
              className={styles.button}
            >
              Choose your plan <ArrowRight size={16} />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Let&apos;s get you started</h1>
            <p className={styles.description}>
              Complete your account setup to start monitoring your websites
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.onboardingContainer}>
          <div className={styles.stepsIndicator}>
            {steps.map((step, index) => (
              <div
                key={index}
                className={`${styles.step} ${
                  index === currentStep ? styles.active : ''
                } ${index < currentStep ? styles.completed : ''}`}
              >
                <div className={styles.stepNumber}>
                  {index < currentStep ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className={styles.stepText}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Card className={styles.formCard}>
            <div className={styles.cardContent}>
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}
              {renderStepContent()}
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
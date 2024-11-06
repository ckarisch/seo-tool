"use client";

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../signin/page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { Loader, Lock, User, Cookie, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCookieConsent, setHasCookieConsent] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const plan = searchParams.get('plan');

  useEffect(() => {
    const checkCookieConsent = () => {
      const cookieConsent = localStorage.getItem('cookieConsent');
      if (cookieConsent) {
        try {
          const consent = JSON.parse(cookieConsent);
          setHasCookieConsent(consent.necessary === true);
        } catch {
          setHasCookieConsent(false);
        }
      } else {
        setHasCookieConsent(false);
      }
      setIsLoading(false);
    };

    // Add a small delay to prevent flash
    const timer = setTimeout(checkCookieConsent, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasCookieConsent) {
      setError('Cookie consent required. Please accept necessary cookies to sign up.');
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Register user
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'user',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Sign in after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes('Cookie consent required')) {
          throw new Error('Please accept necessary cookies to sign in. These cookies are required for authentication.');
        } else if (result.error.includes('Invalid cookie consent')) {
          throw new Error('Your cookie preferences are invalid. Please update your cookie settings.');
        } else {
          throw new Error('Failed to sign in after registration');
        }
      }

      // Redirect to onboarding with plan if specified
      router.push(plan ? `/app/onboarding?plan=${plan}` : '/app/onboarding');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCookieSettings = () => {
    localStorage.removeItem('cookieConsent');
    window.location.reload();
  };

  if (isLoading) {
    return (
      <main>
        <Background backgroundImage="" backgroundStyle={'mainDark'}>
          <Section>
            <div className={styles.heroContainer}>
              <h1 className={styles.title}>Create your account</h1>
              <p className={styles.description}>
                {plan ?
                  `Get started with your ${plan} plan` :
                  'Start monitoring your domains today'}
              </p>
            </div>
          </Section>
        </Background>

        <Section>
          <div className={styles.formContainer}>
            <Card>
              <div className={`${styles.cardContent} ${styles.loadingState}`}>
                <div className={styles.loadingSpinner}>
                  <Loader className={styles.spinner} size={32} />
                  <p>Loading...</p>
                </div>
              </div>
            </Card>
          </div>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.description}>
              {plan ?
                `Get started with your ${plan} plan` :
                'Start monitoring your domains today'}
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.formContainer}>
          <Card>
            <div className={styles.cardContent}>
              {!hasCookieConsent && (
                <div className={styles.cookieWarning} role="alert">
                  <Cookie className={styles.warningIcon} aria-hidden="true" size={20} />
                  <div className={styles.warningContent}>
                    <p>Necessary cookies are required for account creation and authentication</p>
                    <button 
                      onClick={handleCookieSettings}
                      className={styles.cookieSettingsButton}
                      type="button"
                    >
                      Update Cookie Settings
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className={styles.error} role="alert">
                  <AlertCircle aria-hidden="true" size={20} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSignUp} className={styles.form} noValidate>
                <div className={styles.inputGroup}>
                  <label htmlFor="name">Full name</label>
                  <div className={styles.inputWrapper}>
                    <User className={styles.inputIcon} aria-hidden="true" size={18} />
                    <input
                      className={`${styles.input} ${error ? styles.inputError : ''}`}
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      minLength={2}
                      disabled={!hasCookieConsent || isSubmitting}
                      aria-invalid={error ? 'true' : 'false'}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email address</label>
                  <input
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={!hasCookieConsent || isSubmitting}
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.passwordWrapper}>
                    <Lock className={styles.inputIcon} aria-hidden="true" size={18} />
                    <input
                      className={`${styles.input} ${error ? styles.inputError : ''}`}
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      required
                      minLength={8}
                      disabled={!hasCookieConsent || isSubmitting}
                      aria-invalid={error ? 'true' : 'false'}
                    />
                  </div>
                  <span className={styles.passwordHint}>
                    Must be at least 8 characters
                  </span>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      required
                      disabled={!hasCookieConsent || isSubmitting}
                    />
                    <span>
                      I accept the <Link href="/terms">Terms of Service</Link> and{' '}
                      <Link href="/privacy">Privacy Policy</Link>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting || !hasCookieConsent || !acceptedTerms}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className={styles.spinner} aria-hidden="true" size={20} />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create account</span>
                  )}
                </button>
              </form>

              <div className={styles.footer}>
                <p>
                  Already have an account?{' '}
                  <Link href="/auth/signin">Sign in</Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
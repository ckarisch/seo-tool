"use client";

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { Loader, Lock, Cookie, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { COOKIE_CONSENT_NAME, checkCookieConsent } from '@/util/cookieConsent';
import { useProtectedSession } from '@/hooks/useProtectedSession';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCookieConsent, setHasCookieConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();  
  const { data: session, status } = useProtectedSession();

  const callbackUrl = searchParams.get('callbackUrl') || '/app/domains';

  useEffect(() => {
    if (status === 'loading') return;
    // Rest of your code
  }, [status]);

  useEffect(() => {
    const checkConsent = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cookieConsent = localStorage.getItem(COOKIE_CONSENT_NAME);
      setHasCookieConsent(checkCookieConsent(cookieConsent));
      setIsLoading(false);
    };

    checkConsent();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentConsent = localStorage.getItem(COOKIE_CONSENT_NAME);
    const hasConsent = checkCookieConsent(currentConsent);

    if (!hasConsent) {
      setError('Cookie consent required. Please accept necessary cookies to sign in.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        if (result.error.includes('Cookie consent required')) {
          setError('Please accept necessary cookies to sign in');
        } else if (result.error.includes('Invalid cookie consent')) {
          setError('Please update your cookie settings');
        } else {
          setError('Invalid email or password');
        }
        return;
      }

      if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCookieSettings = () => {
    localStorage.removeItem(COOKIE_CONSENT_NAME);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <main>
        <Background backgroundImage="" backgroundStyle={'mainDark'}>
          <Section>
            <div className={styles.heroContainer}>
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.description}>
                Sign in to manage your domains
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
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.description}>
              Sign in to manage your domains
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
                    <p>Necessary cookies are required for authentication</p>
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

              <form onSubmit={handleSignIn} className={styles.form} noValidate>
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    aria-invalid={error ? 'true' : 'false'}
                    disabled={!hasCookieConsent || isSubmitting}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.passwordWrapper}>
                    <Lock className={styles.inputIcon} aria-hidden="true" size={18} />
                    <input
                      type="password"
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className={`${styles.input} ${error ? styles.inputError : ''}`}
                      aria-invalid={error ? 'true' : 'false'}
                      disabled={!hasCookieConsent || isSubmitting}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={!hasCookieConsent || isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className={styles.spinner} aria-hidden="true" size={20} />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>

              <div className={styles.footer}>
                <p>
                  Don&apos;t have an account?{' '}
                  <Link href="/auth/signup">Sign up</Link>
                </p>
                <p className={styles.terms}>
                  By signing in, you agree to our{' '}
                  <Link href="/privacy">Privacy Policy</Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
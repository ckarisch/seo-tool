// app/auth/signin/page.tsx
"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { Loader, Lock } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const callbackUrl = searchParams.get('callbackUrl') || '/app/domains';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
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
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={[error ? styles.inputError : null, styles.input].join(' ')}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.passwordWrapper}>
                    <Lock className={styles.inputIcon} size={18} />
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className={[error ? styles.inputError : null, styles.input].join(' ')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className={styles.spinner} size={20} />
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
              </div>
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
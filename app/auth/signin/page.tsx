// app/auth/signin/page.tsx
"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { Github, Mail, ArrowRight, Loader } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/app/domains';
  const error_param = searchParams.get('error');

  // Handle error messages from NextAuth
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'AccessDenied':
        return 'Access denied. Please try again.';
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your email and try again.';
      case 'EmailSignin':
        return 'Failed to send verification email. Please try again.';
      default:
        return null;
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('email', {
        email,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email. Please try again.');
      } else {
        setEmail('');
        // Show success message - verification email sent
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSignIn = async (provider: string) => {
    try {
      await signIn(provider, {
        callbackUrl,
      });
    } catch (error) {
      setError('Failed to connect with provider. Please try again.');
    }
  };

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.description}>
              Sign in to your account to continue
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.formContainer}>
          <Card>
            <div className={styles.cardContent}>
              {(error || getErrorMessage(error_param)) && (
                <div className={styles.error}>
                  {error || getErrorMessage(error_param)}
                </div>
              )}

              <div className={styles.providerButtons}>
                <button
                  onClick={() => handleProviderSignIn('github')}
                  className={styles.providerButton}
                >
                  <Github size={20} />
                  <span>Continue with GitHub</span>
                </button>

                <div className={styles.divider}>
                  <span>or</span>
                </div>

                <form onSubmit={handleEmailSignIn} className={styles.emailForm}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email">Email address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className={error ? styles.inputError : ''}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={20} className={styles.spinner} />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        <span>Continue with Email</span>
                        <ArrowRight size={16} className={styles.arrow} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className={styles.footer}>
                <p>
                  Don&apos;t have an account?{' '}
                  <Link href="/auth/signup">Sign up</Link>
                </p>
                <p className={styles.terms}>
                  By signing in, you agree to our{' '}
                  <Link href="/terms">Terms of Service</Link> and{' '}
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
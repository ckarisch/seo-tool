// app/auth/signup/page.tsx
"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { Github, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('email', {
        email,
        callbackUrl: plan ? `/onboarding?plan=${plan}` : '/onboarding',
        redirect: false,
      });

      if (result?.error) {
        setError('An error occurred. Please try again.');
      } else {
        // Show success state - verification email sent
        setEmail('');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSignIn = (provider: string) => {
    signIn(provider, {
      callbackUrl: plan ? `/onboarding?plan=${plan}` : '/onboarding',
    });
  };

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.description}>
              {plan ? 
                `Get started with your ${plan} plan today` : 
                'Start optimizing your website performance'}
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.formContainer}>
          <Card>
            <div className={styles.cardContent}>
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

                <form onSubmit={handleEmailSignUp} className={styles.emailForm}>
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
                    />
                  </div>

                  {error && (
                    <div className={styles.error}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    <Mail size={20} />
                    <span>{isSubmitting ? 'Sending...' : 'Continue with Email'}</span>
                    <ArrowRight size={16} className={styles.arrow} />
                  </button>
                </form>
              </div>

              <div className={styles.footer}>
                <p>
                  Already have an account?{' '}
                  <Link href="/auth/signin">Sign in</Link>
                </p>
                <p className={styles.terms}>
                  By signing up, you agree to our{' '}
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
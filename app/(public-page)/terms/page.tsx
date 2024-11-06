"use client";

import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import { Shield, Scale, Clock, Users, FileText, Mail } from 'lucide-react';
import AnimatedSecureMailto from '@/components/security/AnimatedSecureMailto';
import { companyEmail } from '@/config/config';

export default function TermsPage() {
  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Terms of Service</h1>
            <p className={[styles.description].join(' ')}>
              Please read these terms carefully before using our services
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.termsContainer}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <FileText className={styles.icon} />
              <h2>1. Agreement to Terms</h2>
            </div>
            <p className={styles.p}>
              By accessing or using the services provided by Form und Zeichen Development GmbH (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;),
              you agree to be bound by these Terms of Service. If you do not agree to these terms,
              please do not use our services.
            </p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Users className={styles.icon} />
              <h2>2. User Accounts</h2>
            </div>
            <div className={styles.subsection}>
              <h3>2.1 Account Creation</h3>
              <p className={styles.p}>
                To use our services, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>
            </div>
            <div className={styles.subsection}>
              <h3>2.2 Account Security</h3>
              <p className={styles.p}>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Scale className={styles.icon} />
              <h2>3. Service Usage</h2>
            </div>
            <div className={styles.subsection}>
              <h3>3.1 Acceptable Use</h3>
              <p className={styles.p}>
                You agree to use our services only for lawful purposes and in accordance with these Terms. You agree not to use our services:
              </p>
              <ul className={styles.ul}>
                <li>In any way that violates any applicable law or regulation</li>
                <li>To attempt to probe, scan, or test the vulnerability of our systems</li>
                <li>To transmit any malicious code or malware</li>
                <li>To interfere with or disrupt our services or servers</li>
              </ul>
            </div>
            <div className={styles.subsection}>
              <h3>3.2 Service Limitations</h3>
              <p className={styles.p}>
                We reserve the right to limit, suspend, or terminate your access to the services if we determine, in our sole discretion, that you have violated these Terms.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Shield className={styles.icon} />
              <h2>4. Privacy and Data Protection</h2>
            </div>
            <p className={styles.p}>
              Our collection and use of personal information in connection with the services is described in our
              Privacy Policy. By using our services, you consent to our data practices as described in our Privacy Policy.
            </p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Clock className={styles.icon} />
              <h2>5. Subscription and Payment</h2>
            </div>
            <div className={styles.subsection}>
              <h3>5.1 Fees</h3>
              <p className={styles.p}>
                You agree to pay all fees associated with your chosen subscription plan. All fees are in euros and are non-refundable except as required by law.
              </p>
            </div>
            <div className={styles.subsection}>
              <h3>5.2 Cancellation</h3>
              <p className={styles.p}>
                You may cancel your subscription at any time. Upon cancellation, you will continue to have access to the services through the end of your current billing period.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Mail className={styles.icon} />
              <h2>6. Contact Information</h2>
            </div>
            <p className={styles.p}>
              For any questions about these Terms, please contact us at:
            </p>
            <div className={styles.contactInfo}>
              <p className={styles.p}>Form und Zeichen Development GmbH</p>
              <div className={styles.contactItem}>
                <AnimatedSecureMailto
                  email={companyEmail}
                  subject="Privacy Policy Inquiry"
                  variant="highlight"
                  showIcon={true}
                  className={styles.emailLink}
                  description="Contact email for privacy related inquiries"
                  inline
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.lastUpdated}>
              Last updated: November 6, 2024
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
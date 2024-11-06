// app/privacy/page.tsx
"use client";

import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import { Shield, Database, Mail, Phone, Building, Lock, Globe, Server } from 'lucide-react';
import AnimatedSecureMailto from '@/components/security/AnimatedSecureMailto';
import SecurePhoneReveal from '@/components/security/SecurePhoneReveal';
import { companyEmail, privacyEmail } from '@/config/config';

export default function PrivacyPage() {
  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.description}>
              Information about how we handle your personal data
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.privacyContainer}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Building className={styles.icon} />
              <h2>1. Data Controller</h2>
            </div>
            <p>Responsible for data processing according to GDPR:</p>
            <div className={styles.contactInfo}>
              <p className={styles.companyName}>Form und Zeichen Development GmbH</p>
              <div className={styles.contactGrid}>
                <div className={styles.contactItem}>
                  <Building className={styles.contactIcon} />
                  <span>Villefortgasse 11 <br />8010 Graz <br />Austria</span>
                </div>
                <div className={styles.contactItem}>
                  <Mail className={styles.contactIcon} />
                  <div className={styles.contactItem}>
                    <AnimatedSecureMailto
                      email={companyEmail}
                      subject="Privacy Policy Inquiry"
                      variant="highlight"
                      showIcon={false}
                      className={styles.emailLink}
                      description="Contact email for privacy related inquiries"
                      inline
                    />
                  </div>
                </div>
                <div className={styles.contactItem}>
                  <Phone className={styles.contactIcon} />
                  <SecurePhoneReveal phoneNumber={'+43 681 8111 9035'} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Shield className={styles.icon} />
              <h2>2. Data Protection Principles</h2>
            </div>
            <p>We process your personal data in accordance with:</p>
            <ul>
              <li>EU General Data Protection Regulation (GDPR)</li>
              <li>Austrian Data Protection Act (DSG)</li>
              <li>Other applicable data protection regulations</li>
            </ul>
            <p>Your personal data will only be collected and used when legally permitted or with your consent.</p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Database className={styles.icon} />
              <h2>3. Data Collection and Processing</h2>
            </div>
            <div className={styles.subsection}>
              <h3>3.1 Account Data</h3>
              <p>When you create an account or sign in, we collect:</p>
              <ul>
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Name (optional)</li>
              </ul>
            </div>

            <div className={styles.subsection}>
              <h3>3.2 Domain Monitoring Data</h3>
              <p>For providing our service, we process:</p>
              <ul>
                <li>Domain names and related information</li>
                <li>Website performance metrics</li>
                <li>SEO-related data</li>
              </ul>
            </div>

            <div className={styles.subsection}>
              <h3>3.3 Technical Data</h3>
              <p>We automatically collect:</p>
              <ul>
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Access times</li>
              </ul>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Lock className={styles.icon} />
              <h2>4. Cookies</h2>
            </div>
            <div className={styles.subsection}>
              <h3>4.1 Essential Cookies</h3>
              <p>We use essential cookies for:</p>
              <ul>
                <li>Authentication session management</li>
                <li>Security features</li>
                <li>Basic website functionality</li>
              </ul>
            </div>

            <div className={styles.subsection}>
              <h3>4.2 Optional Cookies</h3>
              <p>With your consent, we may use additional cookies for:</p>
              <ul>
                <li>Analytics and performance monitoring</li>
                <li>User preference storage</li>
                <li>Feature enhancement</li>
              </ul>
              <p>You can manage your cookie preferences at any time through our cookie settings.</p>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Server className={styles.icon} />
              <h2>5. Data Storage and Security</h2>
            </div>
            <p>Your data is stored on servers located in the EU:</p>
            <div className={styles.storageInfo}>
              <div className={styles.storageItem}>
                <h4>User Data & Application</h4>
                <p>MongoDB Cloud (EU Region)</p>
              </div>
              <div className={styles.storageItem}>
                <h4>File Storage</h4>
                <p>IONOS Germany</p>
              </div>
              <div className={styles.storageItem}>
                <h4>Application Hosting</h4>
                <p>Vercel (EU Region)</p>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Shield className={styles.icon} />
              <h2>6. Your Rights</h2>
            </div>
            <p>Under the GDPR, you have the following rights:</p>
            <ul>
              <li>Right to access your personal data</li>
              <li>Right to rectification of incorrect data</li>
              <li>Right to erasure (&apos;right to be forgotten&apos;)</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
            </ul>
            <p>To exercise these rights, please contact our data protection team:</p>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Mail className={styles.contactIcon} />
                <div className={styles.contactItem}>
                  <AnimatedSecureMailto
                    email={privacyEmail}
                    subject="Privacy Rights Request"
                    variant="highlight"
                    showIcon={false}
                    className={styles.emailLink}
                    description="Contact email for privacy rights requests"
                    inline
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Globe className={styles.icon} />
              <h2>7. Updates to this Policy</h2>
            </div>
            <p>We may update this privacy policy occasionally. All changes will be posted on this page with a revised effective date.</p>
            <div className={styles.lastUpdated}>
              Last updated: November 6, 2024
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
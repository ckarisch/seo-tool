import React from 'react';
import styles from './ImprintPage.module.scss';
import SecureMailto from '../security/SecureMailto';
import AnimatedSecurePhone from '../security/AnimatedSecurePhone';
import SecurePhoneReveal from '../security/SecurePhoneReveal';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import Card from "@/components/layout/card";
import { AnimatedSecureMailto } from '../security/AnimatedSecureMailto';

interface ContactItemProps {
  title: string;
  children: React.ReactNode;
}

interface CompanyInfo {
  name: string;
  registration: string;
  vatId: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  legal?: {
    director: string;
    email: string;
  }[];
  regulatory: {
    name: string;
  };
  court: {
    name: string,
  };
  lastUpdated: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "FZ Form und Zeichen Development GmbH",
  registration: "570135 i",
  vatId: "ATU77598146",
  address: {
    street: "Villefortgasse 11",
    city: "8010 Graz",
    country: "Austria"
  },
  contact: {
    phone: "+43 681 8111 9035",
    email: "seo-tool@formundzeichen.at"
  },
  // legal: [{
  //   director: "Roman Pendl, MA",
  //   email: "roman@formundzeichen.at",
  // }, {
  //   director: "Bernhard Karisch, MA",
  //   email: "bernhard@formundzeichen.at"
  // }],
  regulatory: {
    name: "Bezirkshauptmannschaft Graz"
  },
  court: {
    name: "Landesgericht Graz",
  },
  lastUpdated: "October 2024"
};

const ContactItem = ({ title, children }: ContactItemProps) => (
  <div className={styles.contactItem}>
    <div className={styles.contactTitle}>{title}</div>
    <div className={styles.contactContent}>{children}</div>
  </div>
);

export default function ImprintPage({
  companyInfo = defaultCompanyInfo
}: {
  companyInfo?: CompanyInfo
}) {
  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Imprint</h1>
            <p className={styles.description}>
              Legal information and company details
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.content}>
          <Card>
            <div className={styles.contentInner}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Company Information</h2>
                <div className={styles.grid}>
                  <ContactItem title="Company Name">
                    {companyInfo.name}
                  </ContactItem>
                  <ContactItem title="Registration">
                    {companyInfo.registration}
                  </ContactItem>
                  <ContactItem title="VAT Number">
                    {companyInfo.vatId}
                  </ContactItem>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Contact Details</h2>
                <div className={styles.grid}>
                  <ContactItem title="Address">
                    {companyInfo.address.street}<br />
                    {companyInfo.address.city}<br />
                    {companyInfo.address.country}
                  </ContactItem>
                  <ContactItem title="Contact">
                    Phone: <SecurePhoneReveal phoneNumber={companyInfo.contact.phone} /><br />
                    Email: <AnimatedSecureMailto email={companyInfo.contact.email}>
                      Contact us
                    </AnimatedSecureMailto>
                  </ContactItem>
                </div>
              </div>

              {companyInfo.legal && companyInfo.legal.length > 0 && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Legal Representatives</h2>
                    <div className={styles.grid}>
                      {companyInfo.legal.map((entry, index) => (
                        <React.Fragment key={index}>
                          <ContactItem title="Managing Director">
                            {entry.director}
                          </ContactItem>
                          <ContactItem title="Email">
                            <AnimatedSecureMailto email={entry.email}>
                              Send email
                            </AnimatedSecureMailto>
                          </ContactItem>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className={styles.divider} />

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Regulatory Information</h2>
                <div className={styles.grid}>
                  <ContactItem title="Supervisory Authority">
                    {companyInfo.regulatory.name}
                  </ContactItem>
                  <ContactItem title="Responsible Court">
                    {companyInfo.court.name}
                  </ContactItem>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              Last updated: {companyInfo.lastUpdated}
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
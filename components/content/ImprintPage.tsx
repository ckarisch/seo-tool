// ImprintPage.tsx
import React from 'react';
import styles from './ImprintPage.module.scss';
import SecureMailto from '../security/SecureMailto';
import AnimatedSecureMailto from '../security/AnimatedSecureMailto';

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
  legal: {
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
    phone: "+43 660 91 81 660",
    email: "seo-tool@formundzeichen.at"
  },
  legal: [{
    director: "Roman Pendl, MA",
    email: "roman@formundzeichen.at",
  }, {
    director: "Bernhard Karisch, MA",
    email: "bernhard@formundzeichen.at"
  }],
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
    <h3 className={styles.contactTitle}>{title}</h3>
    <div className={styles.contactContent}>{children}</div>
  </div>
);

export default function ImprintPage({
  companyInfo = defaultCompanyInfo
}: {
  companyInfo?: CompanyInfo
}) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1>Imprint</h1>
        </header>

        <section className={styles.section}>
          <h2>Company Information</h2>
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
        </section>

        <section className={styles.section}>
          <h2>Contact Details</h2>
          <div className={styles.grid}>
            <ContactItem title="Address">
              {companyInfo.address.street}<br />
              {companyInfo.address.city}<br />
              {companyInfo.address.country}
            </ContactItem>
            <ContactItem title="Contact">
              Phone: {companyInfo.contact.phone}<br />
              Email: <AnimatedSecureMailto email={companyInfo.contact.email} />
            </ContactItem>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Legal Representatives</h2>
          <div className={styles.grid}>
            {companyInfo.legal.map(entry => (
              <><ContactItem title="Managing Director">
                {entry.director}
              </ContactItem>
                <ContactItem title="Email">
                  <AnimatedSecureMailto email={entry.email} />
                </ContactItem>
              </>
            ))}

          </div>
        </section>

        <section className={styles.section}>
          <h2>Regulatory Authority</h2>
          <ContactItem title="Responsible supervisory authority">
            {companyInfo.regulatory.name}
          </ContactItem>
        </section>

        <section className={styles.section}>
          <h2>Court</h2>
          <ContactItem title="Responsible court">
            {companyInfo.court.name}
          </ContactItem>
        </section>

        <footer className={styles.footer}>
          <p>Last updated: {companyInfo.lastUpdated}</p>
        </footer>
      </div>
    </div>
  );
}
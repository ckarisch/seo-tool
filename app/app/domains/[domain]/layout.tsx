import type { Metadata } from "next";
import DomainNavigation from "./DomainNavigation";
import styles from "./layout.module.scss";
import Section from "@/components/layout/section";
import NotificationList from "@/components/domain/notificationList";

export const metadata: Metadata = {
  title: "SEO App",
  description: "The best app for SEO analysis.",
  robots: "noindex, nofollow"
};

interface LayoutProps {
  children: React.ReactNode;
  params: { domain: string };
}

export default function RootLayout({ children, params }: LayoutProps) {
  return (
    <div>
      <div className={styles.domainheader}>
        <Section>
          <div className={styles.domainheaderContent}>
            <div className={styles.domain}>
              <h1 className={styles.domainName}>{params.domain}</h1>
            </div>
            <div className={styles.actions}>
              <NotificationList domainName={params.domain} />
              <DomainNavigation domain={params.domain} />
            </div>
          </div>
        </Section>
      </div>

      <main className={styles.main}>
        <Section>
          {children}
        </Section>
      </main>
    </div>
  );
}
import type { Metadata } from "next";
import styles from './page.module.scss';
import Background from "@/components/layout/background";
import Section from "@/components/layout/section";

export const metadata: Metadata = {
  title: "SEO App",
  description: "The best app for SEO analysis.",
  robots: "noindex, nofollow"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>
              Available SEO Checks
            </h1>
            <p className={styles.description}>
              Comprehensive analysis tools to improve your website&apos;s SEO performance and identify potential issues.
            </p>
          </div>
        </Section>
      </Background>
      {children}
    </>
  );
}
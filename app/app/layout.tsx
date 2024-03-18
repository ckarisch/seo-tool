import type { Metadata } from "next";
import Link from "next/link";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "SEO App",
  description: "The best app for SEO analysis.",
  robots: "noindex, nofollow" // app path should not be indexed
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className={styles.menu}>
        <div className={styles.menuItem}>
          <Link href="/app/domains">
            Domains
          </Link>
        </div>
      </div>
      <div>
        {children}
      </div>

    </ div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import layout from "./layout.module.scss";
import Section from "@/components/layout/section";

export const metadata: Metadata = {
  title: "SEO App",
  description: "The best app for SEO analysis.",
  robots: "noindex, nofollow" // app path should not be indexed
};

export default function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { domain: string };
}>) {
  return (
    <div>
      <Section id={layout.domainheader} className={layout.domainheader}>

        <div className={layout.domain}>
          <div className={layout.domainData}>
            {params.domain}
          </div>
        </div>
        <nav id={layout.domainnav}>
          <ul className={layout.domainheaderList}>
            <li className={layout.domainheaderLi}>
              <Link href={'/app/domains/' + params.domain} className={layout.domainheaderLink}>
                Übersicht
              </Link>
            </li>
            <li className={layout.domainheaderLi}>
              <Link href={'/app/domains/' + params.domain + '/crawls'} className={layout.domainheaderLink}>
                Crawls
              </Link>
            </li>
            <li className={layout.domainheaderLi}>
              <Link href={'/app/domains/' + params.domain + '/settings'} className={layout.domainheaderLink}>
                Einstellungen
              </Link>
            </li>
          </ul>
        </nav>
      </Section>

      <div className={layout.main}>
        {children}
      </div>
    </ div>
  );
}

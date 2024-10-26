import type { Metadata } from "next";
import Link from "next/link";
import layout from "./layout.module.scss";
import Section from "@/components/layout/section";

export const metadata: Metadata = {
  title: "SEO App",
  description: "The best app for SEO analysis.",
  robots: "noindex, nofollow"
};

// Let's use the URL path to determine the active state
const getActiveState = (currentPath: string, linkPath: string) => {
  return currentPath === linkPath;
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { domain: string };
}>) {
  // Using server-side pathname comparison
  const basePath = `/app/domains/${params.domain}`;
  const pathMap = {
    overview: basePath,
    crawls: `${basePath}/crawls`,
    settings: `${basePath}/settings`
  };

  return (
    <div>
      <div className={layout.domainheader}>
        <Section>
          <div className={layout.domainheaderContent}>
            <div className={layout.domain}>
              <h1 className={layout.domainName}>{params.domain}</h1>
            </div>
            
            <nav className={layout.domainnav}>
              <ul className={layout.domainheaderList}>
                <li className={layout.domainheaderLi}>
                  <Link 
                    href={pathMap.overview}
                    className={layout.domainheaderLink}
                  >
                    Overview
                  </Link>
                </li>
                <li className={layout.domainheaderLi}>
                  <Link 
                    href={pathMap.crawls}
                    className={layout.domainheaderLink}
                  >
                    Crawls
                  </Link>
                </li>
                <li className={layout.domainheaderLi}>
                  <Link 
                    href={pathMap.settings}
                    className={layout.domainheaderLink}
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </Section>
      </div>

      <main className={layout.main}>
        <Section>
          {children}
        </Section>
      </main>
    </div>
  );
}
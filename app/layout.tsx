import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import layout from "./layout.module.scss";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import Section from "@/components/layout/section";
import Link from "next/link";
import { LogoIcon } from "@/icons/logoIcon";
import { isPreviewEnv } from "@/util/environment";
import { CookieConsent } from '@/components/cookie/CookieConsent';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-inter',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-bricolage',
})

export const metadata: Metadata = {
  title: "Rankidang",
  description: "analyze your website performance",
  robots: "noindex, nofollow"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions)
  const isPreview = isPreviewEnv()

  return (
    <html lang="en">
      <body className={[inter.className, bricolage.variable, inter.variable, layout.body].join(' ')}>
        <Providers session={session}>
          <CookieConsent />
          {children}
        </Providers>
        <div id={layout.globalfooter} className={layout.globalfooter}>
          <Section>
            <nav id={layout.globalnav} aria-label="Footer navigation">
              <ul className={layout.globalfooterList}>
                <li className={layout.globalfooterLi}>
                  <Link href={'https://formundzeichen.at'} className={[layout.globalfooterLink, layout.logoLink].join(' ')}>
                    <LogoIcon /> Made by Form und Zeichen
                  </Link>
                </li>
                <li className={layout.globalfooterLi}>
                  <Link href={'/privacy'} className={layout.globalfooterLink}>
                    Data Privacy
                  </Link>
                </li>
                <li className={layout.globalfooterLi}>
                  <Link href={'/terms'} className={layout.globalfooterLink}>
                    Terms of Service
                  </Link>
                </li>
                {isPreview && (
                  <>
                    <li className={layout.globalfooterLi}>
                      <Link href={'/accessibility'} className={layout.globalfooterLink}>
                        Accessibility
                      </Link>
                    </li>
                  </>
                ) && (
                    <>
                      <li className={layout.globalfooterLi}>
                        <Link href={'/dev/error-types'} className={layout.globalfooterLink}>
                          DEV: error-types
                        </Link>
                      </li>
                    </>
                  )}
                <li className={layout.globalfooterLi}>
                  <Link href={'/imprint'} className={layout.globalfooterLink}>
                    Imprint
                  </Link>
                </li>
              </ul>
            </nav>
          </Section>
        </div>
      </body>
    </html>
  );
}
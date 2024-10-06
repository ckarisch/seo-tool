import type { Metadata } from "next";
import Signin from "@/components/user/signin";
import layout from "./layout.module.scss";
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/layout/section";

export const metadata: Metadata = {
  title: "SEO Tool",
  description: "all in one SEO tool",
  robots: "noindex, nofollow"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <div className={layout.layout}>
      <div id={layout.globalheader} className={layout.globalheader}>
        <nav id={layout.globalnav}>
          <ul className={layout.globalheaderList}>
            <li className={layout.globalheaderLi}>
              <Link href={'/'} className={[layout.globalheaderLink, layout.logoLink].join(' ')}>
                <Image className={layout.logo} src={'/next.svg'} alt="logo" width={150} height={30.5}></Image>
              </Link>
            </li>
            <li className={layout.globalheaderLi}>
              <Link href={'/app'} className={layout.globalheaderLink}>
                SEO App
              </Link>
            </li>
            <li className={[layout.globalheaderLi, layout.desktop].join(' ')}>
              <Link href={'/'} className={layout.globalheaderLink}>
                Produkte
              </Link>
            </li>
            <li className={[layout.globalheaderLi, layout.desktop].join(' ')}>
              <Link href={'/'} className={layout.globalheaderLink}>
                Tools
              </Link>
            </li>
            <li className={[layout.globalheaderLi, layout.desktop].join(' ')}>
              <Link href={'/'} className={layout.globalheaderLink}>
                Preise
              </Link>
            </li>
            <li className={layout.globalheaderLi}>
              <Signin />
            </li>
          </ul>
        </nav>
      </div>
      {children}
    </div>
  );
}

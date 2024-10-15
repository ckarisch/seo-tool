import type { Metadata } from "next";
import Link from "next/link";
import layout from "./layout.module.scss";
import Image from "next/image";
import Signin from "@/components/user/signin";

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
      <div id={layout.globalheader} className={layout.globalheader}>
        <nav id={layout.globalnav}>
          <ul className={layout.globalheaderList}>
            <li className={layout.globalheaderLi}>
              <Link href={'/'} className={[layout.globalheaderLink, layout.logoLink].join(' ')}>
                <Image className={layout.logo} src={'/logo.svg'} alt="logo" width={150} height={30.5}></Image>
              </Link>
            </li>
            <li className={layout.globalheaderLi}>
              <Link href={'/app/domains'} className={layout.globalheaderLink}>
                Domains
              </Link>
            </li>
            <li className={layout.globalheaderLi}>
              <Signin />
            </li>
          </ul>
        </nav>
      </div>

      <div className={layout.main}>
        {children}
      </div>
    </ div>
  );
}

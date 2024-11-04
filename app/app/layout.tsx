import type { Metadata } from "next";
import layout from "./layout.module.scss";
import MainNav from "./MainNav";

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
      <div id={layout.globalheader} className={layout.globalheader}>
        <MainNav />
      </div>

      <main className={layout.main}>
        {children}
      </main>
    </>
  );
}
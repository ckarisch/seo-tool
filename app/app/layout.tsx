import type { Metadata } from "next";
import layout from "./layout.module.scss";
import AppHeader from "../../components/layout/Header/AppHeader";

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
      <AppHeader />
      <main className={layout.main}>
        {children}
      </main>
    </>
  );
}